"""
Groq Chat Service
=================
Handles:
  - Building the prompt from retrieved memories (NOT raw data)
  - Multi-turn conversation history injection
  - Streaming responses from Groq (Llama 3.1 70B)
  - Persisting conversation sessions to MongoDB
"""

import uuid
from datetime import datetime
from typing import AsyncGenerator, List, Optional

from groq import AsyncGroq

from core.config import settings
from core.database import get_db
from services.memory_service import extract_and_store_memories, retrieve_relevant_memories

groq_client = AsyncGroq(api_key=settings.groq_api_key)

SYSTEM_PROMPT = """You are FinPal, a sharp and empathetic personal finance assistant.

You have access to structured memory about the user's real spending behavior.
These memories were extracted from their actual expense history — treat them as ground truth.

Rules:
- Be specific and personal. Reference actual numbers and patterns from the memory context.
- Never make up figures not present in the memory.
- Be concise but insightful. No generic advice like "spend less".
- If you notice a worrying pattern, flag it clearly but kindly.
- When relevant, suggest one concrete actionable step.
- Respond in a conversational, friendly tone — not like a bank statement.
"""


async def get_or_create_session(user_id: str, session_id: Optional[str]) -> dict:
    db = get_db()
    if session_id:
        session = await db["chat_sessions"].find_one({"session_id": session_id, "user_id": user_id})
        if session:
            return session

    new_session = {
        "user_id": user_id,
        "session_id": str(uuid.uuid4()),
        "messages": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    await db["chat_sessions"].insert_one(new_session)
    return new_session


async def append_message_to_session(session_id: str, role: str, content: str):
    db = get_db()
    await db["chat_sessions"].update_one(
        {"session_id": session_id},
        {
            "$push": {"messages": {"role": role, "content": content, "timestamp": datetime.utcnow()}},
            "$set": {"updated_at": datetime.utcnow()},
        },
    )


async def stream_chat_response(
    user_id: str,
    user_message: str,
    session_id: Optional[str] = None,
) -> AsyncGenerator[str, None]:

    # Step 1 — refresh memories
    await extract_and_store_memories(user_id)

    # Step 2 — retrieve relevant memories
    memories = await retrieve_relevant_memories(user_id, user_message, top_k=6)
    memory_contents = [m["content"] for m in memories]

    # Step 3 — session + history
    session = await get_or_create_session(user_id, session_id)
    sid = session["session_id"]

    if memory_contents:
        memory_block = "## What I know about your finances:\n" + "\n".join(
            f"- {c}" for c in memory_contents
        )
    else:
        memory_block = "## No financial memory found yet. Ask the user to add some expenses first."

    groq_messages = [
        {
            "role": "system",
            "content": f"{SYSTEM_PROMPT}\n\n{memory_block}"
        }
    ]

    history = session.get("messages", [])[-10:]
    for msg in history:
        groq_messages.append({"role": msg["role"], "content": msg["content"]})

    groq_messages.append({"role": "user", "content": user_message})

    # Persist user message
    await append_message_to_session(sid, "user", user_message)

    # Step 4 — FIXED STREAMING LOGIC
    full_reply = ""

    stream = await groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=groq_messages,
        max_tokens=1024,
        temperature=0.7,
        stream=True,  # 🔥 important
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content or ""
        if delta:
            full_reply += delta
            yield delta

    # Step 5 — persist response
    await append_message_to_session(sid, "assistant", full_reply)

    yield f"\n\n__SESSION_ID__{sid}__MEMORIES_USED__{len(memory_contents)}__"


async def get_session_history(user_id: str, session_id: str) -> List[dict]:
    db = get_db()
    session = await db["chat_sessions"].find_one({"session_id": session_id, "user_id": user_id})
    if not session:
        return []
    return session.get("messages", [])


async def get_all_sessions(user_id: str) -> List[dict]:
    db = get_db()
    sessions = await db["chat_sessions"].find(
        {"user_id": user_id},
        {"session_id": 1, "created_at": 1, "updated_at": 1, "messages": {"$slice": -1}}
    ).sort("updated_at", -1).to_list(length=20)
    return sessions