"""
Memory Extractor Service — v3 (Production Fixed)
=================================================
Key fixes:
1. PURE SEMANTIC RETRIEVAL — 0.7 weight on semantic similarity so
   "healthcare" query always surfaces healthcare memory regardless of
   how low its importance score is.
2. IMPORTANCE FLOOR — all categories get minimum 0.4.
3. ROBUST DATE PARSING — handles MongoDB datetime, ISO strings, Unix timestamps.
   Fixes the "44 night transactions" overcounting bug.
4. STABLE KEYS — upserts match on stable_key not content string.
5. REFRESH GATE — only re-extracts when new expenses exist.
6. DEAD CODE REMOVED — morning_expenses now stored as a memory node.
"""

from datetime import datetime
from typing import List, Optional
from bson import ObjectId
import math
import numpy as np

from core.database import get_db
from sentence_transformers import SentenceTransformer

_embed_model: Optional[SentenceTransformer] = None

def get_embed_model() -> SentenceTransformer:
    global _embed_model
    if _embed_model is None:
        print("🔄 Loading embedding model...")
        _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
        print("✅ Embedding model loaded")
    return _embed_model

def embed(text: str) -> List[float]:
    return get_embed_model().encode(text, normalize_embeddings=True).tolist()

def cosine_similarity(a: List[float], b: List[float]) -> float:
    return float(np.dot(np.array(a), np.array(b)))


def _parse_date(val) -> Optional[datetime]:
    """
    Handles all date formats from MongoDB:
    - datetime objects (returned by motor)
    - ISO strings with/without timezone
    - Unix timestamps in ms
    Always returns timezone-naive datetime.
    """
    if not val:
        return None
    try:
        if isinstance(val, datetime):
            dt = val
        elif isinstance(val, (int, float)):
            dt = datetime.fromtimestamp(val / 1000)
        else:
            s = str(val).strip()
            # Strip timezone offset e.g. +00:00
            if "+" in s[10:]:
                s = s[:s.rindex("+")]
            # Strip Z
            s = s.replace("Z", "")
            dt = datetime.fromisoformat(s)
        return dt.replace(tzinfo=None) if dt.tzinfo else dt
    except Exception:
        return None


async def should_refresh_memories(user_id: str) -> bool:
    db = get_db()
    last_memory = await db["memory_nodes"].find_one(
        {"user_id": user_id}, sort=[("last_seen", -1)]
    )
    if not last_memory:
        return True

    last_built = _parse_date(last_memory.get("last_seen"))
    if not last_built:
        return True

    last_expense = await db["expenses"].find_one(
        {"user": ObjectId(user_id)}, sort=[("createdAt", -1)]
    )
    if not last_expense:
        return False

    last_expense_time = _parse_date(
        last_expense.get("createdAt") or last_expense.get("date")
    )
    if not last_expense_time:
        return False

    return last_expense_time > last_built


async def extract_and_store_memories(user_id: str) -> int:
    db = get_db()
    expenses = await db["expenses"].find(
        {"user": ObjectId(user_id)}
    ).to_list(length=1000)

    if not expenses:
        return 0

    memories: List[dict] = []
    now = datetime.utcnow()

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
        importance = max(min(count / 10, 1.0), 0.4)
        memories.append({
            "stable_key": f"pattern:{cat.lower()}",
            "type": "pattern",
            "content": f"User spends on {cat}: ₹{total:.0f} total across {count} transactions.",
            "importance": round(importance, 2),
            "frequency": count,
        })

    # ── 2. TIME-OF-DAY HABIT MEMORIES ─────────────────────────────────────
    night_expenses = []
    morning_expenses = []
    weekend_expenses = []

    for exp in expenses:
        # createdAt is more reliable than date field
        dt = _parse_date(exp.get("createdAt") or exp.get("date"))
        if not dt:
            continue
        hour = dt.hour
        weekday = dt.weekday()

        if hour >= 21 or hour <= 4:
            night_expenses.append(exp)
        if 6 <= hour <= 9:
            morning_expenses.append(exp)
        if weekday >= 5:
            weekend_expenses.append(exp)

    if len(night_expenses) >= 3:
        total_night = sum(float(e.get("amount", 0)) for e in night_expenses)
        memories.append({
            "stable_key": "habit:night",
            "type": "habit",
            "content": f"User makes {len(night_expenses)} purchases after 9 PM totalling ₹{total_night:.0f} — possible impulsive late-night spending.",
            "importance": 0.75,
            "frequency": len(night_expenses),
        })

    if len(morning_expenses) >= 3:
        total_morning = sum(float(e.get("amount", 0)) for e in morning_expenses)
        memories.append({
            "stable_key": "habit:morning",
            "type": "habit",
            "content": f"User makes {len(morning_expenses)} morning purchases (6–9 AM) totalling ₹{total_morning:.0f}.",
            "importance": 0.6,
            "frequency": len(morning_expenses),
        })

    if len(weekend_expenses) >= 3:
        total_weekend = sum(float(e.get("amount", 0)) for e in weekend_expenses)
        memories.append({
            "stable_key": "habit:weekend",
            "type": "habit",
            "content": f"User tends to spend on weekends — {len(weekend_expenses)} transactions totalling ₹{total_weekend:.0f}.",
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
                    "stable_key": f"anomaly:{str(exp['_id'])}",
                    "type": "anomaly",
                    "content": (
                        f"Unusually high expense: \"{exp.get('title', 'Unknown')}\" "
                        f"₹{amt:.0f} in {exp.get('category', 'Unknown')} "
                        f"(avg ₹{avg:.0f}, std dev ₹{std_dev:.0f})."
                    ),
                    "importance": 0.9,
                    "frequency": 1,
                    "related_expense_ids": [str(exp["_id"])],
                })

    # ── 4. MILESTONE MEMORIES ──────────────────────────────────────────────
    total_all_time = sum(amounts)
    memories.append({
        "stable_key": "milestone:alltime",
        "type": "milestone",
        "content": f"User's total tracked spending is ₹{total_all_time:.0f} across {len(expenses)} expenses.",
        "importance": 0.6,
        "frequency": len(expenses),
    })

    recent = []
    for e in expenses:
        dt = _parse_date(e.get("date") or e.get("createdAt"))
        if dt:
            days_diff = (now - dt).days if dt <= now else None
            if days_diff is not None and days_diff <= 30:
                recent.append(e)

    if recent:
        recent_total = sum(float(e.get("amount", 0)) for e in recent)
        memories.append({
            "stable_key": "milestone:30days",
            "type": "milestone",
            "content": f"In the last 30 days, user spent ₹{recent_total:.0f} across {len(recent)} transactions.",
            "importance": 0.85,
            "frequency": len(recent),
        })

    # ── 5. RECURRING EXPENSE MEMORIES ─────────────────────────────────────
    title_counts: dict = {}
    for exp in expenses:
        title = exp.get("title", "").strip().lower()
        if title:
            title_counts[title] = title_counts.get(title, 0) + 1

    threshold = max(2, len(expenses) // 10)
    for title, count in title_counts.items():
        if count >= threshold:
            memories.append({
                "stable_key": f"recurring:{title}",
                "type": "recurring",
                "content": f"Recurring expense: \"{title}\" logged {count} times — likely a regular purchase or subscription.",
                "importance": 0.8,
                "frequency": count,
            })

    # ── EMBED + UPSERT ─────────────────────────────────────────────────────
    written = 0
    for mem in memories:
        embedding = embed(mem["content"])
        doc = {
            "user_id": user_id,
            "stable_key": mem["stable_key"],
            "type": mem["type"],
            "content": mem["content"],
            "embedding": embedding,
            "importance": mem.get("importance", 0.5),
            "frequency": mem.get("frequency", 1),
            "last_seen": now,
            "related_expense_ids": mem.get("related_expense_ids", []),
        }
        await db["memory_nodes"].update_one(
            {"user_id": user_id, "stable_key": mem["stable_key"]},
            {"$set": doc, "$setOnInsert": {"first_seen": now}},
            upsert=True
        )
        written += 1

    return written


async def retrieve_relevant_memories(user_id: str, query: str, top_k: int = 6) -> List[dict]:
    """
    Semantic-dominant retrieval.

    Score = 0.7 * cosine_similarity(query, memory)
          + 0.2 * importance
          + 0.1 * recency_score

    The 0.7 semantic weight means:
    - "healthcare expenses" → healthcare memory surfaces even with importance 0.4
    - "where does money go" → high-importance patterns surface naturally
    - Importance acts as tiebreaker, not a gatekeeper
    """
    db = get_db()
    all_memories = await db["memory_nodes"].find({"user_id": user_id}).to_list(length=500)

    if not all_memories:
        return []

    query_embedding = embed(query)
    now = datetime.utcnow()

    scored = []
    for mem in all_memories:
        stored_embedding = mem.get("embedding")

        if stored_embedding and len(stored_embedding) > 0:
            semantic_score = cosine_similarity(query_embedding, stored_embedding)
        else:
            semantic_score = cosine_similarity(query_embedding, embed(mem.get("content", "")))

        last_seen = _parse_date(mem.get("last_seen")) or now
        days_old = max((now - last_seen).days, 0) if last_seen <= now else 0
        recency_score = 1.0 / (1.0 + 0.05 * days_old)

        final_score = (
            0.7 * semantic_score
            + 0.2 * mem.get("importance", 0.5)
            + 0.1 * recency_score
        )

        scored.append((final_score, mem))

    scored.sort(key=lambda x: x[0], reverse=True)

    # Debug log — remove after confirming it works
    print(f"\n🧠 TOP MEMORIES FOR: '{query}'")
    for score, m in scored[:8]:
        print(f"  {score:.3f} | {m['stable_key']}")

    return [m for _, m in scored[:top_k]]