import re
from typing import Dict, List, Optional, Tuple

from app.config import MIN_HIT_COVERAGE, MIN_HIT_SCORE, TOP_K_DEFAULT
from app.models.embedding import content_terms
from app.models.knowledge_base import kb_for
from app.utils.intent import (
    LISTABLE_TOPICS,
    classify_topics,
    is_catalog_query,
    topic_token_set,
)

_CHUNK = dict
_SCORED = Tuple[_CHUNK, float]

_CONTACT_KEYWORDS = re.compile(
    r"(?i)\b(contact|contacts|email|e-mail|e mail|phone|phones|number|numbers|"
    r"tel|telephone|hotline|line|whatsapp|cell|mobile|reach|reach us|get in touch|"
    r"talk to|address|location|located|where (are|is) you|how do i (reach|contact)|"
    r"call us|phone us|sms|dial|get a hold|footer|foot\b)\b"
)
_CONTACT_SETTING_RE = re.compile(
    r"(?i)(e?mail|phone|mobile|tel\b|telephone|whatsapp|address|contact)"
)
_CONTACT_HINTS = ("gabula road", "footer_email", "footer_phone", "footer_address")


def _coverage(terms: set, text: str) -> float:
    """Fraction of the question's content words that the record mentions."""
    if not terms:
        return 0.0
    return len(terms & content_terms(text)) / len(terms)


def _is_contact_query(query: str) -> bool:
    return bool(_CONTACT_KEYWORDS.search(query))


def _is_contact_chunk(chunk: _CHUNK) -> bool:
    meta = chunk.get("metadata", {}) or {}
    if meta.get("collection") != "site_settings":
        return False
    # Match the setting key itself. Sniffing the rendered text used to look for
    # "footer_email", but the label is humanised to "Footer email", so the
    # lookup silently stopped finding the rows it was written for.
    entity_id = str(meta.get("entity_id") or "")
    if entity_id and _CONTACT_SETTING_RE.search(entity_id):
        return True
    text = (chunk.get("text") or "").lower()
    return any(hint in text for hint in _CONTACT_HINTS)


def _contact_chunks(kb) -> List[_CHUNK]:
    return [c for c in kb.chunks if _is_contact_chunk(c)]


# A tenant's real catalogue lives in ``programs``; ``courses`` is the generic
# demo collection and is only a fallback. Each record is titled by its degree,
# so a "what courses do you offer" question never shares enough wording to rank
# them -- they have to be returned wholesale instead of by similarity.
_CATALOG_COLLECTIONS = ("programs", "courses")

# List-intents ("what's the latest news?") present an entire collection the
# same way the catalogue does: there is nothing more specific in the question to
# rank against, so every record in the collection is returned and the generator
# lists them. A story request should surface both student stories and alumni.
_LIST_COLLECTIONS = {
    "news": (("news",), False),
    "events": (("events",), False),
    "stories": (("student_stories", "alumni"), True),
}


def _list_chunks_for(kb, list_topic: str) -> List[_CHUNK]:
    collections, merge = _LIST_COLLECTIONS[list_topic]
    return _collection_chunks(kb, collections, merge=merge)


def _collection_chunks(kb, collections: tuple, merge: bool = False) -> List[_CHUNK]:
    by_collection = {}
    for chunk in kb.chunks:
        meta = chunk.get("metadata", {}) or {}
        collection = meta.get("collection")
        if collection in collections:
            by_collection.setdefault(collection, []).append(chunk)

    # ``merge`` glues every listed collection together (student stories AND
    # alumni); otherwise the first non-empty collection wins, like the catalogue.
    if merge:
        selected = []
        for collection in collections:
            selected.extend(by_collection.get(collection, []))
    else:
        selected = []
        for collection in collections:
            records = by_collection.get(collection)
            if records:
                selected = records
                break

    # De-dupe by title so the same record is not listed twice.
    seen = set()
    deduped: List[_CHUNK] = []
    for chunk in selected:
        meta = chunk.get("metadata", {}) or {}
        key = (meta.get("title") or chunk.get("id") or "").strip().lower()
        if key and key in seen:
            continue
        seen.add(key)
        deduped.append(chunk)
    return deduped


def _catalog_chunks(kb) -> List[_CHUNK]:
    return _collection_chunks(kb, _CATALOG_COLLECTIONS)


# A "what is the medicine course about?" question shares almost no wording with
# the medicine record ("Bachelor of Medicine and Bachelor of Surgery. Code:
# MBCHB. Duration: 5 years."). Like the catalogue and the list-intents, the
# record is found by recognising the entity it names, not by vector overlap.
_PROGRAM_ALIASES = (
    (("medicine", "medical", "surgery", "surgeon", "mbchb"), "mbchb"),
    (("engineering", "mechanical", "engineer", "beng"), "beng-me"),
    (("computer", "computing", "bsc", "software"), "bsc-cs"),
    (("data", "msc", "analytics"), "msc-ds"),
    (("education", "teaching", "teacher", "ba-edu", "baedu"), "ba-edu"),
    (("business", "administration", "bba", "commerce"), "bba"),
)

# A topical fact question (fees, scholarships, deadlines...) is answered from
# the factual collections. Stories and press pieces are marketing: "what does
# it cost?" is not answered by the story that happens to say "low-cost".
_SCOPED_EXCLUDE_COLLECTIONS = frozenset(
    {"news", "events", "student_stories", "alumni"}
)


_PROGRAM_CODE_RE = re.compile(r"\bcode[:\s-]*([a-z0-9]+)", re.IGNORECASE)


def _code_of(chunk: _CHUNK) -> str:
    meta = chunk.get("metadata", {}) or {}
    raw = str(meta.get("code") or "")
    if not raw:
        m = _PROGRAM_CODE_RE.search(chunk.get("text") or "")
        raw = m.group(1) if m else ""
    return raw.lower().replace("-", "")


def _resolve_program_chunks(kb, query: str) -> List[_CHUNK]:
    query_tokens = content_terms(query)
    course_chunks = [
        chunk
        for chunk in kb.chunks
        if (chunk.get("metadata", {}) or {}).get("collection")
        in _CATALOG_COLLECTIONS
    ]
    for aliases, code in _PROGRAM_ALIASES:
        if not (query_tokens & set(aliases)):
            continue
        target = code.replace("-", "")
        matches = []
        for chunk in course_chunks:
            if _code_of(chunk).startswith(target):
                matches.append(chunk)
                continue
            title = ((chunk.get("metadata", {}) or {}).get("title") or "")
            if content_terms(title) & set(aliases):
                matches.append(chunk)
        if matches:
            return matches
    return []


def retrieve(
    query: str, top_k: int = TOP_K_DEFAULT, tenant: Optional[str] = None
) -> List[_SCORED]:
    kb = kb_for(tenant)

    if is_catalog_query(query):
        catalog = _catalog_chunks(kb)
        if catalog:
            return [(chunk, 1.0) for chunk in catalog]

    topics = classify_topics(query)
    primary = topics["primary"]
    secondary = set(topics["secondary"])

    # A question that names nothing more specific than the collection itself
    # (news, events, stories) is answered by listing the whole collection, the
    # same way the catalogue is listed.
    if primary in LISTABLE_TOPICS and not secondary:
        listed = _list_chunks_for(kb, primary)
        if listed:
            return [(chunk, 1.0) for chunk in listed]

    # A question that names a programme ("what is the medicine course about?",
    # "how long is the engineering degree?") is answered by that programme's
    # record. "Do you offer a degree in computer science?" is adjunctive to a
    # topical question and is merged in below instead.
    program_chunks = []
    if primary == "program_detail" or "program_detail" in secondary:
        program_chunks = _resolve_program_chunks(kb, query)
        if primary == "program_detail" and program_chunks:
            return [(chunk, 1.0) for chunk in program_chunks]

    # Over-fetch so a topic-scoped filter has room to work without losing the
    # best neighbour.
    expanded_top_k = max(top_k, TOP_K_DEFAULT)
    hits = kb.query(query, expanded_top_k * 3)
    if not hits:
        return []

    # Topic-scoped search: when the question is about fees (or scholarships,
    # requirements, deadlines, applications, campus life), a neighbour that does
    # not so much as mention the topic is not a candidate -- this is what stops
    # "what does it cost" from being answered with a story about a low-cost
    # water purifier. The topic's own vocabulary is also queried directly so a
    # question whose words never include "scholarship" ("financial aid for
    # female students?") still reaches the scholarship records it shares no
    # wording with.
    scoped_topic = (
        primary
        if primary
        in {"fees", "scholarships", "requirements", "deadline", "apply", "campus"}
        else None
    )
    if scoped_topic:
        topic_tokens = topic_token_set(scoped_topic)
        if topic_tokens:
            seen = {id(h[0]) for h in hits}
            for extra in kb.query(" ".join(sorted(topic_tokens)), expanded_top_k):
                if id(extra[0]) not in seen:
                    seen.add(id(extra[0]))
                    hits.append(extra)
        hits = [
            hit
            for hit in hits
            if content_terms(hit[0].get("text", "")) & topic_tokens
            and (hit[0].get("metadata", {}) or {}).get("collection")
            not in _SCOPED_EXCLUDE_COLLECTIONS
        ]
        if not hits:
            return []

    terms = content_terms(query)

    best = hits[0][1]
    if scoped_topic:
        # Topic-scoped candidates all cleared the topic gate (and the marketing
        # collections are gone), so the query's similarity score--which a chunk
        # like "financial aid for female students?" never shared words with--no
        # longer decides the order. Overlap on the question's non-topic
        # attribute words ("female", "computer science") is what makes one
        # record a better answer than another, and no absolute floor is applied
        # because the gate already did the filtering.
        extra_terms = terms - set(topic_tokens)
        hits.sort(
            key=lambda hit: (
                len(content_terms(hit[0].get("text", "")) & extra_terms),
                hit[1],
            ),
            reverse=True,
        )
        # The generator drops anything below its score floor as noise, but
        # these candidates were already vetted by the topic gate -- a chunk can
        # be the right answer yet score low because the question never shares
        # its wording ("financial aid for female students?" vs. "STEM Women
        # Scholarship"). Holding every gated candidate at the floor keeps the
        # vetted answer from being discarded as noise.
        hits = [(chunk, max(score, MIN_HIT_SCORE)) for chunk, score in hits]
        floor = 0.0
        min_coverage = 0.0
    else:
        # A neighbour has to clear an absolute floor, stay within reach of the
        # best hit, and actually mention what was asked. The last test is what
        # stops a record about something else being quoted as if it answered
        # the question; returning nothing at all is better, because the
        # generator turns an empty result into an honest "not in our
        # information yet" reply.
        #
        # A question that betrays no topic at all (e.g. "how do I get a
        # visa?") must be much harder to answer: it shares no vocabulary intent
        # with any collection, and half-a-word of overlap is how an
        # out-of-scope question ended up quoting a student story. Those queries
        # have to match nearly all of their own words to be trusted.
        floor = max(MIN_HIT_SCORE, best * 0.5)
        if primary == "question":
            min_coverage = max(MIN_HIT_COVERAGE, 0.67)
        else:
            min_coverage = MIN_HIT_COVERAGE
    ranked = [
        hit
        for hit in hits
        if hit[1] >= floor and _coverage(terms, hit[0].get("text", "")) >= min_coverage
    ]
    rank_ids = {id(h[0]) for h in ranked}

    if _is_contact_query(query):
        promoted = [
            c
            for c in _contact_chunks(kb)
            if c.get("id") not in {h[0].get("id") for h in ranked}
        ]
        if promoted:
            ranked = [(c, 1.0) for c in promoted] + ranked
            ranked = ranked[:max(top_k, TOP_K_DEFAULT)]

    # "How much is the fee for the computer science programme?" is a fees
    # question, but the programme record itself belongs in the reply alongside
    # the fee FAQ.
    if program_chunks and primary != "program_detail":
        ahead = [(c, 1.0) for c in program_chunks if id(c) not in rank_ids]
        ranked = ahead + ranked
        ranked = ranked[:top_k]

    return ranked[:top_k]
