import json
from typing import List, Optional

import anyio
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.config import TOP_K_DEFAULT
from app.models.generator import (
    PORTAL_FALLBACK,
    build_answer,
    is_conversational,
    quoted_sources,
)
from app.models.knowledge_base import kb_for
from app.services import settings as site_settings
from app.services.retrieval import retrieve
from app.services.training import ensure_training_async

router = APIRouter()


class ChatMessage(BaseModel):
    role: str = Field(default="user")
    content: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(default_factory=list)


def _sse_chunk(text: str) -> str:
    delta = json.dumps(text, ensure_ascii=False)
    return f"data: {{\"choices\":[{{\"delta\":{{\"content\":{delta}}}}}]}}\n\n"


def _sse_sources(sources) -> str:
    return f"data: {json.dumps({'sources': sources}, ensure_ascii=False)}\n\n"


def _stream_answer(query: str, hits, tenant: Optional[str] = None):
    portal_name = site_settings.portal_name(tenant)
    fallback = site_settings.text("chat_fallback_message", PORTAL_FALLBACK, tenant=tenant)
    no_answer = site_settings.text("chat_no_answer_message", fallback, tenant=tenant)

    answer = build_answer(
        query,
        hits,
        portal_name=portal_name,
        fallback=fallback,
        no_answer=no_answer,
        tenant=tenant,
    )

    paragraph = ""
    for char in answer:
        paragraph += char
        if char == "\n":
            yield _sse_chunk(paragraph)
            paragraph = ""
    if paragraph:
        yield _sse_chunk(paragraph)

    # Only the records the reply actually quoted, so the panel under the answer
    # cannot list a source that was filtered out as irrelevant.
    sources = quoted_sources(
        query,
        hits,
        portal_name=portal_name,
        fallback=fallback,
        no_answer=no_answer,
        tenant=tenant,
    )
    if sources:
        yield _sse_sources(sources)
    yield "data: [DONE]\n\n"


@router.post("/chat")
async def chat(request: ChatRequest, x_tenant: Optional[str] = Header(default=None)):
    if len(request.messages) > 50:
        raise HTTPException(status_code=400, detail="Too many messages in conversation.")

    user_messages = [m for m in request.messages if m.role == "user"]
    if not user_messages:
        raise HTTPException(status_code=400, detail="A user message is required.")

    tenant = (x_tenant or "").strip() or None
    query = user_messages[-1].content

    if not site_settings.is_chat_enabled(tenant):
        return _sse_message(
            "The assistant is currently unavailable. Please try again later or use the contact page."
        )

    if not kb_for(tenant).is_trained():
        # A tenant whose index has not been built yet heals itself: the first
        # visitor triggers a background build for that tenant only, so a new
        # university never needs an operator to prime its knowledge base.
        started = ensure_training_async(tenant)
        return _sse_unavailable(tenant, started)

    # Small talk and messages with no topical words are answered from the canned
    # intents; running retrieval for them only risks attaching unrelated records.
    if is_conversational(query):
        hits = []
    else:
        hits = await anyio.to_thread.run_sync(retrieve, query, TOP_K_DEFAULT, tenant)
    return _sse_response(query, hits, tenant)


def _sse_message(message: str):
    from starlette.responses import StreamingResponse

    def generator():
        yield _sse_chunk(message)
        yield "data: [DONE]\n\n"

    return StreamingResponse(generator(), media_type="text/event-stream")


def _sse_unavailable(tenant: Optional[str] = None, training: bool = False):
    portal_name = site_settings.portal_name(tenant)
    if training:
        return _sse_message(
            f"I'm just getting set up with {portal_name}'s information. Please "
            "ask me again in a moment."
        )
    return _sse_message(
        "The knowledge base hasn't been trained yet. An administrator needs to run "
        f"the training step so I can answer questions about {portal_name}."
    )


def _sse_response(query: str, hits, tenant: Optional[str] = None):
    from starlette.responses import StreamingResponse

    return StreamingResponse(
        _stream_answer(query, hits, tenant),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
