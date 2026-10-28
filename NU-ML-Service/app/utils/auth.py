"""Bearer-token guard for the ML service's admin endpoints.

`POST /api/train` rebuilds the whole index, and `GET /api/sources` fans out to
every CMS collection. Both used to be reachable by anyone who could reach the
service, which on Railway means anyone on the internet: a free CPU-exhaustion
lever pointed at a public university site.

The token is compared with `secrets.compare_digest` so a wrong guess does not
leak its length or prefix through response timing, and the endpoints fail
*closed* when no token is configured - a deployment that forgets
ML_ADMIN_TOKEN answers 503 rather than silently serving an open retrain.
"""

import secrets

from fastapi import HTTPException, Request

from app.config import ML_ADMIN_TOKEN

_HEADER = "authorization"
_PREFIX = "bearer "


def require_admin_token(request: Request) -> None:
    if not ML_ADMIN_TOKEN:
        raise HTTPException(
            status_code=503,
            detail=(
                "Admin endpoints are disabled because ML_ADMIN_TOKEN is not "
                "configured. Training still runs automatically at startup."
            ),
        )

    header = request.headers.get(_HEADER, "")
    if not header.lower().startswith(_PREFIX):
        raise HTTPException(status_code=401, detail="Admin token required.")

    presented = header[len(_PREFIX) :].strip()
    if not secrets.compare_digest(presented, ML_ADMIN_TOKEN):
        raise HTTPException(status_code=403, detail="Invalid admin token.")