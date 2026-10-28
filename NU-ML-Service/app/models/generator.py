import re

from typing import Optional

from app.config import (
    ANSWER_CHUNK_LIMIT,
    ANSWER_MAX_SOURCES,
    MIN_HIT_SCORE,
    SITE_LINK_BASE,
    SOURCE_PATHS,
)
from app.models.embedding import content_terms
from app.services import settings as site_settings
from app.services.contact import get_contact_details
from app.utils.intent import (
    LISTABLE_TOPICS,
    classify_topics,
    is_catalog_query,
)

_GREETING_RE = re.compile(
    r"^(hi|hiya|hello|hey|heya|howdy|yo|greetings|"
    r"good\s*(morning|afternoon|evening|day))([\s,!.?]+there)?[\s!?.]*$",
    re.IGNORECASE,
)
# A greeting followed by a real question ("hello, what's your name?") must be
# classified by the question, not the greeting. Stripping a leading interjection
# lets the identity/capability patterns see the actual request.
_LEAD_GREETING_RE = re.compile(
    r"^(?:hi|hiya|hello|hey|heya|howdy|yo|greetings|"
    r"good\s*(?:morning|afternoon|evening|day))"
    r"(?:[\s,!.?-]+there)?[\s,!.?-]+",
    re.IGNORECASE,
)
_THANKS_RE = re.compile(r"^(thanks|thank\s+you|thx|ty)[\s!?.]*$", re.IGNORECASE)
_FAREWELL_RE = re.compile(r"^(bye|goodbye|see\s+ya|see\s+you)[\s!?.]*$", re.IGNORECASE)
_WELLBEING_RE = re.compile(
    r"^how\s+(are|r)\s+(you|u|things)(\s+(doing|today|these\s+days))?[\s!?.]*$"
    r"|^how('s| is)?\s*it\s+going[\s!?.]*$"
    r"|^how\s+do\s+you\s+do[\s!?.]*$",
    re.IGNORECASE,
)
_IDENTITY_RE = re.compile(
    r"^(who|what)\s+are\s+you[\s!?.]*$"
    r"|^what(?:'s|\s+is|s)?\s+your\s+name[\s!?.]*$"
    r"|^what\s+is\s+this[\s!?.]*$"
    r"|^who\s+am\s+i\s+(talking|speaking)\s+to[\s!?.]*$"
    r"|^are\s+you\s+(a\s+)?(bot|robot|human|real|ai)[\s!?.]*$",
    re.IGNORECASE,
)
_CAPABILITY_RE = re.compile(
    r"^what\s+can\s+you\s+(do|help\s+(me\s+)?with|answer)[\s!?.]*$"
    r"|^what\s+do\s+you\s+do[\s!?.]*$"
    r"|^what\s+can\s+i\s+(ask|say)[\s!?.]*$"
    r"|^help[\s!?.]*$",
    re.IGNORECASE,
)
# "Who can I contact?" must be answered from the organisation's own details,
# not from a corpus hit that happens to mention the word "contact".
_CONTACT_RE = re.compile(
    r"\b(contact|contacting|contacted|phone|telephone|hotline|whatsapp|"
    r"e-?mail|reach\s+(you|us|out|someone|somebody)|"
    r"call\s+(you|us|the\s+(office|school|university|team))|"
    r"talk\s+to\s+(someone|somebody|a\s+human|an?\s+(advisor|adviser|agent|person|representative|staff))|"
    r"speak\s+to\s+(someone|somebody|a\s+human|an?\s+(advisor|adviser|agent|person|representative|staff))|"
    r"who\s+(can|do|should)\s+i\s+(contact|call|reach|talk\s+to|speak\s+to|email)|"
    r"how\s+(can|do|should)\s+i\s+(contact|call|reach|email|get\s+in\s+touch|get\s+hold\s+of)|"
    r"get\s+in\s+touch|where\s+(are|is)\s+(you|your\s+office|the\s+campus|the\s+office)|"
    r"location|located|"
    r"(email|e-mail|mailing|postal|physical|office|campus|contact|your|our|home)\s+address|"
    r"address\s+of\s+(the\s+)?(campus|office|school|university)|"
    r"phone\s+number|contact\s+number|whatsapp\s+number|contact\s+details)\b",
    re.IGNORECASE,
)

PORTAL_FALLBACK = (
    "I couldn't find that in our information yet. The admissions office can "
    "give you an accurate answer.\n\n"
    "I can help with programmes offered, how to apply, entry requirements, "
    "tuition and fees, scholarships, admission schemes, news and events, or "
    "student success stories."
)

# Used when a message carries no topical words at all (e.g. "how are you",
# "what's up"). Rather than retrieving the nearest neighbour -- which always
# exists and reads as an unrelated data dump -- ask what the user wants.
def _clarify(portal_name: str) -> str:
    return (
        f"Happy to help! What would you like to know about {portal_name}? "
        "I can cover programmes, how to apply, entry requirements, tuition and "
        "fees, scholarships, news and events, or student success stories."
    )


def _intents(portal_name: str):
    return {
        "greeting": f"Hello! I'm the assistant for {portal_name}. I can help with programmes, how to apply, entry requirements, tuition and fees, scholarships, and more. What would you like to know?",
        "thanks": f"You're welcome! Feel free to ask if you need anything else about {portal_name}.",
        "farewell": "Goodbye! If you need help later, just open this chat again. Best of luck with your application!",
        "wellbeing": f"I'm doing well, thanks for asking! How can I help you with {portal_name} — programmes, applications, entry requirements, tuition and fees, or scholarships?",
        "identity": f"I'm the assistant for {portal_name}, a virtual guide for programmes, admissions, entry requirements, tuition and fees, scholarships, and more.",
        "capability": "I can help with programmes offered, how to apply, entry requirements, tuition and fees, scholarships, admission schemes, news and events, and student success stories. What would you like to know?",
    }

# Promotional and testimonial copy. Allowed as the lead source, but it has to
# be virtually as strong as the best hit before it is listed underneath a
# factual answer.
_LOW_PRIORITY_COLLECTIONS = {"student_stories", "alumni", "partners"}
_LOW_PRIORITY_RATIO = 0.95

_WHITESPACE_RE = re.compile(r"\s+")
_APOSTROPHE_RE = re.compile(r"[’`]")


def _normalise_query(text: str) -> str:
    """Lower-case, collapse whitespace and unify apostrophes for intent matching."""
    text = _APOSTROPHE_RE.sub("'", text or "")
    return _WHITESPACE_RE.sub(" ", text.strip().lower())


def _classify(query: str):
    query = _normalise_query(query)
    if _GREETING_RE.match(query):
        return "greeting"
    # Everything after a leading "hi/hello/hey" is what the user actually asked;
    # classifying the remainder makes "hello, what's your name?" an identity
    # question instead of a retrieval miss.
    core = _LEAD_GREETING_RE.sub("", query).strip()
    if _THANKS_RE.match(core):
        return "thanks"
    if _FAREWELL_RE.match(core):
        return "farewell"
    if _WELLBEING_RE.match(core):
        return "wellbeing"
    if _IDENTITY_RE.match(core):
        return "identity"
    if _CAPABILITY_RE.match(core):
        return "capability"
    if _CONTACT_RE.search(core):
        return "contact"
    if is_catalog_query(core):
        return "catalog"
    return "question"


def is_conversational(query: str) -> bool:
    """Whether a message is small talk or carries nothing to retrieve on.

    A message with no topical words (all stopwords, e.g. "how are you") must
    not reach retrieval: the vector store always returns the nearest
    neighbours, which is how an unrelated terms/CTA dump got attached to a
    plain greeting.
    """
    # A catalogue request is small-talk-free by classification but still needs
    # retrieval, so it must not be short-circuited here.
    if is_catalog_query(_normalise_query(query)):
        return False
    return _classify(query) != "question" or not content_terms(query)


def _normalise(text: str) -> str:
    """Fingerprint used to spot the same passage quoted twice."""
    return _WHITESPACE_RE.sub(" ", (text or "").strip().lower())


def _relevant(hits, min_score: float):
    """Keep only passages that are actually about the question.

    Retrieval returns the top-k neighbours, which always exists even when the
    question shares almost no vocabulary with the corpus. Without a floor the
    reply padded itself with unrelated records.
    """
    kept = [h for h in hits if h[1] >= min_score]
    return kept


def _dedupe(hits):
    """Drop repeats of the same title or the same body text."""
    seen_titles = set()
    seen_bodies = set()
    unique = []
    for chunk, score in hits:
        meta = chunk.get("metadata", {}) or {}
        title = (meta.get("title") or "").strip().lower()
        body = _normalise(chunk.get("text", ""))
        if title and title in seen_titles:
            continue
        if body and body in seen_bodies:
            continue
        if title:
            seen_titles.add(title)
        if body:
            seen_bodies.add(body)
        unique.append((chunk, score))
    return unique


def _select(hits):
    """Drop noise and off-topic neighbours, keeping the strongest sources.

    Marketing and testimonial copy is welcome when it is the answer, but not as a
    second or third source under a factual question: an admissions query was
    answered with the admissions FAQ followed by a student's water-filter
    project, which read as two unrelated facts stapled together.
    """
    candidates = _dedupe(_relevant(hits, MIN_HIT_SCORE))
    if not candidates:
        return candidates

    best_score = candidates[0][1]
    keep = []
    for index, (chunk, score) in enumerate(candidates):
        collection = (chunk.get("metadata", {}) or {}).get("collection")
        if index and collection in _LOW_PRIORITY_COLLECTIONS:
            if score < best_score * _LOW_PRIORITY_RATIO:
                continue
        keep.append((chunk, score))
    return keep


def _truncate(text: str, limit: int) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].rstrip(",;:") + "…"


def _body_of(chunk) -> str:
    """The display text for a chunk.

    The indexed text carries the heading so retrieval can match on it; only the
    body should be quoted back.
    """
    meta = chunk.get("metadata", {}) or {}
    return (meta.get("body") or chunk.get("text", "") or "").strip()


def _link_for(meta) -> str:
    """A "read more" markdown link for a chunk, or "" when links are disabled.

    Link generation is off unless ``SITE_LINK_BASE`` is configured, so the
    offline evaluation baseline (which diffs answer text) stays stable and
    deployments that don't want links are unaffected.
    """
    if not SITE_LINK_BASE:
        return ""
    collection = (meta or {}).get("collection")
    path = SOURCE_PATHS.get(collection)
    if not path:
        return ""
    if "{id}" in path:
        entity_id = (meta or {}).get("entity_id")
        if entity_id is None:
            return ""
        path = path.format(id=entity_id)
    return f"[Read more]({SITE_LINK_BASE}{path})"


def _catalog_answer(portal_name: str, hits, fallback: Optional[str] = None) -> str:
    """List every programme on offer.

    A "what courses do you offer" question shares almost no wording with the
    degree records, so retrieval cannot rank them individually. The records are
    presented as one list instead, so the reply shows the whole catalogue rather
    than a single, arbitrary nearest neighbour.
    """
    entries = []
    seen = set()
    for chunk, _score in hits:
        meta = chunk.get("metadata", {}) or {}
        title = (meta.get("title") or "").strip()
        key = title.lower()
        if not title or key in seen:
            continue
        seen.add(key)
        entries.append((title, _truncate(_body_of(chunk), 240), _link_for(meta)))

    if not entries:
        return fallback or PORTAL_FALLBACK

    lines = [f"Here are the programmes {portal_name} offers:", ""]
    for title, body, link in entries:
        line = f"• **{title}**"
        if body:
            line += f" — {body}"
        if link:
            line += f"  {link}"
        lines.append(line)
    lines.append("")
    lines.append("Would you like details on any of these?")
    return "\n".join(lines)


def _list_answer(portal_name: str, hits, list_topic: str, fallback: Optional[str] = None) -> str:
    """List every record of a collection for a generic collection question.

    "What's the latest news?" shares almost no wording with an individual news
    record, so ranking picks one arbitrary neighbour. The whole collection is
    listed instead -- the same wholesale presentation the catalogue uses.
    """
    intros = {
        "news": ("Here are the latest updates from {portal}:", "Would you like details on any of these?"),
        "events": ("Here are the upcoming events at {portal}:", "Which of these would you like to know more about?"),
        "stories": ("Here are a few stories from our students and alumni:", "Would you like to read any of these in full?"),
    }
    intro, closer = intros.get(list_topic, ("Here's what we have:", "Anything you'd like to know more about?"))

    entries = []
    seen = set()
    for chunk, _score in hits:
        meta = chunk.get("metadata", {}) or {}
        title = (meta.get("title") or "").strip()
        key = title.lower()
        if not title or key in seen:
            continue
        seen.add(key)
        entries.append((title, _truncate(_body_of(chunk), 240), _link_for(meta)))

    if not entries:
        return fallback or PORTAL_FALLBACK

    lines = [intro.format(portal=portal_name), ""]
    for title, body, link in entries:
        line = f"• **{title}**"
        if body:
            line += f" — {body}"
        if link:
            line += f"  {link}"
        lines.append(line)
    lines.append("")
    lines.append(closer)
    return "\n".join(lines)


def _contact_answer(portal_name: str, tenant: Optional[str] = None) -> str:
    """Warm, human reply with the organisation's contact details.

    The details are read from the same CMS settings the site footer uses, so
    the reply stays in step with the rendered page. Fields that are not
    configured are omitted; nothing is invented.
    """
    details = get_contact_details(tenant=tenant)

    fields = [
        ("📧 **Email:**", details.get("email")),
        ("📞 **Phone:**", details.get("phone")),
        ("💬 **WhatsApp:**", details.get("whatsapp")),
        ("📍 **Visit us:**", details.get("address")),
        ("🕘 **Office hours:**", details.get("hours")),
    ]
    listed = [f"{label} {value}" for label, value in fields if value]

    # No contact details configured: say so instead of quoting placeholders.
    if not listed:
        return (
            "I'm not able to share the admissions office's phone or email yet — "
            "they haven't been published on the site. You can reach the team "
            "through the Contact page, and they'll help with anything about "
            "courses, fees or applications. Is there a programme you'd like to "
            "ask about in the meantime?"
        )

    lines = [
        f"Of course — happy to help you get in touch with {portal_name}! "
        "Here's how you can reach the team:",
        "",
        *listed,
        "",
        "For anything about courses, the admissions team is the quickest route "
        "— they can talk you through requirements, fees and deadlines. Is there "
        "a particular programme you'd like to know more about?",
    ]
    return "\n".join(lines)


def _compose(
    query: str,
    hits,
    portal_name: Optional[str] = None,
    fallback: Optional[str] = None,
    no_answer: Optional[str] = None,
    tenant: Optional[str] = None,
):
    """Return (answer text, hits actually quoted).

    The two are produced together so the source list shown under a reply cannot
    advertise a record the reply dropped: an admissions question kept the FAQ and
    discarded the student story, and the UI used to list both.
    """
    portal_name = portal_name or site_settings.portal_name(tenant)
    fallback = fallback or PORTAL_FALLBACK

    intent = _classify(query)
    if intent == "contact":
        return _contact_answer(portal_name, tenant), []
    if intent == "catalog":
        if hits:
            return _catalog_answer(portal_name, hits, fallback), hits
        return fallback, []
    # A question that only names a collection ("what's the latest news?")
    # is answered by listing that collection.
    topics = classify_topics(query)
    if topics["primary"] in LISTABLE_TOPICS and not topics["secondary"]:
        if hits:
            return _list_answer(portal_name, hits, topics["primary"], fallback), hits
        return fallback, []
    if intent != "question":
        return _intents(portal_name).get(intent, PORTAL_FALLBACK), []
    if not content_terms(query):
        return _clarify(portal_name), []
    if not hits:
        return fallback, []

    selected = _select(hits)[:ANSWER_MAX_SOURCES]
    entries = []
    for chunk, _score in selected:
        meta = chunk.get("metadata", {}) or {}
        title = (meta.get("title") or "").strip()
        body = _truncate(_body_of(chunk), ANSWER_CHUNK_LIMIT)
        if not body:
            continue
        entries.append((title, body, _link_for(meta)))

    if not entries:
        return (no_answer or fallback), []

    quoted = [
        (chunk, score)
        for chunk, score in selected
        if _truncate(_body_of(chunk), ANSWER_CHUNK_LIMIT)
    ]

    # A single strong match is quoted on its own rather than dressed up with an
    # introduction, which reads like a search result instead of an answer.
    if len(entries) == 1:
        title, body, link = entries[0]
        text = f"**{title}**\n{body}" if title else body
        if link:
            text = f"{text}\n\n{link}"
        return text, quoted

    lines = ["Here's what our information says:", ""]
    for title, body, link in entries:
        if title:
            lines.append(f"**{title}**")
        lines.append(body)
        if link:
            lines.append(link)
        lines.append("")
    lines.append("Let me know if you'd like more detail on any of these.")
    return "\n".join(lines).rstrip(), quoted


def build_answer(
    query: str,
    hits,
    portal_name: Optional[str] = None,
    fallback: Optional[str] = None,
    no_answer: Optional[str] = None,
    tenant: Optional[str] = None,
) -> str:
    return _compose(query, hits, portal_name, fallback, no_answer, tenant)[0]


def quoted_sources(
    query: str,
    hits,
    portal_name: Optional[str] = None,
    fallback: Optional[str] = None,
    no_answer: Optional[str] = None,
    tenant: Optional[str] = None,
):
    """Sources the reply actually used, in the order it used them."""
    return extract_sources(
        _compose(query, hits, portal_name, fallback, no_answer, tenant)[1]
    )


def extract_sources(hits):
    sources = []
    seen = set()
    for chunk, _score in hits:
        meta = chunk.get("metadata", {})
        title = meta.get("title")
        if title in seen:
            continue
        seen.add(title)
        sources.append(
            {
                "title": title,
                "collection": meta.get("collection"),
                "entity_id": meta.get("entity_id"),
            }
        )
    return sources