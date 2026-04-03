from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from typing import List, Optional
from pydantic import BaseModel

from core.auth import get_current_user
from services.chat_service import stream_chat_response, get_session_history, get_all_sessions
from services.memory_service import extract_and_store_memories, retrieve_relevant_memories

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


# ── POST /chat/message ─────────────────────────────────────────────────────
@router.post("/message")
async def chat_message(
    body: ChatRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Main chat endpoint — streams the LLM response token by token.
    Frontend should use fetch() with ReadableStream or EventSource.
    """
    async def event_stream():
        async for chunk in stream_chat_response(user_id, body.message, body.session_id):
            yield chunk

    return StreamingResponse(event_stream(), media_type="text/plain")


# ── GET /chat/sessions ─────────────────────────────────────────────────────
@router.get("/sessions")
async def list_sessions(user_id: str = Depends(get_current_user)):
    """Returns all chat sessions for the user (for sidebar history UI)."""
    sessions = await get_all_sessions(user_id)
    return [
        {
            "session_id": s["session_id"],
            "created_at": s.get("created_at"),
            "updated_at": s.get("updated_at"),
            "last_message": s.get("messages", [{}])[-1].get("content", "")[:80] if s.get("messages") else "",
        }
        for s in sessions
    ]


# ── GET /chat/sessions/{session_id} ───────────────────────────────────────
@router.get("/sessions/{session_id}")
async def get_session(session_id: str, user_id: str = Depends(get_current_user)):
    """Returns full message history for a session."""
    messages = await get_session_history(user_id, session_id)
    return {"session_id": session_id, "messages": messages}


# ── POST /chat/refresh-memory ──────────────────────────────────────────────
@router.post("/refresh-memory")
async def refresh_memory(user_id: str = Depends(get_current_user)):
    """
    Manually trigger memory extraction from latest expenses.
    Call this after the user adds new expenses.
    """
    count = await extract_and_store_memories(user_id)
    return {"status": "ok", "memories_written": count}


# ── GET /chat/memories ─────────────────────────────────────────────────────
@router.get("/memories")
async def get_memories(user_id: str = Depends(get_current_user)):
    """
    Debug/research endpoint — returns all memory nodes for the user.
    Useful for your research paper evaluation and demo.
    """
    from core.database import get_db
    db = get_db()
    memories = await db["memory_nodes"].find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("importance", -1).to_list(length=100)
    return {"memories": memories, "count": len(memories)}