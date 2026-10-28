import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = Path(os.getenv("ML_DATA_DIR", str(BASE_DIR / "data")))
CORPUS_DIR = DATA_DIR / "corpus"
INDEX_DIR = DATA_DIR / "indices"
# Per-tenant indices live one directory per tenant beneath this root; the
# deployment default tenant keeps using INDEX_DIR directly so an existing
# single-tenant index keeps loading without a rebuild.
TENANTS_DIR = INDEX_DIR / "tenants"
MODELS_DIR = Path(os.getenv("ML_MODELS_DIR", str(BASE_DIR / "models")))

# Tenant references that map to the deployment default knowledge base, so the
# startup trainer and the default tenant's chat requests share one index.
# TENANT_DEFAULT_CODE mirrors the backend's TENANT_DEFAULT_CODE (e.g. "demo");
# TENANT_DEFAULT_ID is the backend's default tenant id (TenantContext 1) used
# when no default code is configured.
TENANT_DEFAULT_CODE = os.getenv("TENANT_DEFAULT_CODE", "").strip().lower()
TENANT_DEFAULT_ID = os.getenv("TENANT_DEFAULT_ID", "1").strip().lower()

NAP_BASE_URL = os.getenv("NAP_BASE_URL", "http://localhost:8080").rstrip("/")

# Shared secret that lets this service select a tenant with an X-Tenant header
# when it fetches content from the backend. Must match INTERNAL_API_TOKEN (the
# backend's nap.tenancy.internal-token). When empty, the backend resolves every
# request by host and the fetched content belongs to the default tenant.
INTERNAL_API_TOKEN = os.getenv("INTERNAL_API_TOKEN", "").strip()
EMBEDDING_MODEL_NAME = os.getenv(
    "EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2"
)

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1600"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "160"))
TOP_K_DEFAULT = int(os.getenv("TOP_K_DEFAULT", "5"))
ANSWER_CHUNK_LIMIT = int(os.getenv("ANSWER_CHUNK_LIMIT", "1200"))
# How many passages a single reply may quote. Five reads as a data dump; three
# is enough to answer without padding the bubble with near-duplicates.
ANSWER_MAX_SOURCES = int(os.getenv("ANSWER_MAX_SOURCES", "3"))
# Absolute cosine floor. Retrieval otherwise keeps anything scoring above a
# fraction of the best hit, which let unrelated records (a student story for an
# admissions question) ride along in the answer.
MIN_HIT_SCORE = float(os.getenv("MIN_HIT_SCORE", "0.16"))
# A hit must mention what was actually asked. Cosine alone is misleading for
# short questions: "Do you offer nursing?" is one content word against a
# 679-term vocabulary, so even the correct nursing programme scores ~0.2 and
# reads as noise, while a stopword-heavy FAQ can score 0.22 on a question it
# has nothing to do with.
MIN_HIT_COVERAGE = float(os.getenv("MIN_HIT_COVERAGE", "0.5"))
# Bump when the chunk text format changes so a persisted index built by an older
# build is discarded instead of answering with the previous wording.
INDEX_SCHEMA_VERSION = int(os.getenv("INDEX_SCHEMA_VERSION", "3"))

DEFAULT_PORT = int(os.getenv("DEFAULT_PORT", "8000"))

# Shared secret required by the admin endpoints (train/sources). Left unset by
# default so a deployment that forgets to configure it fails closed with 503
# rather than exposing an unauthenticated retrain to the public internet.
ML_ADMIN_TOKEN = os.getenv("ML_ADMIN_TOKEN", "").strip()

# Build the index at boot when none is present. The container filesystem is
# ephemeral, so without this every redeploy brings up an empty knowledge base
# and the assistant replies that it has not been trained.
AUTO_TRAIN_ON_STARTUP = os.getenv("AUTO_TRAIN_ON_STARTUP", "true").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
AUTO_TRAIN_ATTEMPTS = int(os.getenv("AUTO_TRAIN_ATTEMPTS", "3"))
AUTO_TRAIN_BACKOFF_SECONDS = int(os.getenv("AUTO_TRAIN_BACKOFF_SECONDS", "10"))

# programs and site_settings are deliberately absent: both are also served by a
# dedicated fetcher below (/api/v1/programs and /api/v1/content/site-settings),
# and listing them here made every programme and setting index twice, so the
# assistant quoted the same record back to back.
CONTENT_COLLECTIONS = [
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
]

# Fallback display name used only when a tenant has not set ``portal_name`` in
# the CMS. Deliberately generic so the assistant never impersonates a specific
# university by default.
PORTAL_NAME = os.getenv("PORTAL_NAME", "our university")

# Public base URL of the site, used to append "read more" links to cited
# sources in chat answers. Left empty by default so deployments that don't want
# links (and the offline evaluation baseline, which diffs answer text) stay
# unchanged. Set to e.g. "https://portal.example.com" to enable links.
SITE_LINK_BASE = os.getenv("SITE_LINK_BASE", "").strip().rstrip("/")

# Where each cited collection's "read more" link points. Programmes have a
# per-record detail page (/programs/:id); the other collections link to their
# listing page because the source metadata carries no slug.
SOURCE_PATHS = {
    "programs": "/programs/{id}",
    "courses": "/programs",
    "news": "/news",
    "events": "/news",
    "student_stories": "/stories",
    "alumni": "/stories",
    "quick_links": "/quick-links",
}

# Optional contact overrides. Contact details normally come from the CMS
# (footer_email / footer_phone / footer_address in site-settings), which the
# assistant reads via app.services.contact. Set CONTACT_* only for deployments
# that keep contact details out of the database; when set they take precedence.
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "").strip()
CONTACT_PHONE = os.getenv("CONTACT_PHONE", "").strip()
CONTACT_WHATSAPP = os.getenv("CONTACT_WHATSAPP", "").strip()
CONTACT_ADDRESS = os.getenv("CONTACT_ADDRESS", "").strip()
CONTACT_HOURS = os.getenv("CONTACT_HOURS", "").strip()

for _dir in (DATA_DIR, CORPUS_DIR, INDEX_DIR, MODELS_DIR):
    _dir.mkdir(parents=True, exist_ok=True)