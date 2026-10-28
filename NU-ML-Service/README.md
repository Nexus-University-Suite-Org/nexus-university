# NAP-ML-Service

Custom retrieval-based QA service ("ML") for the Nexus Application Portal (NAP).
It **learns** from NAP's live CMS content (programs, schemes, site settings, news,
events, FAQs, courses, faculty, scholarships, student stories...), indexes the
content as embeddings in a vector store, and answers admissions questions with
retrieval-augmented generation — no external API quota, fully local.

## Components

| Path | Purpose |
|------|---------|
| `app/` | FastAPI service source |
| `app/api/chat.py` | `POST /api/chat` — streaming chat (OpenAI-compatible SSE) |
| `app/api/admin.py` | `POST /api/train`, `GET /api/status`, `GET /api/sources` |
| `app/models/` | Embedding model, FAISS/numpy vector store, template generator |
| `app/services/` | Ingestion (fetch from NAP APIs), retrieval, training |
| `app/utils/` | NAP HTTP client + content chunking |
| `data/corpus/` | Raw extracted content (cached) |
| `data/indices/` | FAISS index + chunk metadata (model artifacts; gitignored) |

## Quick start

```powershell
# 1. create venv + deps
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt

# 2. configure (defaults hit localhost:8080 — the NAP backend)
Copy-Item .env.example .env   # optional overrides

# 3. run
.\.venv\Scripts\uvicorn app.main:app --port 8000
```

By default the service uses a zero-dependency TF-IDF fallback so it starts even
when `sentence-transformers`/`faiss` aren't installed. To use the real sentence
embedding model, `pip install sentence-transformers faiss-cpu` (see the `Run` todo).

## Flow

1. **Train** (`POST /api/train`) → pulls all CMS collections, programs & schemes
   from `nap.backend`, chunks them, embeds, and builds a FAISS index.
2. **Chat** (`POST /api/chat`) → embeds the user's last message, retrieves top-k
   relevant chunks, and streams a template-generated answer with source citations.

At startup the service loads the index from `ML_DATA_DIR`. If none exists it trains
in the background with retries (`AUTO_TRAIN_ON_STARTUP`), so a fresh deploy becomes
usable without anyone clicking a button. A failed fetch never overwrites a working
index — `train()` raises rather than rebuilding from an empty chunk list.

### Source links

Set `SITE_LINK_BASE` to the public site origin (e.g. `https://portal.example.com`)
and answers append a `[Read more](…)` link to each cited source. Programmes
deep-link to `/programs/:id`; collections without a per-record route
(`news`, `events`, `student_stories`, `alumni`, `quick_links`, `courses`) link to
their listing page, since source metadata carries no slug. Left unset, no links
are emitted — which also keeps the offline evaluation baseline stable.

### Persisting the index

The built index lives under `ML_DATA_DIR` (default `./data`) and `.gitignore`d, so it
is not committed. **Mount a volume and point `ML_DATA_DIR` at it**, or every deploy
starts empty and rebuilds from scratch:

```bash
railway volume add --mount-path /data
railway variable set ML_DATA_DIR=/data
```

### Admin authentication

`POST /api/train` and `GET /api/sources` require `Authorization: Bearer $ML_ADMIN_TOKEN`.
The endpoints fail closed with `503` when `ML_ADMIN_TOKEN` is unset, so a forgotten
variable cannot silently expose an open retrain endpoint. The token must match
`ML_SERVICE_ADMIN_TOKEN` on the NAP-Backend service, which forwards it and requires
`ROLE_ADMIN` on `/api/v1/chat/status|sources|train`. `GET /api/status` and
`GET /api/health` stay public for monitoring and are read-only.

## Wiring into NAP

The Java backend (`ChatController` → `ChatService` → `NapMlClient`) no longer calls
Gemini directly; it proxies `/api/v1/chat` (SSE) to this service and exposes
`/api/v1/chat/status|sources|train` for admin. Point `nap.ml-service.base-url`
at this service (default `http://localhost:8000`).

### Dev mode note
With the Vite dev server, `GET /api/health`/`/api/status` time out if NAP-Backend
isn't running (it probes collections). Run the NAP Spring Boot backend
(`mvnw spring-boot:run`) alongside this service, or only call `/api/health`
directly against this service.
