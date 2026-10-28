import json
import logging
import re
import threading
from datetime import datetime, timezone
from pathlib import Path
from collections import Counter

import numpy as np

from app import config
from app.config import INDEX_DIR, INDEX_SCHEMA_VERSION
from app.models.embedding import EmbeddingModel
from app.models.vector_store import VectorStore

log = logging.getLogger(__name__)

# One index per tenant. Each tenant owns a directory (the default tenant uses the
# index root itself) so a retrain for one university never overwrites another's
# knowledge base.
DEFAULT_KEY = "default"
_SAFE_KEY_RE = re.compile(r"[^a-z0-9._-]+")


def _default_refs() -> set:
    refs = {config.TENANT_DEFAULT_ID}
    if config.TENANT_DEFAULT_CODE:
        refs.add(config.TENANT_DEFAULT_CODE)
    return refs


def tenant_key(tenant) -> str:
    """Canonical, filesystem-safe key for a tenant reference (code or id)."""
    ref = (tenant or "").strip().lower()
    if not ref or ref in _default_refs():
        return DEFAULT_KEY
    cleaned = _SAFE_KEY_RE.sub("-", ref).strip("-")
    return cleaned or DEFAULT_KEY


def _index_dir_for(key: str) -> Path:
    return INDEX_DIR if key == DEFAULT_KEY else config.TENANTS_DIR / key


class KnowledgeBase:
    def __init__(self, index_dir: Path):
        self.index_dir = Path(index_dir)
        self.embedding = EmbeddingModel()
        self.chunks: list = []
        self._store: VectorStore | None = None
        self.trained_at: str | None = None
        self.stats: dict = {}
        self._lock = threading.RLock()

    @property
    def _chunks_file(self) -> Path:
        return self.index_dir / "chunks.json"

    @property
    def _vectors_file(self) -> Path:
        return self.index_dir / "vectors.npy"

    @property
    def _state_file(self) -> Path:
        return self.index_dir / "state.json"

    @property
    def store_backend(self):
        return self._store.backend if self._store else "numpy"

    def count(self) -> int:
        return len(self.chunks)

    def is_trained(self) -> bool:
        return self.count() > 0 and self.trained_at is not None

    def rebuild(self, chunks: list) -> dict:
        with self._lock:
            texts = [c["text"] for c in chunks]
            self.embedding.ensure_initialized()
            self.embedding.fit(texts)
            vectors = self.embedding.encode(texts)
            self._store = VectorStore(vectors)
            self.chunks = chunks
            self.trained_at = datetime.now(timezone.utc).isoformat()
            collections = Counter(
                c.get("metadata", {}).get("collection", "unknown") for c in chunks
            )
            self.stats = {
                "chunks": len(chunks),
                "collections": dict(collections),
                "backend": self.embedding.backend,
                "store_backend": self._store.backend,
                "dimensions": int(vectors.shape[1]) if vectors.ndim == 2 else 0,
            }
            self.save()
            return self.stats

    def query(self, query: str, top_k: int):
        with self._lock:
            if not self.is_trained():
                return []
            q_vector = self.embedding.encode([query])[0]
            results = self._store.search(q_vector, top_k)
            hits = []
            for idx, score in results:
                hits.append((self.chunks[idx], float(score)))
            return hits

    def save(self) -> None:
        with self._lock:
            self.index_dir.mkdir(parents=True, exist_ok=True)
            if self._store:
                self._vectors_file.write_bytes(self._store.vectors.tobytes())
            self._chunks_file.write_text(
                json.dumps(self.chunks, ensure_ascii=False), encoding="utf-8"
            )
            state = {
                "trained_at": self.trained_at,
                "stats": self.stats,
                "count": len(self.chunks),
                "shape": list(self._store.vectors.shape) if self._store else None,
                "dtype": str(self._store.vectors.dtype) if self._store else "",
                "embedding_state": self.embedding.fitted_state(),
                "schema_version": INDEX_SCHEMA_VERSION,
            }
            self._state_file.write_text(
                json.dumps(state, ensure_ascii=False), encoding="utf-8"
            )

    def load_if_exists(self) -> bool:
        with self._lock:
            if not (self._vectors_file.exists() and self._chunks_file.exists()):
                return False
            try:
                shape_state = json.loads(self._state_file.read_text(encoding="utf-8"))
                if shape_state.get("schema_version") != INDEX_SCHEMA_VERSION:
                    log.info(
                        "stored index was built with schema %s, this build uses %s;"
                        " rebuilding",
                        shape_state.get("schema_version"),
                        INDEX_SCHEMA_VERSION,
                    )
                    return False
                shape = tuple(shape_state.get("shape") or (0, 1))
                raw = np.frombuffer(self._vectors_file.read_bytes(), dtype=np.float32)
                vectors = raw.reshape(shape)
                # The TF-IDF vocabulary is derived from the corpus, so it has to come back with
                # the vectors. Without it transform() emits a zero vector, every
                # similarity scores 0 and the assistant answers from arbitrary
                # chunks while reporting itself trained. Prefer a rebuild.
                self.embedding.restore_fitted_state(
                    shape_state.get("embedding_state")
                )
                if not self.embedding.is_query_ready(int(vectors.shape[1])):
                    log.warning(
                        "stored index has no usable %s vocabulary for %s dimensions;"
                        " rebuilding",
                        self.embedding.backend,
                        vectors.shape[1],
                    )
                    return False
                self.chunks = json.loads(self._chunks_file.read_text(encoding="utf-8"))
                self._store = VectorStore(vectors)
                self.trained_at = shape_state.get("trained_at")
                self.stats = shape_state.get("stats", {})
                return True
            except Exception:
                log.exception("failed to load the stored index; it will be rebuilt")
                return False


_KBS: dict[str, KnowledgeBase] = {}
_KBS_LOCK = threading.Lock()


def kb_for(tenant=None) -> KnowledgeBase:
    """Return the knowledge base for a tenant, loading its index on first use."""
    key = tenant_key(tenant)
    with _KBS_LOCK:
        instance = _KBS.get(key)
        if instance is None:
            instance = KnowledgeBase(_index_dir_for(key))
            instance.load_if_exists()
            _KBS[key] = instance
        return instance


# Backwards-compatible default instance. Callers that are not tenant-aware (and
# the startup trainer) operate on the deployment default index.
kb = kb_for(None)
