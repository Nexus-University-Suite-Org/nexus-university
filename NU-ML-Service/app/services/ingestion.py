import re
from typing import Dict, List, Optional

from app.config import (
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    CONTENT_COLLECTIONS,
)
from app.services import contact
from app.utils import chunking
from app.utils import nap_client


def _records_from_payload(payload):
    if isinstance(payload, dict):
        if "settingKey" in payload and "settingValue" in payload:
            return [payload]
        for value in payload.values():
            if isinstance(value, list):
                return value
        return [payload]
    if isinstance(payload, list):
        return payload
    return []


# Interface configuration rather than information. "cta_buttons: Apply Now
# (/admissions/how-to-apply)" outranked the admissions FAQ for "How do I apply?",
# because navigation is dense with the same words a question uses.
_UI_SETTING_RE = re.compile(
    r"(nav|cta|footer|social|menu|breadcrumb|cookie|consent|analytics|seo|meta_|"
    r"logo|favicon|icon|banner|pill|badge|social_link|quick_action|"
    r"btn|button|heading|sub_?heading|tagline|subtitle|hero|donate|donation|"
    r"success_story|story_|testimonial|stats?|stat_|carousel|slide|quote|"
    r"author|outcome|what_we_teach)",
    re.IGNORECASE,
)

# Contact details live under footer_* keys, which the interface filter above
# would otherwise drop, and they are the only thing that answers "where are
# you" or "how do I reach you". Kept deliberately.
_CONTACT_SETTING_RE = re.compile(
    r"(e?mail|phone|mobile|tel\b|telephone|whatsapp|address|contact)",
    re.IGNORECASE,
)

# Chat assistant configuration (persona, welcome text, quick topics, toggles).
# It configures the assistant rather than describing the university, so it must
# never be retrieved and quoted back as an answer.
_CHAT_CONFIG_SETTING_RE = re.compile(r"^chat_", re.IGNORECASE)


def _site_settings_chunks(settings: Dict) -> List[Dict]:
    if isinstance(settings, dict):
        pairs = [
            {
                "settingKey": str(key),
                "settingValue": str(value) if value is not None else "",
            }
            for key, value in settings.items()
            if str(value).strip()
        ]
    elif isinstance(settings, list):
        pairs = [
            {
                "settingKey": str(item.get("settingKey") or item.get("key") or "setting"),
                "settingValue": str(item.get("settingValue") or item.get("value") or ""),
            }
            for item in settings
            if isinstance(item, dict)
        ]
    else:
        pairs = []

    chunks = []
    seen = set()
    for idx, pair in enumerate(pairs):
        key = pair["settingKey"]
        if _CHAT_CONFIG_SETTING_RE.search(str(key)):
            continue
        if _UI_SETTING_RE.search(str(key)) and not _CONTACT_SETTING_RE.search(str(key)):
            continue
        value = chunking._render_value(pair["settingValue"])
        if not value:
            continue
        # The same setting is served by two endpoints and can arrive twice; keep
        # one copy so a reply never quotes it back to back.
        fingerprint = value.strip().lower()
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        label = chunking._label(key)
        text = f"{label}: {value}"
        chunked = chunking.chunk_text(text, CHUNK_SIZE, CHUNK_OVERLAP)
        for sub_idx, piece in enumerate(chunked):
            chunks.append(
                {
                    "id": f"site_settings:{idx}:{sub_idx}",
                    "text": piece,
                    "metadata": {
                        "collection": "site_settings",
                        "title": label,
                        "entity_id": key,
                        "body": text,
                    },
                }
            )
    return chunks


def _program_chunks(program: Dict, index: int, source: str) -> List[Dict]:
    title = (
        program.get("programName")
        or program.get("name")
        or program.get("title")
        or f"{source} #{index + 1}"
    )
    record = dict(program)
    record["programName"] = title

    full = chunking._record_text(record, source)
    if not full:
        return []

    # The programme name is searched over but kept out of the quoted body, the
    # same split used for every other collection, so a reply reads
    # "**BSc Nursing Science** / Four-year degree..." rather than repeating the
    # name inside the sentence.
    searchable = f"{title}. {full}"

    chunks = []
    for sub_idx, piece in enumerate(
        chunking.chunk_text(searchable, CHUNK_SIZE, CHUNK_OVERLAP)
    ):
        chunks.append(
            {
                "id": f"{source}:{index}:{sub_idx}",
                "text": piece,
                "metadata": {
                    "collection": source,
                    "title": str(title),
                    "entity_id": program.get("id"),
                    "body": full,
                },
            }
        )
    return chunks


def extract_all_chunks(tenant: Optional[str] = None) -> List[Dict]:
    chunks: List[Dict] = []

    collections = nap_client.fetch_all_collections(CONTENT_COLLECTIONS, tenant=tenant)
    for collection, payload in collections.items():
        records = _records_from_payload(payload)
        for idx, record in enumerate(records):
            chunks.extend(
                chunking.record_to_chunks(
                    record, collection, idx, CHUNK_SIZE, CHUNK_OVERLAP
                )
            )

    settings = nap_client.fetch_site_settings(tenant=tenant)
    # Warm the contact cache from the settings we already have, so the first
    # "who can I contact?" does not pay for its own fetch.
    contact.prime(settings, tenant=tenant)
    chunks.extend(_site_settings_chunks(settings))

    programs = nap_client.fetch_programs(tenant=tenant)
    for idx, program in enumerate(programs):
        chunks.extend(_program_chunks(program, idx, "programs"))

    schemes = nap_client.fetch_schemes(tenant=tenant)
    for idx, scheme in enumerate(schemes):
        chunks.extend(
            chunking.record_to_chunks(scheme, "schemes", idx, CHUNK_SIZE, CHUNK_OVERLAP)
        )

    return chunks
