from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

# ── Memory Node ────────────────────────────────────────────────────────────

class MemoryNode(BaseModel):
    user_id: str
    type: Literal["pattern", "habit", "anomaly", "milestone", "recurring"]
    content: str                        # human-readable financial fact
    tags: List[str] = []               # e.g. ['food', 'night', 'weekend']
    importance: float = 0.5            # 0.0 – 1.0, used for retrieval ranking
    frequency: int = 1                 # how many times this pattern was seen
    first_seen: datetime = Field(default_factory=datetime.utcnow)
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    related_expense_ids: List[str] = []

# ── Conversation ───────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ConversationSession(BaseModel):
    user_id: str
    session_id: str
    messages: List[ChatMessage] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# ── Request / Response schemas ─────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None   # pass existing session to continue conversation

class ChatResponse(BaseModel):
    reply: str
    session_id: str
    memories_used: List[str] = []      # for research transparency / debugging