from typing import Optional

import httpx

from app.config import INTERNAL_API_TOKEN, NAP_BASE_URL

_TIMEOUT = httpx.Timeout(30.0, connect=3.0)


def _headers(tenant: Optional[str] = None):
    """Forward the resolved tenant so the backend returns tenant-scoped content.

    The backend only honours ``X-Tenant`` from a caller that presents the shared
    internal token, so it is sent alongside when configured; otherwise tenant
    selection is ignored and the request resolves to the default tenant.
    """
    headers = {}
    if tenant:
        headers["X-Tenant"] = tenant
    if INTERNAL_API_TOKEN:
        headers["X-Internal-Token"] = INTERNAL_API_TOKEN
    return headers


def _get(path: str, tenant: Optional[str] = None):
    url = f"{NAP_BASE_URL}{path}"
    response = httpx.get(
        url, timeout=_TIMEOUT, headers=_headers(tenant), follow_redirects=True
    )
    response.raise_for_status()
    return response.json()


def fetch_collection(name: str, tenant: Optional[str] = None):
    return _get(f"/api/v1/content/{name}", tenant=tenant)


def fetch_all_collections(collections, tenant: Optional[str] = None):
    results = {}
    for name in collections:
        try:
            results[name] = fetch_collection(name, tenant=tenant)
        except Exception:
            results[name] = []
    return results


def fetch_programs(tenant: Optional[str] = None):
    try:
        return _get("/api/v1/programs", tenant=tenant)
    except Exception:
        return []


def fetch_schemes(tenant: Optional[str] = None):
    try:
        return _get("/api/v1/schemes", tenant=tenant)
    except Exception:
        return []


def fetch_site_settings(tenant: Optional[str] = None):
    try:
        return _get("/api/v1/content/site-settings", tenant=tenant)
    except Exception:
        return {}


def fetch_announcements(tenant: Optional[str] = None):
    try:
        return _get("/api/v1/announcements", tenant=tenant)
    except Exception:
        return []
