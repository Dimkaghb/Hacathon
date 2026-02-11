"""
Seed system scene definitions.

Run: python -m app.seeds.scene_definitions
"""
import asyncio
import uuid
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.scene_definition import SceneDefinition


SYSTEM_SCENES = [
    # ── Hooks (3-5s) ──────────────────────────────────────────────────────
    {
        "name": "Curiosity Hook",
        "category": "hook",
        "subcategory": "curiosity",
        "description": "Open with a surprising or intriguing statement that makes viewers stop scrolling.",
        "prompt_template": "Close-up shot of {character} looking directly at camera with an intrigued expression, dramatic pause, cinematic lighting, shallow depth of field. {setting}",
        "default_script": "You won't believe what happened when I tried this...",
        "setting": {"lighting": "dramatic", "camera_angle": "close-up"},
        "duration": 3,
        "tone": "intriguing",
        "sort_order": 1,
    },
    {
        "name": "POV Hook",
        "category": "hook",
        "subcategory": "pov",
        "description": "First-person perspective hook that pulls the viewer into a scenario.",
        "prompt_template": "POV shot, first-person perspective, {character} reacting to camera as if viewer just said something, natural lighting, authentic feel. {setting}",
        "default_script": "POV: You just discovered the secret to...",
        "setting": {"lighting": "natural", "camera_angle": "pov"},
        "duration": 3,
        "tone": "relatable",
        "sort_order": 2,
    },
    {
        "name": "Controversy Hook",
        "category": "hook",
        "subcategory": "controversy",
        "description": "Bold, opinion-driven opener that sparks debate and engagement.",
        "prompt_template": "Medium shot of {character} speaking confidently to camera, bold expression, clean background, studio lighting. {setting}",
        "default_script": "Unpopular opinion: this is the only way to...",
        "setting": {"lighting": "studio", "camera_angle": "medium"},
        "duration": 4,
        "tone": "bold",
        "sort_order": 3,
    },
    {
        "name": "Social Proof Hook",
        "category": "hook",
        "subcategory": "social-proof",
        "description": "Lead with impressive numbers, testimonials, or authority signals.",
        "prompt_template": "Confident {character} in professional setting, talking to camera, warm lighting, text overlay space, trustworthy atmosphere. {setting}",
        "default_script": "Over 10,000 people have already tried this...",
        "setting": {"lighting": "warm", "camera_angle": "medium"},
        "duration": 4,
        "tone": "authoritative",
        "sort_order": 4,
    },
    {
        "name": "Relatable Hook",
        "category": "hook",
        "subcategory": "relatable",
        "description": "Start with a common pain point or everyday scenario viewers identify with.",
        "prompt_template": "Casual shot of {character} in everyday setting, frustrated or amused expression, natural lighting, authentic vibe. {setting}",
        "default_script": "If you've ever struggled with this, keep watching...",
        "setting": {"lighting": "natural", "camera_angle": "medium-close"},
        "duration": 3,
        "tone": "empathetic",
        "sort_order": 5,
    },
    # ── Body (5-10s) ──────────────────────────────────────────────────────
    {
        "name": "Problem Statement",
        "category": "body",
        "subcategory": "problem",
        "description": "Clearly articulate the problem your audience faces.",
        "prompt_template": "Medium shot of {character} explaining a problem, expressive hand gestures, concerned expression, clean background. {setting}",
        "default_script": "The biggest problem is that most people don't realize...",
        "setting": {"lighting": "soft", "camera_angle": "medium"},
        "duration": 6,
        "tone": "informative",
        "sort_order": 10,
    },
    {
        "name": "Solution Reveal",
        "category": "body",
        "subcategory": "solution",
        "description": "Present your product or method as the answer to the problem.",
        "prompt_template": "Excited {character} revealing {product} to camera, bright lighting, clean product showcase, smooth camera movement. {setting}",
        "default_script": "Here's exactly how to fix it in 3 simple steps...",
        "setting": {"lighting": "bright", "camera_angle": "medium"},
        "duration": 8,
        "tone": "enthusiastic",
        "sort_order": 11,
    },
    {
        "name": "Product Demo",
        "category": "body",
        "subcategory": "demo",
        "description": "Show the product in action with clear visual demonstration.",
        "prompt_template": "Close-up of {character} using {product}, detailed hand movements, well-lit product showcase, smooth transitions. {setting}",
        "default_script": "Watch how easy this is to use...",
        "setting": {"lighting": "studio", "camera_angle": "close-up"},
        "duration": 8,
        "tone": "demonstrative",
        "sort_order": 12,
    },
    {
        "name": "Lifestyle Moment",
        "category": "body",
        "subcategory": "lifestyle",
        "description": "Show the aspirational lifestyle or result of using the product.",
        "prompt_template": "Cinematic wide shot of {character} enjoying life, golden hour lighting, aspirational setting, lifestyle b-roll feel. {setting}",
        "default_script": "This is what my mornings look like now...",
        "setting": {"lighting": "golden-hour", "camera_angle": "wide"},
        "duration": 7,
        "tone": "aspirational",
        "sort_order": 13,
    },
    {
        "name": "GRWM / Routine",
        "category": "body",
        "subcategory": "grwm",
        "description": "Get Ready With Me format showing a step-by-step routine.",
        "prompt_template": "Mirror shot or vanity angle of {character} getting ready, step-by-step process, warm lighting, intimate feel. {setting}",
        "default_script": "Step 1: Start with a clean base...",
        "setting": {"lighting": "warm", "camera_angle": "mirror"},
        "duration": 10,
        "tone": "casual",
        "sort_order": 14,
    },
    # ── Closers (3-5s) ────────────────────────────────────────────────────
    {
        "name": "CTA - Link in Bio",
        "category": "closer",
        "subcategory": "cta",
        "description": "Direct call-to-action pointing viewers to your link in bio.",
        "prompt_template": "Close-up of {character} pointing down or gesturing to bio area, friendly smile, clean background, bright lighting. {setting}",
        "default_script": "Link in bio to get started today!",
        "setting": {"lighting": "bright", "camera_angle": "close-up"},
        "duration": 3,
        "tone": "urgent",
        "sort_order": 20,
    },
    {
        "name": "Before/After Reveal",
        "category": "closer",
        "subcategory": "before-after",
        "description": "Dramatic before/after comparison to drive home the transformation.",
        "prompt_template": "Split-screen feel, {character} showing transformation result, dramatic reveal moment, impactful lighting transition. {setting}",
        "default_script": "And here's the final result...",
        "setting": {"lighting": "dramatic", "camera_angle": "medium"},
        "duration": 4,
        "tone": "dramatic",
        "sort_order": 21,
    },
    {
        "name": "Testimonial Wrap",
        "category": "closer",
        "subcategory": "testimonial",
        "description": "Close with a satisfied customer quote or personal endorsement.",
        "prompt_template": "Warm close-up of {character} giving genuine testimonial to camera, authentic expression, soft lighting, eye contact. {setting}",
        "default_script": "Honestly, this changed everything for me.",
        "setting": {"lighting": "soft", "camera_angle": "close-up"},
        "duration": 4,
        "tone": "authentic",
        "sort_order": 22,
    },
    {
        "name": "Offer / Discount",
        "category": "closer",
        "subcategory": "offer",
        "description": "End with a limited-time offer or discount code to drive urgency.",
        "prompt_template": "Energetic {character} announcing offer, excited expression, text overlay space, dynamic framing. {setting}",
        "default_script": "Use code SAVE20 for 20% off — limited time only!",
        "setting": {"lighting": "bright", "camera_angle": "medium"},
        "duration": 4,
        "tone": "urgent",
        "sort_order": 23,
    },
]


async def seed():
    async with AsyncSessionLocal() as session:
        # Check if system scenes already exist
        result = await session.execute(
            select(SceneDefinition).where(SceneDefinition.is_system == True).limit(1)
        )
        if result.scalar_one_or_none():
            print("System scene definitions already seeded. Skipping.")
            return

        for scene_data in SYSTEM_SCENES:
            scene = SceneDefinition(
                id=uuid.uuid4(),
                is_system=True,
                **scene_data,
            )
            session.add(scene)

        await session.commit()
        print(f"Seeded {len(SYSTEM_SCENES)} system scene definitions.")


if __name__ == "__main__":
    asyncio.run(seed())
