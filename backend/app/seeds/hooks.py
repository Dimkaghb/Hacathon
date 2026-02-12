"""
Seed system hooks.

Run: python -m app.seeds.hooks
"""
import asyncio
import uuid
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.hook import Hook


SYSTEM_HOOKS = [
    # ── Curiosity ──────────────────────────────────────────────────────
    {
        "category": "curiosity",
        "template_text": "Nobody talks about this, but {product} just changed everything...",
        "example_filled": "Nobody talks about this, but this serum just changed everything...",
        "variables": [{"key": "product", "label": "Product", "placeholder": "your product"}],
        "performance_score": 8.5,
    },
    {
        "category": "curiosity",
        "template_text": "I found out why {pain_point} and the answer shocked me...",
        "example_filled": "I found out why my skin keeps breaking out and the answer shocked me...",
        "variables": [{"key": "pain_point", "label": "Pain point", "placeholder": "a common problem"}],
        "performance_score": 8.2,
    },
    # ── Controversy ────────────────────────────────────────────────────
    {
        "category": "controversy",
        "template_text": "Stop doing {bad_habit} — here's what actually works.",
        "example_filled": "Stop doing 10-step routines — here's what actually works.",
        "variables": [{"key": "bad_habit", "label": "Bad habit", "placeholder": "common mistake"}],
        "performance_score": 8.8,
    },
    {
        "category": "controversy",
        "template_text": "Unpopular opinion: {opinion}",
        "example_filled": "Unpopular opinion: expensive skincare is a scam.",
        "variables": [{"key": "opinion", "label": "Bold opinion", "placeholder": "your hot take"}],
        "performance_score": 9.0,
    },
    # ── Social Proof ───────────────────────────────────────────────────
    {
        "category": "social-proof",
        "template_text": "Over {number} people swear by this {product}. Here's why.",
        "example_filled": "Over 50,000 people swear by this moisturizer. Here's why.",
        "variables": [
            {"key": "number", "label": "Number", "placeholder": "10,000"},
            {"key": "product", "label": "Product", "placeholder": "your product"},
        ],
        "performance_score": 8.0,
    },
    {
        "category": "social-proof",
        "template_text": "My {audience} keep asking about {product} so here it is...",
        "example_filled": "My followers keep asking about my morning routine so here it is...",
        "variables": [
            {"key": "audience", "label": "Audience", "placeholder": "followers"},
            {"key": "product", "label": "Topic/product", "placeholder": "your product"},
        ],
        "performance_score": 7.8,
    },
    # ── POV ────────────────────────────────────────────────────────────
    {
        "category": "pov",
        "template_text": "POV: You finally found {product} that actually {benefit}.",
        "example_filled": "POV: You finally found a sunscreen that actually doesn't leave a white cast.",
        "variables": [
            {"key": "product", "label": "Product", "placeholder": "a product"},
            {"key": "benefit", "label": "Benefit", "placeholder": "works as promised"},
        ],
        "performance_score": 8.3,
    },
    {
        "category": "pov",
        "template_text": "POV: It's {time} and you just discovered {product}.",
        "example_filled": "POV: It's 2 AM and you just discovered the best productivity app ever.",
        "variables": [
            {"key": "time", "label": "Time context", "placeholder": "2 AM"},
            {"key": "product", "label": "Product", "placeholder": "your product"},
        ],
        "performance_score": 7.5,
    },
    # ── Relatable ──────────────────────────────────────────────────────
    {
        "category": "relatable",
        "template_text": "Tell me you struggle with {pain_point} without telling me you struggle with {pain_point}.",
        "example_filled": "Tell me you struggle with acne without telling me you struggle with acne.",
        "variables": [{"key": "pain_point", "label": "Pain point", "placeholder": "common struggle"}],
        "performance_score": 8.6,
    },
    {
        "category": "relatable",
        "template_text": "If {relatable_situation}, this is for you.",
        "example_filled": "If you've tried every diet and nothing works, this is for you.",
        "variables": [{"key": "relatable_situation", "label": "Situation", "placeholder": "a relatable scenario"}],
        "performance_score": 8.1,
    },
    # ── Urgency ────────────────────────────────────────────────────────
    {
        "category": "urgency",
        "template_text": "You need to try {product} before {event}. Trust me.",
        "example_filled": "You need to try this planner before January. Trust me.",
        "variables": [
            {"key": "product", "label": "Product", "placeholder": "your product"},
            {"key": "event", "label": "Event/deadline", "placeholder": "it sells out"},
        ],
        "performance_score": 7.9,
    },
    {
        "category": "urgency",
        "template_text": "This {product} is going viral and it's about to sell out...",
        "example_filled": "This lip gloss is going viral and it's about to sell out...",
        "variables": [{"key": "product", "label": "Product", "placeholder": "your product"}],
        "performance_score": 8.4,
    },
    # ── Challenge ──────────────────────────────────────────────────────
    {
        "category": "challenge",
        "template_text": "I tried {product} for {duration} and here's what happened...",
        "example_filled": "I tried cold showers for 30 days and here's what happened...",
        "variables": [
            {"key": "product", "label": "Product/habit", "placeholder": "your product"},
            {"key": "duration", "label": "Duration", "placeholder": "30 days"},
        ],
        "performance_score": 9.1,
    },
    {
        "category": "challenge",
        "template_text": "Can {product} really fix {pain_point}? Let's find out.",
        "example_filled": "Can this $10 serum really fix dark circles? Let's find out.",
        "variables": [
            {"key": "product", "label": "Product", "placeholder": "your product"},
            {"key": "pain_point", "label": "Pain point", "placeholder": "the problem"},
        ],
        "performance_score": 8.7,
    },
    {
        "category": "challenge",
        "template_text": "Day {day} of using {product} — the results are insane.",
        "example_filled": "Day 7 of using this hair mask — the results are insane.",
        "variables": [
            {"key": "day", "label": "Day number", "placeholder": "7"},
            {"key": "product", "label": "Product", "placeholder": "your product"},
        ],
        "performance_score": 8.9,
    },
]


async def seed():
    async with AsyncSessionLocal() as session:
        # Check if system hooks already exist
        result = await session.execute(
            select(Hook).where(Hook.is_system == True).limit(1)
        )
        if result.scalar_one_or_none():
            print("System hooks already seeded. Skipping.")
            return

        for hook_data in SYSTEM_HOOKS:
            hook = Hook(
                id=uuid.uuid4(),
                is_system=True,
                **hook_data,
            )
            session.add(hook)

        await session.commit()
        print(f"Seeded {len(SYSTEM_HOOKS)} system hooks.")


if __name__ == "__main__":
    asyncio.run(seed())
