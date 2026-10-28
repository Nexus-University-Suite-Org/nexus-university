import json
import re
from typing import Dict, List

# Short names that should stay upper case in prose ("FAQ", "UGX", "PDF").
_ACRONYMS = {
    "id",
    "ids",
    "url",
    "urls",
    "uri",
    "pdf",
    "faq",
    "faqs",
    "ugx",
    "usd",
    "sms",
    "email",
    "gpa",
    "cv",
    "prn",
    "uce",
    "uace",
    "hkd",
}

# Keys that carry no meaning for a person asking a question. Keeping them made
# replies read like database rows ("category: Admissions / display Order: 2").
_DROP_KEYS = {
    "id",
    "createdAt",
    "updatedAt",
    "created_at",
    "updated_at",
    "deletedAt",
    "deleted_at",
    "status",
    "slug",
    "displayOrder",
    "display_order",
    "sortOrder",
    "sort_order",
    "order",
    "position",
    "category",
    "categories",
    "visible",
    "isVisible",
    "is_visible",
    "isActive",
    "is_active",
    "active",
    "createdBy",
    "updatedBy",
    "created_by",
    "updated_by",
    "entityId",
    "viewCount",
    "views",
    "password",
    "passwordHash",
    "token",
    "imageUrl",
    "image_url",
    "image",
    "thumbnail",
    "thumbnailUrl",
    "thumbnail_url",
    "bannerUrl",
    "banner_url",
    "coverImage",
    "cover_image",
    "featuredImage",
    "featured_image",
    "photo",
    "photoUrl",
    "photo_url",
    "logo",
    "fileUrl",
    "file_url",
    "documentUrl",
    "document_url",
    "attachment",
    "createdByName",
    "updatedByName",
}

# Presentation-only keys: they say how something looks, not what it is.
_VISUAL_KEYS = {
    "style",
    "target",
    "icon",
    "variant",
    "size",
    "className",
    "cssClass",
    "color",
    "theme",
    "imageUrl",
    "image_url",
    "thumbnail",
    "bannerUrl",
}

# Keys that read naturally as "label (destination)".
_LINK_KEYS = ("href", "url", "link", "linkUrl", "path", "slug")

_LABEL_KEYS = ("label", "name", "title", "text", "heading", "question")

_STRIP_KEY = re.compile(r"(\b(id|createdAt|updatedAt|created_at|updated_at)\b)", re.IGNORECASE)


def _to_text(value, key: str = "") -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return key if value else ""
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        parts = [
            _to_text(v, k)
            for k, v in value.items()
            if not re.fullmatch(_DROP_KEYS_re(), str(k))
        ]
        return ", ".join(p for p in parts if p)
    if isinstance(value, (list, tuple)):
        return "; ".join(p for p in (_to_text(v, key) for v in value) if p)
    return str(value).strip()


def _DROP_KEYS_re() -> str:
    return (
        "id|createdAt|updatedAt|created_at|updated_at|deletedAt|deleted_at|status|"
        "slug|displayOrder|display_order|sortOrder|sort_order|order|position|"
        "category|categories|visible|isVisible|is_visible|isActive|is_active|"
        "active|createdBy|updatedBy|created_by|updated_by|entityId|viewCount|views|"
        "password|passwordHash|token|image|imageUrl|image_url|thumbnail|"
        "thumbnailUrl|thumbnail_url|bannerUrl|banner_url|coverImage|cover_image|"
        "featuredImage|featured_image|photo|photoUrl|photo_url|logo|fileUrl|file_url|"
        "documentUrl|document_url|attachment|createdByName|updatedByName"
    )


_ISO_DATETIME_RE = re.compile(
    r"(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?"
)
_MONTHS = (
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
)


def _readable_dates(text: str) -> str:
    """Shorten ISO timestamps: 2026-10-30T08:58:55.529318 -> 30 October 2026."""

    def replace(match):
        year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
        if not 1 <= month <= 12:
            return match.group(0)
        return f"{day} {_MONTHS[month - 1]} {year}"

    return _ISO_DATETIME_RE.sub(replace, text)


def _label(key: str) -> str:
    """Turn a field name into readable prose: programName -> Program name."""
    spaced = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", str(key))
    spaced = spaced.replace("_", " ").replace("-", " ").strip()
    words = []
    for position, word in enumerate(spaced.split()):
        if word.lower() in _ACRONYMS:
            words.append(word.upper())
        elif word.isupper():
            words.append(word)
        elif position == 0:
            words.append(word[0].upper() + word[1:].lower())
        else:
            words.append(word.lower())
    return " ".join(words)


def _maybe_json(value):
    """Parse a value that is JSON held in a string.

    Site settings store arrays as text, so cta_buttons arrives as
    '[{"label": "Apply Now", ...}]' and used to be quoted verbatim.
    """
    if not isinstance(value, str):
        return value
    stripped = value.strip()
    if not stripped or stripped[0] not in "[{":
        return value
    try:
        parsed = json.loads(stripped)
    except (ValueError, TypeError):
        return value
    return parsed if isinstance(parsed, (list, dict)) else value


def _scalar(value) -> str:
    """Render a leaf value, dropping booleans and blanks."""
    if value is None or isinstance(value, bool):
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    text = str(value).strip()
    return _readable_dates(text) if _ISO_DATETIME_RE.search(text) else text


def _render_value(value) -> str:
    """Render a value as readable text instead of raw JSON.

    cta_buttons arrives as
    [{"label": "Apply Now", "href": "/admissions/how-to-apply", ...}]
    which used to reach the user verbatim. It now reads
    "Apply Now (/admissions/how-to-apply), Donate (/donate)".
    """
    value = _maybe_json(value)
    if isinstance(value, dict):
        label = ""
        for key in _LABEL_KEYS:
            if value.get(key):
                label = _scalar(value[key])
                break
        target = ""
        for key in _LINK_KEYS:
            if value.get(key):
                target = _scalar(value[key])
                break
        if label and target:
            return f"{label} ({target})"
        if label:
            return label
        return ", ".join(
            part
            for part in (
                _render_value(v) for k, v in value.items() if str(k).lower() not in _VISUAL_KEYS
            )
            if part
        )
    if isinstance(value, (list, tuple)):
        return ", ".join(part for part in (_render_value(v) for v in value) if part)
    return _scalar(value)


def _iter_fields(record):
    if isinstance(record, dict):
        for key, value in record.items():
            if str(key).lower() in {k.lower() for k in _DROP_KEYS} or re.match(_STRIP_KEY, str(key)):
                continue
            text = _render_value(value)
            if text:
                yield (str(key), text)
    elif isinstance(record, (list, tuple)):
        for item in record:
            for key, text in _iter_fields(item):
                yield (f"{key}", text)


def _pick_title(record) -> str:
    if isinstance(record, dict):
        # Order matters: the first non-empty key wins, so a record that has both a
        # "name" and a more specific "schemeName" still gets a readable heading.
        for key in (
            "title",
            "schemeName",
            "programName",
            "question",
            "newsTitle",
            "eventTitle",
            "courseTitle",
            "heading",
            "pageKey",
            "fullName",
            "name",
            "settingKey",
        ):
            if record.get(key):
                return str(record[key])
    return ""


def chunk_text(text: str, chunk_size: int, overlap: int) -> List[str]:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= chunk_size:
        return [text] if text else []
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        if end == len(text):
            break
        start = max(start + chunk_size - overlap, start + 1)
    return chunks


def _join_sentences(fields) -> str:
    """Render fields as sentences: "Level: Undergraduate. Duration: 4 years." """
    parts = []
    for key, value in fields:
        label = _label(key)
        value = value.rstrip(".")
        parts.append(f"{label}: {value}." if label else f"{value}.")
    return " ".join(parts)


def _faq_fields(record):
    """An FAQ already reads as prose, so only the answer is kept as the body.

    The question is the title, and category/displayOrder are noise, which used to
    produce "category: Admissions / question: ... / answer: ... / display Order: 2".
    """
    answer = ""
    for key in ("answer", "response", "body", "content", "description"):
        value = _render_value(record.get(key)) if isinstance(record, dict) else ""
        if value:
            answer = value
            break
    if not answer:
        return []
    return [("answer", answer.rstrip("."))]


# The field that carries the actual prose for each collection, so a reply leads
# with a sentence instead of "Excerpt: ... / Content: ...".
_LEAD_FIELDS = {
    "news": ("content", "excerpt", "summary", "body"),
    "events": ("description", "content", "details", "body"),
    "student_stories": ("content", "story", "quote", "body"),
    "legal_pages": ("content", "body", "text"),
    "courses": ("description", "summary", "content"),
    "faculty": ("bio", "biography", "profile", "about"),
    "partners": ("description", "about", "content"),
    "alumni": ("bio", "story", "testimonial", "content"),
    "scholarships": ("description", "details", "criteria", "body"),
    "page_sections": ("content", "body", "text"),
    "programs": ("description", "summary", "about"),
    "schemes": ("description", "details", "instructions"),
}

# Short factual fields worth keeping alongside the prose.
_EXTRA_FIELDS = {
    "programs": ("code", "type", "level", "duration", "faculty", "studyMode", "credits"),
    "courses": ("code", "credits", "level", "department"),
    "news": ("publishedAt", "date", "tag"),
    "events": ("startDate", "date", "location", "venue"),
    "schemes": ("code", "level", "duration"),
    "scholarships": ("amount", "deadline", "eligibility"),
    "faculty": ("title", "department", "role"),
}

_MAX_EXTRA = 4
_MAX_EXTRA_LEN = 90


def _find_key(record, wanted: str):
    """Find a field by its trailing name.

    Records prefix their keys with the entity ("programDescription",
    "programCode"), so an exact match would never hit.
    """
    target = wanted.lower()
    for key in record:
        lowered = str(key).lower()
        if lowered == target or lowered.endswith(target):
            return key
    return None


def _lead_prose(record, collection: str) -> str:
    if not isinstance(record, dict):
        return ""
    for wanted in _LEAD_FIELDS.get(collection, ()):
        key = _find_key(record, wanted)
        if key is None:
            continue
        value = _render_value(record.get(key))
        if value:
            return value.strip().rstrip(".")
    return ""


def _extra_fields(record, collection: str):
    if not isinstance(record, dict):
        return []
    wanted = _EXTRA_FIELDS.get(collection)
    if not wanted:
        return []
    extras = []
    for name in wanted:
        key = _find_key(record, name)
        if key is None:
            continue
        text = _render_value(record.get(key))
        if text and len(text) <= _MAX_EXTRA_LEN:
            extras.append((str(key), text))
        if len(extras) >= _MAX_EXTRA:
            break
    return extras


def _record_text(record, collection: str) -> str:
    if collection == "faqs":
        fields = _faq_fields(record)
        if not fields:
            return ""
        return fields[0][1].rstrip(".") + "."

    if collection == "quick_links" and isinstance(record, dict):
        label = _lead_prose(record, collection) or _render_value(
            record.get("label") or record.get("title") or record.get("name")
        )
        target = ""
        for key in _LINK_KEYS:
            if record.get(key):
                target = _scalar(record[key])
                break
        if label and target:
            return f"{label} ({target})."
        if label:
            return f"{label}."

    prose = _lead_prose(record, collection)
    extras = _extra_fields(record, collection)

    if prose:
        text = prose.rstrip(".") + "."
        if extras:
            text += " " + _join_sentences(extras)
        return text

    fields = [
        (k, v)
        for k, v in _iter_fields(record)
        if _label(k).lower() not in ("title", "name")
    ]
    if not fields:
        return ""
    return _join_sentences(fields)


def record_to_chunks(
    record,
    collection: str,
    index: int,
    chunk_size: int,
    overlap: int,
) -> List[Dict]:
    title = _pick_title(record) or f"{collection} #{index + 1}"
    body = _record_text(record, collection)
    if not body:
        return []

    # The heading is indexed alongside the body so a question matches the record
    # it asks about, but only the body is shown. Keeping them apart stopped
    # "How do I apply?" from matching a cta_buttons row over the admissions FAQ,
    # because that row was the only indexed text containing the word "apply".
    searchable = f"{title}. {body}" if title else body

    chunks = []
    for chunk_idx, piece in enumerate(chunk_text(searchable, chunk_size, overlap)):
        chunks.append(
            {
                "id": f"{collection}:{index}:{chunk_idx}",
                "text": piece,
                "metadata": {
                    "collection": collection,
                    "title": title,
                    "entity_id": record.get("id") if isinstance(record, dict) else None,
                    "body": body,
                },
            }
        )
    return chunks