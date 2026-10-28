"""Tenant site settings consumed by the assistant.

The public site renders branding, contact details and assistant copy from
``/api/v1/content/site-settings``. The assistant reads exactly the same endpoint
so it can never contradict the rendered page, and so editing a value in the
admin updates the bot without a retrain.

Every value is resolved per tenant: callers pass the tenant resolved from the
incoming request (``X-Tenant``) and the results are cached separately. When no
tenant is supplied the deployment default (tenant 1) is used.

Nothing is invented here. A key that is not configured returns an empty string
so the caller can decide on a sensible default rather than quoting a stranger's
details.
"""

from __future__ import annotations

import threading
import time
from typing import Dict, Optional

from app import config
from app.utils import nap_client

_CACHE_TTL = 300.0
_lock = threading.Lock()
_cache: Dict[str, "tuple[float, Dict[str, str]]"] = {}


def _normalise(settings) -> Dict[str, str]:
    """Accept either the map or the list shape the CMS can return."""
    if isinstance(settings, list):
        return {
            str(item.get("settingKey") or item.get("key") or ""): str(
                item.get("settingValue") or item.get("value") or ""
            )
            for item in settings
            if isinstance(item, dict)
        }
    if isinstance(settings, dict):
        return {str(k): str(v) for k, v in settings.items()}
    return {}


def _cache_key(tenant: Optional[str]) -> str:
    return (tenant or "").strip()


def get_settings(tenant: Optional[str] = None, force: bool = False) -> Dict[str, str]:
    key = _cache_key(tenant)
    now = time.monotonic()
    with _lock:
        entry = _cache.get(key)
        if entry and not force and (now - entry[0]) < _CACHE_TTL:
            return entry[1]

    data = _normalise(nap_client.fetch_site_settings(tenant=tenant or None))
    with _lock:
        _cache[key] = (time.monotonic(), data)
    return data


def prime(settings, tenant: Optional[str] = None) -> Dict[str, str]:
    """Warm the cache from settings the caller already fetched."""
    key = _cache_key(tenant)
    data = _normalise(settings)
    with _lock:
        _cache[key] = (time.monotonic(), data)
    return data


def text(key: str, default: str = "", tenant: Optional[str] = None) -> str:
    value = (get_settings(tenant).get(key) or "").strip()
    return value or default


def portal_name(tenant: Optional[str] = None) -> str:
    return text("portal_name", config.PORTAL_NAME, tenant=tenant)


def is_chat_enabled(tenant: Optional[str] = None) -> bool:
    raw = (get_settings(tenant).get("chat_enabled", "true") or "true").strip().lower()
    return raw not in {"false", "0", "no", "off"}
