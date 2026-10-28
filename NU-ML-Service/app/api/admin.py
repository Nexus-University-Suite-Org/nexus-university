from typing import Optional

import anyio

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from app.models.knowledge_base import tenant_key
from app.services.training import available_sources, train, training_status
from app.utils.auth import require_admin_token

router = APIRouter()


class TrainResponse(BaseModel):
    tenant: str
    trained_at: str
    chunks: int
    stats: dict


def _tenant(header: Optional[str]) -> Optional[str]:
    return (header or "").strip() or None


@router.get("/status")
async def status(x_tenant: Optional[str] = Header(default=None)):
    tenant = _tenant(x_tenant)
    current = training_status(tenant)
    return {
        "backend": "nap-ml-service",
        "version": "1.0.0",
        "tenant": current["tenant"],
        "trained": current["trained"],
        "training": current["training"],
        "trained_at": current["trained_at"],
        "chunks": current["chunks"],
        "embedding_backend": current["embedding_backend"],
        "embedding_model": current["embedding_model"],
        "store_backend": current["store_backend"],
        "stats": current["stats"],
    }


@router.post("/train", response_model=TrainResponse)
async def train_endpoint(
    _: None = Depends(require_admin_token),
    x_tenant: Optional[str] = Header(default=None),
):
    tenant = _tenant(x_tenant)
    try:
        result = await anyio.to_thread.run_sync(train, tenant)
        return TrainResponse(
            tenant=tenant_key(tenant),
            trained_at=result.get("last_training_at")
            or result.get("trained_at")
            or "",
            chunks=result.get("chunks", 0),
            stats=result.get("stats", {}),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/sources")
async def sources(
    _: None = Depends(require_admin_token),
    x_tenant: Optional[str] = Header(default=None),
):
    tenant = _tenant(x_tenant)
    found = await anyio.to_thread.run_sync(available_sources, tenant)
    collections = training_status(tenant).get("stats", {}).get("collections") or {}
    return {"tenant": tenant_key(tenant), "available": found, "indexed": collections}
