"""Contact details the assistant quotes for "who can I contact?".

The site footer and contact page read ``footer_email``, ``footer_phone``,
``footer_whatsapp_cta`` and ``footer_address`` from
``/api/v1/content/site-settings``. The assistant reads the same endpoint (via
:mod:`app.services.settings`) so the chat can never contradict the rendered
page, and so adding the keys in the CMS updates the bot without a retrain.

No fallbacks are invented: a field that is not configured is simply omitted, and
when nothing is configured the assistant says so rather than quoting placeholder
contact details.

Precedence, highest first:
  1. ``CONTACT_*`` environment variables (deployments that keep contact info
     out of the database).
  2. The ``footer_*`` site settings.
"""

from typing import Dict, Optional

from app import config
from app.services import settings as site_settings

_BLANK = {"email": "", "phone": "", "whatsapp": "", "address": "", "hours": ""}


def _compose(settings: Dict[str, str]) -> Dict[str, str]:
    details = dict(_BLANK)
    phone = settings.get("footer_phone", "").strip()
    if phone:
        details["phone"] = phone
        details["whatsapp"] = phone
    if settings.get("footer_email", "").strip():
        details["email"] = settings["footer_email"].strip()
    if settings.get("footer_address", "").strip():
        details["address"] = settings["footer_address"].strip()
    if settings.get("contact_hours", "").strip():
        details["hours"] = settings["contact_hours"].strip()

    # Env overrides win over the CMS.
    if config.CONTACT_EMAIL:
        details["email"] = config.CONTACT_EMAIL
    if config.CONTACT_PHONE:
        details["phone"] = config.CONTACT_PHONE
        details["whatsapp"] = config.CONTACT_PHONE
    if config.CONTACT_WHATSAPP:
        details["whatsapp"] = config.CONTACT_WHATSAPP
    if config.CONTACT_ADDRESS:
        details["address"] = config.CONTACT_ADDRESS
    if config.CONTACT_HOURS:
        details["hours"] = config.CONTACT_HOURS
    return details


def prime(settings, tenant: Optional[str] = None) -> Dict[str, str]:
    """Warm the settings cache from a payload the caller already fetched."""
    return _compose(site_settings.prime(settings, tenant=tenant))


def get_contact_details(force: bool = False, tenant: Optional[str] = None) -> Dict[str, str]:
    return _compose(site_settings.get_settings(tenant=tenant, force=force))
