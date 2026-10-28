import math
import re
from collections import Counter
from typing import List

import numpy as np

from app.config import EMBEDDING_MODEL_NAME

_TOKEN_RE = re.compile(r"[a-zA-Z0-9]+")

# Question scaffolding and filler. Without this, "what is the weather in Kampala"
# scored 0.40 against an FAQ simply because the FAQ also began with "What...".
_STOPWORDS = frozenset(
    """
    a an the and or but if then than that this these those there here
    is are was were be been being am do does did done doing have has had
    having i me my we our you your he him his she her it its they them their
    what which who whom whose when where why how
    can could should would may might must shall will just about into over
    for from with without within please tell give show find get know need
    want like any some all more most other such only own same too very
    offer offers provide provides include includes available currently
    university universities
    s t don now
    """.split()
)

_MIN_STEM_LEN = 4

# Words whose trailing "s" is not a plural and must survive the stemmer.
# "news" -> "new" would otherwise break both retrieval and topic detection.
_NO_STRIP = frozenset({"news"})

# Confident synonym folds applied after stemming, to both the corpus and the
# query, so the vector space itself knows that "cost" means "fee". Each fold is
# a high-confidence equivalence: a wrong fold would attach documents to
# questions they do not answer, so nothing speculative lives here.
# Do not fold "financial": a bank that funds student loans and a scholarship
# both discuss money, and folding them together drags the wrong record in.
_SYNONYM_FOLD = {
    # fee family
    "tuition": "fee",
    "tuitionfees": "fee",
    "ugx": "fee",
    "cost": "fee",
    "costs": "fee",
    "price": "fee",
    "prices": "fee",
    "pay": "fee",
    "paying": "fee",
    "payable": "fee",
    "payments": "fee",
    "payment": "fee",
    "installment": "fee",
    "installments": "fee",
    "instalments": "fee",
    # application family
    "application": "apply",
    "applications": "apply",
    "apply": "apply",
    "applicant": "apply",
    "applicants": "apply",
    "submit": "apply",
    "submission": "apply",
    "register": "apply",
    "registration": "apply",
    # admission is its own token (an admissions office is a place, not a verb)
    # requirement family
    "requirement": "requirement",
    "requirements": "requirement",
    "entry": "requirement",
    "eligible": "requirement",
    "eligibility": "requirement",
    "qualify": "qualification",
    "qualifies": "qualification",
    "qualification": "qualification",
    "qualifications": "qualification",
    "grade": "credit",
    "grades": "credit",
    "credit": "credit",
    "credits": "credit",
    "prerequisite": "requirement",
    # deadline family
    "deadline": "deadline",
    "deadlines": "deadline",
    "closing": "deadline",
    "intake": "deadline",
    # scholarship family (grants and bursaries ARE scholarships)
    "bursary": "scholarship",
    "bursaries": "scholarship",
    "grant": "scholarship",
    "grants": "scholarship",
    "stipend": "scholarship",
    "sponsorship": "scholarship",
    # story family
    "testimonial": "story",
    "testimonials": "story",
    "success": "story",
    "story": "story",
    "stories": "story",
    "alumni": "story",
    "alumnus": "story",
    # campus family
    "residence": "accommodation",
    "hostel": "accommodation",
    "accommodation": "accommodation",
    # event family
    "symposium": "event",
    "ceremony": "event",
    "homecoming": "event",
    "workshop": "event",
    "seminars": "event",
    "seminar": "event",
}


def _stem(token: str) -> str:
    """Collapse the endings that stop a question matching its own answer.

    "scholarships" has to reach the scholarship records, which are titled in the
    singular; without this the assistant claimed to know nothing about
    scholarships while three records sat in the index.
    """
    if token in _NO_STRIP:
        return token
    if len(token) > _MIN_STEM_LEN and token.endswith("ies"):
        return token[:-3] + "y"
    if len(token) > _MIN_STEM_LEN and token.endswith("sses"):
        return token[:-2]
    if len(token) > 3 and token.endswith("s") and not token.endswith("ss"):
        return token[:-1]
    if len(token) > 5 and token.endswith("ing"):
        return token[:-3]
    if len(token) > 4 and token.endswith("ed"):
        return token[:-2]
    return token


def _tokenize(text: str) -> List[str]:
    tokens = [t for t in _TOKEN_RE.findall(text.lower()) if t not in _STOPWORDS]
    stemmed = [_stem(t) for t in tokens]
    folded = [_SYNONYM_FOLD.get(t, t) for t in stemmed]
    return [t for t in folded if t]


def content_terms(text: str) -> set:
    """The meaningful words of a text, as a set, for coverage comparisons.

    Exposed so retrieval can ask "does this record actually mention nursing?"
    instead of trusting a raw cosine magnitude, which is small for any short,
    specific question because the query vector has few terms to match.
    """
    return set(_tokenize(text or ""))


class TfidfEmbedder:
    def __init__(self):
        self.vocab: dict = {}
        self.idf: np.ndarray | None = None
        self.fitted = False

    def fit(self, texts):
        doc_freq = Counter()
        for text in texts:
            tokens = set(_tokenize(text))
            for tok in tokens:
                doc_freq[tok] += 1
        self.vocab = {tok: idx for idx, (tok, _) in enumerate(doc_freq.items())}
        n_docs = max(len(texts), 1)
        parts = [math.log((1 + n_docs) / (1 + freq)) + 1.0 for tok, freq in doc_freq.items()]
        self.idf = np.asarray(parts, dtype="float32")
        self.fitted = True

    def transform(self, texts) -> np.ndarray:
        if not self.fitted:
            return np.zeros((len(texts), 1), dtype="float32")
        rows = []
        for text in texts:
            counts = Counter(_tokenize(text))
            row = np.zeros(len(self.vocab), dtype="float32")
            for tok, count in counts.items():
                idx = self.vocab.get(tok)
                if idx is not None:
                    row[idx] = (1 + math.log(count)) * self.idf[idx]
            rows.append(row)
        matrix = np.asarray(rows, dtype="float32")
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return matrix / norms


class EmbeddingModel:
    def __init__(self, lazy: bool = True):
        self._lazy = lazy
        self._initialized = False
        self._backend = "pending"
        self._sentence_model = None
        self._tfidf = TfidfEmbedder()

    def ensure_initialized(self) -> None:
        if self._initialized:
            return
        try:
            from sentence_transformers import SentenceTransformer

            self._sentence_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
            self._backend = "sentence-transformers"
        except Exception:
            self._backend = "tfidf"
        self._initialized = True

    @property
    def backend(self) -> str:
        return self._backend if self._initialized else "pending"

    @property
    def model_name(self) -> str:
        if self.backend == "sentence-transformers":
            return EMBEDDING_MODEL_NAME
        if self.backend == "tfidf":
            return "builtin-tfidf"
        return ""

    def fit(self, texts) -> None:
        if self.backend == "tfidf":
            self._tfidf.fit(texts)

    def fitted_state(self) -> dict:
        """Export the fitted state needed to embed queries against this index.

        The sentence-transformers backend is stateless (the same model is
        reloaded), but the TF-IDF vocabulary and idf weights are derived from
        the corpus, so they must be persisted alongside the vectors. Without
        them a restarted service scores every query as zero.
        """
        self.ensure_initialized()
        if self.backend != "tfidf" or not self._tfidf.fitted:
            return {"backend": self.backend}
        return {
            "backend": "tfidf",
            "vocab": self._tfidf.vocab,
            "idf": self._tfidf.idf.tolist(),
        }

    def restore_fitted_state(self, state: dict | None) -> int:
        """Restore TF-IDF state saved by `fitted_state`.

        Returns the vocabulary size, or 0 when there is nothing to restore.
        """
        self.ensure_initialized()
        if not state or state.get("backend") != "tfidf":
            return 0
        vocab = state.get("vocab") or {}
        idf = state.get("idf") or []
        if not vocab or len(vocab) != len(idf):
            return 0
        self._tfidf.vocab = dict(vocab)
        self._tfidf.idf = np.asarray(idf, dtype="float32")
        self._tfidf.fitted = True
        return len(self._tfidf.vocab)

    def is_query_ready(self, dimensions: int) -> bool:
        """Whether a query can be embedded into a vector of this width."""
        self.ensure_initialized()
        if self.backend != "tfidf":
            return True
        return self._tfidf.fitted and len(self._tfidf.vocab) == dimensions

    def encode(self, texts, batch_size: int = 64) -> np.ndarray:
        self.ensure_initialized()
        if self.backend == "tfidf":
            return self._tfidf.transform(list(texts))
        vectors = self._sentence_model.encode(
            list(texts),
            batch_size=batch_size,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return np.asarray(vectors, dtype="float32")