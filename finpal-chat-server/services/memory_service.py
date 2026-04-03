"""
Memory Extractor Service
========================
This is the core research contribution of the system.

Instead of dumping raw expense data into the LLM context (naive approach),
we extract structured MemoryNodes that represent:
  - Spending PATTERNS  (category-level habits)
  - Behavioral HABITS  (time-of-day, day-of-week patterns)
  - ANOMALIES          (statistical outliers)
  - MILESTONES         (budget hits, high-spend months)
  - RECURRING items    (regular expenses like subscriptions)

These nodes are stored persistently and retrieved selectively based on
query relevance — not blindly passed to the LLM.
"""

from datetime import datetime, timedelta
from typing import List
from bson import ObjectId
import math

from core.database import get_db
from models.schemas import MemoryNode


async def extract_and_store_memories(user_id: str) -> int:
    """
    Run the full memory extraction pipeline for a user.
    Upserts memories into the memory_nodes collection.
    Returns count of memories written.
    """
    db = get_db()
    expenses = await db["expenses"].find({"user": ObjectId(user_id)}).to_list(length=1000)

    if not expenses:
        return 0

    memories: List[dict] = []

    # ── 1. CATEGORY PATTERN MEMORIES ──────────────────────────────────────
    category_totals: dict = {}
    category_counts: dict = {}
    for exp in expenses:
        cat = exp.get("category", "Other")
        amt = float(exp.get("amount", 0))
        category_totals[cat] = category_totals.get(cat, 0) + amt
        category_counts[cat] = category_counts.get(cat, 0) + 1

    for cat, total in category_totals.items():
        count = category_counts[cat]
        importance = min(count / 10, 1.0)
        memories.append({
            "type": "pattern",
            "content": f"User regularly spends on {cat} — ₹{total:.0f} total across {count} transactions.",
            "tags": [cat.lower(), "pattern", "recurring"],
            "importance": round(importance, 2),
            "frequency": count,
        })

    # ── 2. TIME-OF-DAY HABIT MEMORIES ─────────────────────────────────────
    night_expenses = []
    morning_expenses = []
    weekend_expenses = []

    for exp in expenses:
        try:
            dt = datetime.fromisoformat(str(exp.get("date", "")))
            hour = dt.hour
            weekday = dt.weekday()  # 0=Mon, 6=Sun

            if hour >= 21 or hour <= 4:
                night_expenses.append(exp)
            if 6 <= hour <= 9:
                morning_expenses.append(exp)
            if weekday >= 5:
                weekend_expenses.append(exp)
        except Exception:
            continue

    if len(night_expenses) >= 3:
        total_night = sum(float(e.get("amount", 0)) for e in night_expenses)
        memories.append({
            "type": "habit",
            "content": f"User tends to spend late at night — {len(night_expenses)} transactions after 9 PM totalling ₹{total_night:.0f}.",
            "tags": ["night", "habit", "behavioral", "time-pattern"],
            "importance": 0.75,
            "frequency": len(night_expenses),
        })

    if len(weekend_expenses) >= 3:
        total_weekend = sum(float(e.get("amount", 0)) for e in weekend_expenses)
        memories.append({
            "type": "habit",
            "content": f"User spends more on weekends — {len(weekend_expenses)} weekend transactions totalling ₹{total_weekend:.0f}.",
            "tags": ["weekend", "habit", "behavioral"],
            "importance": 0.7,
            "frequency": len(weekend_expenses),
        })

    # ── 3. ANOMALY MEMORIES ────────────────────────────────────────────────
    amounts = [float(e.get("amount", 0)) for e in expenses]
    if len(amounts) >= 5:
        avg = sum(amounts) / len(amounts)
        variance = sum((x - avg) ** 2 for x in amounts) / len(amounts)
        std_dev = math.sqrt(variance)

        for exp in expenses:
            amt = float(exp.get("amount", 0))
            if amt > avg + 2 * std_dev:
                memories.append({
                    "type": "anomaly",
                    "content": (
                        f"Unusually high expense detected: \"{exp.get('title', 'Unknown')}\" "
                        f"of ₹{amt:.0f} in {exp.get('category', 'Unknown')} "
                        f"(average is ₹{avg:.0f}, std dev ₹{std_dev:.0f})."
                    ),
                    "tags": [exp.get("category", "other").lower(), "anomaly", "high-spend"],
                    "importance": 0.9,
                    "frequency": 1,
                    "related_expense_ids": [str(exp["_id"])],
                })

    # ── 4. MILESTONE MEMORIES ──────────────────────────────────────────────
    total_all_time = sum(amounts)
    memories.append({
        "type": "milestone",
        "content": f"User's all-time tracked spending is ₹{total_all_time:.0f} across {len(expenses)} expenses.",
        "tags": ["milestone", "summary", "total"],
        "importance": 0.6,
        "frequency": len(expenses),
    })

    # Last 30 days summary
    now = datetime.utcnow()
    recent = [
        e for e in expenses
        if _parse_date(e.get("date")) and (now - _parse_date(e.get("date"))).days <= 30
    ]
    if recent:
        recent_total = sum(float(e.get("amount", 0)) for e in recent)
        memories.append({
            "type": "milestone",
            "content": f"In the last 30 days, user spent ₹{recent_total:.0f} across {len(recent)} transactions.",
            "tags": ["monthly", "recent", "summary"],
            "importance": 0.85,
            "frequency": len(recent),
        })

    # ── 5. RECURRING EXPENSE MEMORIES ─────────────────────────────────────
    title_counts: dict = {}
    for exp in expenses:
        title = exp.get("title", "").strip().lower()
        if title:
            title_counts[title] = title_counts.get(title, 0) + 1

    for title, count in title_counts.items():
        if count >= 3:
            memories.append({
                "type": "recurring",
                "content": f"Recurring expense identified: \"{title}\" appears {count} times — likely a subscription or regular purchase.",
                "tags": ["recurring", "subscription", title],
                "importance": 0.8,
                "frequency": count,
            })

    # ── UPSERT ALL MEMORIES ────────────────────────────────────────────────
    written = 0
    for mem in memories:
        doc = {
            "user_id": user_id,
            "type": mem["type"],
            "content": mem["content"],
            "tags": mem.get("tags", []),
            "importance": mem.get("importance", 0.5),
            "frequency": mem.get("frequency", 1),
            "last_seen": datetime.utcnow(),
            "related_expense_ids": mem.get("related_expense_ids", []),
        }
        result = await db["memory_nodes"].update_one(
            {"user_id": user_id, "content": mem["content"]},
            {
                "$set": doc,
                "$setOnInsert": {"first_seen": datetime.utcnow()}
            },
            upsert=True
        )
        written += 1

    return written


async def retrieve_relevant_memories(user_id: str, query: str, top_k: int = 6) -> List[dict]:
    """
    Retrieve the most relevant memory nodes for a given user query.
    Scoring = base importance + tag keyword overlap with query.

    This is the retrieval component of the memory architecture —
    analogous to the retrieval step in RAG but domain-specific to finance.
    """
    db = get_db()
    all_memories = await db["memory_nodes"].find({"user_id": user_id}).to_list(length=200)

    if not all_memories:
        return []

    query_tokens = set(query.lower().split())

    scored = []
    for mem in all_memories:
        tag_set = set(mem.get("tags", []))
        tag_overlap = len(query_tokens & tag_set)

        # Boost score for query words appearing in content
        content_words = set(mem.get("content", "").lower().split())
        content_overlap = len(query_tokens & content_words)

        score = (
            mem.get("importance", 0.5)
            + tag_overlap * 0.25
            + content_overlap * 0.1
        )
        scored.append((score, mem))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [m for _, m in scored[:top_k]]


def _parse_date(val) -> datetime | None:
    if not val:
        return None
    try:
        return datetime.fromisoformat(str(val))
    except Exception:
        return None