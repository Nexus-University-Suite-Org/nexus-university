"""Lightweight question-intent helpers shared by retrieval and generation.

The catalogue intent answers "what courses/programmes do you offer". It is kept
separate from the small-talk intents because it still needs retrieval: unlike a
greeting, the reply is built from records in the knowledge base.

:func:`classify_topics` additionally buckets every question into the topics the
assistant can actually testify about (fees, scholarships, requirements, news,
events, stories, campus...). Retrieval uses the bucket to steer the search and
to refuse neighbours that do not mention the topic at all, so a question about
cost can never be answered with a student story that merely contains "cost".
All topic matching runs on the fold-normalised tokens from ``content_terms``,
so synonyms ("tuition" = "fee", "bursary" = "scholarship") agree between the
question and the corpus.
"""

from app.models.embedding import content_terms

# Nouns that name the catalogue itself.
_CATALOG_NOUNS = frozenset(
    {
        "course",
        "programme",
        "program",
        "degree",
        "discipline",
        "field",
        "study",
        "major",
        "subject",
    }
)

# Verbs that describe offering the catalogue. Note that stopword removal in
# ``content_terms`` already drops "offer"/"offers"/"provide"/"available"; the
# forms below survive as raw tokens and are kept so a bare "what do you teach"
# is still recognised.
_CATALOG_VERBS = frozenset(
    {
        "offer",
        "teach",
        "list",
        "learn",
        "study",
        "enrol",
        "enroll",
        "run",
        "available",
        "major",
    }
)

def _primary_topic(query: str) -> str:
    return classify_topics(query)["primary"]


def topic_token_set(topic: str) -> frozenset:
    """Fold-normalised tokens that name a topic, for scoped retrieval."""
    return _TOPIC_TOKENS.get(topic, frozenset())


def is_catalog_query(query: str) -> bool:
    """Whether a question asks for the list of courses/programmes.

    A question is a catalogue request when every meaningful word is either the
    catalogue itself or the act of offering it. That keeps "what courses do you
    offer" in, while a question that introduces another topic -- "how do I
    register for courses?", "what is the fee for the nursing programme" -- stays
    out and is answered by normal retrieval.
    """
    text = (query or "").strip()
    if not text:
        return False

    terms = content_terms(text)
    if not terms:
        return False

    if terms & _CATALOG_NOUNS:
        leftover = terms - _CATALOG_NOUNS - _CATALOG_VERBS
        return not leftover

    if terms <= _CATALOG_VERBS and _has_question_word(text):
        return True

    return False


def _has_question_word(text: str) -> bool:
    lowered = text.lower()
    return any(
        word in lowered
        for word in ("what", "which", "list", "show", "name", "any")
    )


# Topics the assistant can testify about, each expressed as the fold-normalised
# tokens (see app.models.embedding) that name it. Scores are summed per topic so
# "how do I apply for a scholarship" can surface both intents, primary first.
_TOPIC_TOKENS = {
    "fees": frozenset({"fee"}),
    "scholarships": frozenset({"scholarship"}),
    "requirements": frozenset({"requirement", "qualification", "credit", "olevel", "alevel"}),
    "deadline": frozenset({"deadline"}),
    "apply": frozenset({"apply", "admission"}),
    "campus": frozenset(
        {"accommodation", "campus", "library", "sport", "sports", "portal", "calendar", "service", "facility", "facilities"}
    ),
    "news": frozenset({"news", "announcement", "announcements", "ranking", "rankings", "update", "updates"}),
    "events": frozenset({"event", "events"}),
    "stories": frozenset({"story"}),
    "program_detail": frozenset(
        {"course", "courses", "programme", "programmes", "program", "programs",
         "degree", "degrees", "major", "subject", "subjects", "bachelor", "bachelors",
         "master", "masters", "masterss"}
    ),
}

# Ties within a single question prefer the topic that narrows retrieval most.
_TOPIC_PRIORITY = (
    "fees",
    "scholarships",
    "requirements",
    "deadline",
    "apply",
    "campus",
    "news",
    "events",
    "stories",
    "program_detail",
)

# Raw (pre-tokenisation) phrases that no token set can capture, e.g. "open day"
# splits into two generic words.
_PHRASE_TOPICS = (
    ("events", ("open day", "open days")),
    ("campus", ("log in", "login", "log into")),
    ("scholarships", ("financial aid",)),
)

# Topics whose answer is a list of records when the question names nothing more
# specific than the collection itself ("what's the latest news?").
LISTABLE_TOPICS = frozenset({"news", "events", "stories"})


def _topic_scores(query: str) -> dict:
    tokens = content_terms(query)
    scores = {topic: 0 for topic in _TOPIC_PRIORITY}
    for topic, topic_tokens in _TOPIC_TOKENS.items():
        scores[topic] = len(tokens & topic_tokens)
    lowered = (query or "").lower()
    for topic, phrases in _PHRASE_TOPICS:
        if any(phrase in lowered for phrase in phrases):
            scores[topic] += 1
    return {topic: score for topic, score in scores.items() if score > 0}


def classify_topics(query: str) -> dict:
    """Return ``{"primary": ..., "secondary": [...]}`` for an institutional query.

    ``primary`` is the topic that most narrows what an answer should be about;
    ``secondary`` lists any other topics the question also touches. A question
    that matches no topic gets ``"question"``, so callers know to fall back to
    generic (strictly-scored) retrieval.
    """
    scores = _topic_scores(query)
    if not scores:
        return {"primary": "question", "secondary": []}
    ranked = sorted(scores.items(), key=lambda item: (-item[1], _TOPIC_PRIORITY.index(item[0])))
    primary, primary_score = ranked[0]
    if primary == "program_detail" and is_catalog_query(query):
        primary = "program_list"
    secondary = [topic for topic, score in ranked[1:] if score == primary_score or score >= 1]
    if primary == "program_list":
        secondary = [t for t in secondary if t != "program_detail"]
    return {"primary": primary, "secondary": secondary}
