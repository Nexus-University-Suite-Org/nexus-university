import json
import logging
import threading
import time
from typing import Optional

from app.config import (
    AUTO_TRAIN_ATTEMPTS,
    AUTO_TRAIN_BACKOFF_SECONDS,
)
from app.models.knowledge_base import kb_for, tenant_key
from app.services.ingestion import extract_all_chunks
from app.utils import nap_client

log = logging.getLogger(__name__)

_LOCK = threading.Lock()
# Tenant keys with a training run currently in flight, so repeated chat requests
# for an untrained tenant do not each kick off another full rebuild.
_IN_PROGRESS: set[str] = set()
_IN_PROGRESS_LOCK = threading.Lock()


def is_training(tenant=None) -> bool:
    return tenant_key(tenant) in _IN_PROGRESS


def train(tenant: Optional[str] = None) -> dict:
    key = tenant_key(tenant)
    with _LOCK:
        target = kb_for(tenant)
        chunks = extract_all_chunks(tenant)
        if not chunks:
            # Rebuilding with an empty list would wipe a working index and then
            # stamp a fresh trained_at on it, so the assistant would look
            # trained while answering nothing. Refuse and let the caller retry.
            raise RuntimeError(
                "no content retrieved from the NAP API; refusing to overwrite "
                "the existing index"
            )
        target.index_dir.mkdir(parents=True, exist_ok=True)
        (target.index_dir / "corpus.json").write_text(
            json.dumps(chunks, ensure_ascii=False), encoding="utf-8"
        )
        stats = target.rebuild(chunks)
        state = {
            "tenant": key,
            "last_training_at": target.trained_at,
            "chunks": target.count(),
            "stats": stats,
        }
        (target.index_dir / "training_state.json").write_text(
            json.dumps(state, ensure_ascii=False), encoding="utf-8"
        )
        return state


def train_with_retries(
    tenant: Optional[str] = None, attempts: int = AUTO_TRAIN_ATTEMPTS
) -> dict | None:
    """Run `train`, retrying transient upstream failures.

    Content is pulled from the NAP API over the network, so a single failed
    fetch during a deploy would otherwise leave the assistant untrained until
    someone noticed and clicked the button.
    """
    last_error: Exception | None = None
    for attempt in range(1, max(attempts, 1) + 1):
        try:
            state = train(tenant)
            log.info(
                "knowledge base trained for tenant %s: %s chunks (%s)",
                tenant_key(tenant),
                state.get("chunks"),
                state.get("stats", {}).get("backend"),
            )
            return state
        except Exception as exc:  # noqa: BLE001 - retried, then reported
            last_error = exc
            log.warning(
                "training attempt %s/%s for tenant %s failed: %s",
                attempt,
                attempts,
                tenant_key(tenant),
                exc,
            )
            if attempt < attempts:
                time.sleep(AUTO_TRAIN_BACKOFF_SECONDS)
    log.error("giving up on automatic training for tenant %s: %s", tenant_key(tenant), last_error)
    return None


def ensure_training_async(tenant: Optional[str] = None) -> bool:
    """Start a background train for an untrained tenant, at most once.

    Returns True when a run was started (or is already in progress).
    """
    key = tenant_key(tenant)
    target = kb_for(tenant)
    if target.is_trained():
        return False
    with _IN_PROGRESS_LOCK:
        if key in _IN_PROGRESS:
            return True
        _IN_PROGRESS.add(key)

    def _run():
        try:
            train_with_retries(tenant)
        except Exception:  # noqa: BLE001 - never kill the worker thread
            log.exception("background training crashed for tenant %s", key)
        finally:
            with _IN_PROGRESS_LOCK:
                _IN_PROGRESS.discard(key)

    threading.Thread(target=_run, name=f"auto-train-{key}", daemon=True).start()
    return True


def training_status(tenant: Optional[str] = None) -> dict:
    target = kb_for(tenant)
    return {
        "tenant": tenant_key(tenant),
        "trained_at": target.trained_at,
        "trained": target.is_trained(),
        "training": is_training(tenant),
        "chunks": target.count(),
        "embedding_backend": target.embedding.backend,
        "embedding_model": target.embedding.model_name,
        "store_backend": target.store_backend,
        "stats": target.stats,
    }


def available_sources(tenant: Optional[str] = None) -> dict:
    collections = [
        "news",
        "events",
        "gallery",
        "faqs",
        "alumni",
        "partners",
        "scholarships",
        "student_stories",
        "legal_pages",
        "quick_links",
        "courses",
        "faculty",
        "page_sections",
        "programs",
        "site_settings",
    ]
    payloads = nap_client.fetch_all_collections(collections, tenant=tenant)
    counts = {}
    for collection, payload in payloads.items():
        if isinstance(payload, (list, dict)):
            counts[collection] = {"available": True, "records": len(payload)}
        else:
            counts[collection] = {"available": False, "records": 0}
    return counts
