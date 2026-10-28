import logging
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, chat, study_plan
from app.config import AUTO_TRAIN_ON_STARTUP
from app.models.knowledge_base import kb_for
from app.services.training import train_with_retries

log = logging.getLogger(__name__)

app = FastAPI(
    title="NAP ML Service",
    description="Custom knowledge-base QA service for the Nexus Application Portal",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(admin.router, prefix="/api", tags=["admin"])
app.include_router(study_plan.router, prefix="/api", tags=["study-plan"])


@app.on_event("startup")
async def _startup():
    # Only the deployment default tenant is trained at boot; any additional
    # tenant builds its own index on first chat (see ensure_training_async).
    default_kb = kb_for(None)
    if default_kb.is_trained():
        log.info(
            "loaded existing default index: %s chunks (trained %s)",
            default_kb.count(),
            default_kb.trained_at,
        )
        return

    if not AUTO_TRAIN_ON_STARTUP:
        log.warning(
            "no index found and AUTO_TRAIN_ON_STARTUP is off; "
            "the assistant will report that it is untrained"
        )
        return

    # The container filesystem is ephemeral, so a fresh deploy always starts
    # with an empty knowledge base. Rebuild in the background so the port is
    # accepting traffic (and the healthcheck can pass) while this runs.
    log.warning("no default knowledge base index found; training in the background")

    def _run():
        try:
            train_with_retries(None)
        except Exception:  # noqa: BLE001 - never kill the worker thread
            log.exception("background training crashed")

    threading.Thread(target=_run, name="auto-train-default", daemon=True).start()


@app.get("/api/health")
async def health():
    default_kb = kb_for(None)
    return {
        "status": "ok",
        "trained": default_kb.is_trained(),
        "chunks": default_kb.count(),
        "embedding_backend": default_kb.embedding.backend,
        "trained_at": default_kb.trained_at,
    }