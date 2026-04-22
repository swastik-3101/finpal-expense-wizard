"""
Memory Extractor Service — v4 (Behavior-Aware)
===============================================
All existing features preserved. New additions:

6. SPENDING TREND MEMORY — compares last 30 days vs previous 30 days
   per category. Detects increases/decreases with exact percentages.

7. TRIGGER PATTERN MEMORY — correlates category + time-of-day + day-of-week
   to find behavioral spending triggers (e.g. "spends 3x more on food
   on weekend nights").

8. SPENDING PERSONALITY PROFILE — classifies user into a behavioral
   archetype (Impulse Spender, Consistent Planner, Weekend Splurger,
   Essential Spender). Single persistent node updated every extraction.

9. HABIT STRENGTH MEMORY — scores how CONSISTENT each time habit is
   across weekly buckets (0.0 = random, 1.0 = every single week).
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict
from bson import ObjectId
from collections import defaultdict
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


# ── Date parsing ─────────────────────────────────────────────────────────────

def _parse_date(val) -> Optional[datetime]:
    if not val:
        return None
    try:
        if isinstance(val, datetime):
            dt = val
        elif isinstance(val, (int, float)):
            dt = datetime.fromtimestamp(val / 1000)
        else:
            s = str(val).strip()
            if "+" in s[10:]:
                s = s[:s.rindex("+")]
            s = s.replace("Z", "")
            dt = datetime.fromisoformat(s)
        return dt.replace(tzinfo=None) if dt.tzinfo else dt
    except Exception:
        return None


def _get_dt(exp: dict) -> Optional[datetime]:
    return _parse_date(exp.get("createdAt") or exp.get("date"))


# ── Refresh gate ─────────────────────────────────────────────────────────────

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


# ── Behavior extractors ───────────────────────────────────────────────────────

def _extract_trend_memories(expenses: list, now: datetime) -> List[dict]:
    """Compare last 30 days vs previous 30 days per category."""
    current: Dict[str, float] = defaultdict(float)
    previous: Dict[str, float] = defaultdict(float)
    period_current_start = now - timedelta(days=30)
    period_prev_start = now - timedelta(days=60)

    for exp in expenses:
        dt = _get_dt(exp)
        if not dt:
            continue
        amt = float(exp.get("amount", 0))
        cat = exp.get("category", "Other")
        if dt >= period_current_start:
            current[cat] += amt
        elif dt >= period_prev_start:
            previous[cat] += amt

    memories = []

    # Overall trend
    total_current = sum(current.values())
    total_previous = sum(previous.values())
    if total_previous > 0 and total_current > 0:
        change = ((total_current - total_previous) / total_previous) * 100
        direction = "increased" if change > 0 else "decreased"
        if abs(change) >= 10:
            memories.append({
                "stable_key": "trend:overall",
                "type": "trend",
                "content": (
                    f"Overall spending {direction} by {abs(change):.0f}% "
                    f"this month (₹{total_current:.0f}) vs last month (₹{total_previous:.0f})."
                ),
                "importance": 0.85,
                "frequency": 1,
            })

    # Per-category trends
    for cat in set(list(current.keys()) + list(previous.keys())):
        c = current.get(cat, 0)
        p = previous.get(cat, 0)
        if p > 0 and c > 0:
            change = ((c - p) / p) * 100
            direction = "increased" if change > 0 else "decreased"
            if abs(change) >= 20:
                memories.append({
                    "stable_key": f"trend:{cat.lower()}",
                    "type": "trend",
                    "content": (
                        f"{cat} spending {direction} by {abs(change):.0f}% "
                        f"this month (₹{c:.0f}) vs last month (₹{p:.0f})."
                    ),
                    "importance": 0.8,
                    "frequency": 1,
                })
        elif p == 0 and c > 0:
            memories.append({
                "stable_key": f"trend:{cat.lower()}",
                "type": "trend",
                "content": (
                    f"New spending category this month: {cat} — "
                    f"₹{c:.0f} with no prior history."
                ),
                "importance": 0.75,
                "frequency": 1,
            })

    return memories


def _extract_trigger_memories(expenses: list) -> List[dict]:
    """
    Find behavioral triggers by correlating category + time context.
    Only generates a memory when one context is 2x+ higher than another.
    """
    def time_slot(hour: int) -> str:
        if hour >= 21 or hour <= 4:
            return "night"
        elif 6 <= hour <= 9:
            return "morning"
        elif 10 <= hour <= 17:
            return "afternoon"
        else:
            return "evening"

    bucket: Dict[tuple, List[float]] = defaultdict(list)
    for exp in expenses:
        dt = _get_dt(exp)
        if not dt:
            continue
        cat = exp.get("category", "Other")
        amt = float(exp.get("amount", 0))
        slot = time_slot(dt.hour)
        is_weekend = dt.weekday() >= 5
        bucket[(cat, slot, is_weekend)].append(amt)

    memories = []
    categories = set(k[0] for k in bucket.keys())

    for cat in categories:
        contexts = []
        for (c, slot, weekend), amts in bucket.items():
            if c != cat or len(amts) < 2:
                continue
            label = f"{'weekend' if weekend else 'weekday'} {slot}s"
            contexts.append((label, sum(amts) / len(amts), len(amts)))

        if len(contexts) < 2:
            continue

        contexts.sort(key=lambda x: x[1], reverse=True)
        high_label, high_avg, high_count = contexts[0]
        low_label, low_avg, _ = contexts[-1]

        if low_avg > 0 and high_avg / low_avg >= 2.0:
            ratio = high_avg / low_avg
            memories.append({
                "stable_key": f"trigger:{cat.lower()}",
                "type": "trigger",
                "content": (
                    f"Behavioral trigger: User spends {ratio:.1f}x more on {cat} "
                    f"during {high_label} (avg ₹{high_avg:.0f}) "
                    f"vs {low_label} (avg ₹{low_avg:.0f})."
                ),
                "importance": 0.85,
                "frequency": high_count,
            })

    return memories


def _extract_personality_memory(expenses: list, amounts: List[float]) -> Optional[dict]:
    """
    Classifies the user into a spending personality archetype.
    Single persistent node — updated every extraction run.
    """
    if len(amounts) < 5:
        return None

    avg = sum(amounts) / len(amounts)
    variance = sum((x - avg) ** 2 for x in amounts) / len(amounts)
    std_dev = math.sqrt(variance)
    cv = std_dev / avg if avg > 0 else 0

    anomaly_count = sum(1 for a in amounts if a > avg + 2 * std_dev)
    anomaly_rate = anomaly_count / len(amounts)

    weekend_total = sum(
        float(e.get("amount", 0)) for e in expenses
        if _get_dt(e) and _get_dt(e).weekday() >= 5
    )
    weekday_total = sum(
        float(e.get("amount", 0)) for e in expenses
        if _get_dt(e) and _get_dt(e).weekday() < 5
    )
    weekend_ratio = weekend_total / (weekday_total + 1)

    cat_totals: Dict[str, float] = defaultdict(float)
    for exp in expenses:
        cat_totals[exp.get("category", "Other")] += float(exp.get("amount", 0))
    total = sum(cat_totals.values())
    essential_cats = {"Food", "Healthcare", "Utilities", "Transport", "Transportation", "Housing"}
    essential_pct = sum(v for k, v in cat_totals.items() if k in essential_cats) / (total + 1)

    if cv > 0.8 and anomaly_rate > 0.05:
        archetype = "Impulse Spender"
        desc = (
            f"Spending profile: Impulse Spender — high variability (CV={cv:.2f}), "
            f"{anomaly_rate*100:.0f}% of transactions are anomalously large. "
            f"Most purchases are small but occasional big spends dominate total."
        )
    elif weekend_ratio > 1.5:
        archetype = "Weekend Splurger"
        desc = (
            f"Spending profile: Weekend Splurger — weekend spending is "
            f"{weekend_ratio:.1f}x higher than weekday. "
            f"Most discretionary purchases happen on Saturdays and Sundays."
        )
    elif essential_pct > 0.7:
        archetype = "Essential Spender"
        desc = (
            f"Spending profile: Essential Spender — {essential_pct*100:.0f}% of spend "
            f"goes to necessities (food, utilities, healthcare, transport). "
            f"Very little discretionary spending detected."
        )
    elif cv < 0.4:
        archetype = "Consistent Planner"
        desc = (
            f"Spending profile: Consistent Planner — low variability (CV={cv:.2f}), "
            f"transactions are predictable and evenly spread. "
            f"Good financial discipline detected."
        )
    else:
        archetype = "Mixed Spender"
        desc = (
            f"Spending profile: Mixed Spender — moderate variability (CV={cv:.2f}), "
            f"balanced between essential and discretionary spending."
        )

    return {
        "stable_key": "behavior:personality",
        "type": "behavior",
        "content": desc,
        "importance": 0.9,
        "frequency": len(expenses),
    }


def _extract_habit_strength_memories(expenses: list, now: datetime) -> List[dict]:
    """
    Measures how CONSISTENT each time habit is across the last 8 weeks.
    Habit strength = fraction of active weeks where habit appeared.
    Only generates memory if strength >= 0.3 and >= 3 weeks of data.
    """
    num_weeks = 8
    habits_checked = {
        "night": lambda dt: dt.hour >= 21 or dt.hour <= 4,
        "weekend": lambda dt: dt.weekday() >= 5,
        "morning": lambda dt: 6 <= dt.hour <= 9,
    }

    habit_weeks: Dict[str, set] = {h: set() for h in habits_checked}
    all_weeks_with_data: set = set()

    for exp in expenses:
        dt = _get_dt(exp)
        if not dt:
            continue
        days_ago = (now - dt).days
        if days_ago > num_weeks * 7:
            continue
        week_bucket = days_ago // 7
        all_weeks_with_data.add(week_bucket)
        for habit_name, condition in habits_checked.items():
            if condition(dt):
                habit_weeks[habit_name].add(week_bucket)

    total_active_weeks = len(all_weeks_with_data)
    if total_active_weeks < 3:
        return []

    habit_labels = {
        "night": "late-night spending (after 9 PM)",
        "weekend": "weekend spending",
        "morning": "morning purchases (6–9 AM)",
    }

    memories = []
    for habit_name, active_weeks in habit_weeks.items():
        if not active_weeks:
            continue
        strength = len(active_weeks) / total_active_weeks
        if strength < 0.3:
            continue

        consistency_label = (
            "very consistent" if strength >= 0.8
            else "fairly consistent" if strength >= 0.6
            else "occasional"
        )

        memories.append({
            "stable_key": f"habit_strength:{habit_name}",
            "type": "habit_strength",
            "content": (
                f"Habit strength for {habit_labels[habit_name]}: "
                f"{strength:.0%} of recent weeks — {consistency_label} "
                f"({len(active_weeks)} of {total_active_weeks} weeks)."
            ),
            "importance": round(0.5 + strength * 0.4, 2),
            "frequency": len(active_weeks),
        })

    return memories


# ── Main extraction pipeline ──────────────────────────────────────────────────

async def extract_and_store_memories(user_id: str) -> int:
    db = get_db()
    expenses = await db["expenses"].find(
        {"user": ObjectId(user_id)}
    ).to_list(length=1000)

    if not expenses:
        return 0

    memories: List[dict] = []
    now = datetime.utcnow()
    amounts = [float(e.get("amount", 0)) for e in expenses]

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
    night_expenses, morning_expenses, weekend_expenses = [], [], []
    for exp in expenses:
        dt = _get_dt(exp)
        if not dt:
            continue
        if dt.hour >= 21 or dt.hour <= 4:
            night_expenses.append(exp)
        if 6 <= dt.hour <= 9:
            morning_expenses.append(exp)
        if dt.weekday() >= 5:
            weekend_expenses.append(exp)

    if len(night_expenses) >= 3:
        memories.append({
            "stable_key": "habit:night",
            "type": "habit",
            "content": f"User makes {len(night_expenses)} purchases after 9 PM totalling ₹{sum(float(e.get('amount',0)) for e in night_expenses):.0f} — possible impulsive late-night spending.",
            "importance": 0.75,
            "frequency": len(night_expenses),
        })

    if len(morning_expenses) >= 3:
        memories.append({
            "stable_key": "habit:morning",
            "type": "habit",
            "content": f"User makes {len(morning_expenses)} morning purchases (6–9 AM) totalling ₹{sum(float(e.get('amount',0)) for e in morning_expenses):.0f}.",
            "importance": 0.6,
            "frequency": len(morning_expenses),
        })

    if len(weekend_expenses) >= 3:
        memories.append({
            "stable_key": "habit:weekend",
            "type": "habit",
            "content": f"User tends to spend on weekends — {len(weekend_expenses)} transactions totalling ₹{sum(float(e.get('amount',0)) for e in weekend_expenses):.0f}.",
            "importance": 0.7,
            "frequency": len(weekend_expenses),
        })

    # ── 3. ANOMALY MEMORIES ────────────────────────────────────────────────
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
    memories.append({
        "stable_key": "milestone:alltime",
        "type": "milestone",
        "content": f"User's total tracked spending is ₹{sum(amounts):.0f} across {len(expenses)} expenses.",
        "importance": 0.6,
        "frequency": len(expenses),
    })

    recent = [
        e for e in expenses
        if _get_dt(e) and (now - _get_dt(e)).days <= 30
    ]
    if recent:
        memories.append({
            "stable_key": "milestone:30days",
            "type": "milestone",
            "content": f"In the last 30 days, user spent ₹{sum(float(e.get('amount',0)) for e in recent):.0f} across {len(recent)} transactions.",
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

    # ── 6. SPENDING TREND MEMORIES ────────────────────────────────────────
    memories.extend(_extract_trend_memories(expenses, now))

    # ── 7. TRIGGER PATTERN MEMORIES ───────────────────────────────────────
    memories.extend(_extract_trigger_memories(expenses))

    # ── 8. SPENDING PERSONALITY PROFILE ───────────────────────────────────
    personality = _extract_personality_memory(expenses, amounts)
    if personality:
        memories.append(personality)

    # ── 9. HABIT STRENGTH MEMORIES ────────────────────────────────────────
    memories.extend(_extract_habit_strength_memories(expenses, now))

    # ── EMBED + UPSERT ALL ─────────────────────────────────────────────────
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


# ── Semantic retrieval ────────────────────────────────────────────────────────

async def retrieve_relevant_memories(user_id: str, query: str, top_k: int = 6) -> List[dict]:
    """
    Score = 0.7 * semantic_similarity + 0.2 * importance + 0.1 * recency
    Semantic dominates so low-importance categories still surface when queried.
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
    return [m for _, m in scored[:top_k]]