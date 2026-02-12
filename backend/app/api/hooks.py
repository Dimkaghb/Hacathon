"""
Hooks API

Pre-built and AI-generated hook text templates for scene scripts.
"""
import asyncio
import json
import re
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from uuid import UUID
from typing import Optional

from app.core.database import get_db
from app.models.user import User
from app.models.hook import Hook
from app.schemas.hook import HookCreate, HookResponse, HookGenerateRequest, HookGenerateResponse
from app.api.deps import get_current_user
from app.config import settings

router = APIRouter()


@router.get("", response_model=list[HookResponse])
async def list_hooks(
    category: Optional[str] = Query(None, description="Filter by category"),
    db: AsyncSession = Depends(get_db),
):
    """List all hooks. Optionally filter by category. No auth required."""
    query = select(Hook).order_by(
        Hook.usage_count.desc(),
        Hook.category.asc(),
    )
    if category:
        query = query.where(Hook.category == category)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{hook_id}", response_model=HookResponse)
async def get_hook(
    hook_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single hook by ID. No auth required."""
    result = await db.execute(
        select(Hook).where(Hook.id == hook_id)
    )
    hook = result.scalar_one_or_none()
    if not hook:
        raise HTTPException(status_code=404, detail="Hook not found")
    return hook


@router.post("", response_model=HookResponse, status_code=201)
async def create_hook(
    data: HookCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a custom hook. Requires auth."""
    hook = Hook(
        category=data.category,
        template_text=data.template_text,
        example_filled=data.example_filled,
        variables=data.variables or [],
        is_system=False,
        creator_id=current_user.id,
    )
    db.add(hook)
    await db.commit()
    await db.refresh(hook)
    return hook


@router.post("/{hook_id}/use", response_model=HookResponse)
async def use_hook(
    hook_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Increment usage_count and return the hook. No auth required."""
    result = await db.execute(
        select(Hook).where(Hook.id == hook_id)
    )
    hook = result.scalar_one_or_none()
    if not hook:
        raise HTTPException(status_code=404, detail="Hook not found")

    hook.usage_count = (hook.usage_count or 0) + 1
    await db.commit()
    await db.refresh(hook)
    return hook


@router.post("/generate-variants", response_model=HookGenerateResponse)
async def generate_hook_variants(
    data: HookGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI-generate hook variants via Gemini. Requires auth."""
    from google import genai

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    system_prompt = f"""You are an expert short-form video copywriter. Generate {data.count} unique hook lines for a product video.

Product: {data.product_name}
Pain point: {data.pain_point}

Each hook should be a different category from: curiosity, controversy, social-proof, pov, relatable, urgency, challenge.

Return a JSON array of objects with keys: category, template_text, example_filled.
- template_text: The hook with {{product}} and {{pain_point}} as placeholders
- example_filled: The hook with actual values filled in

Return ONLY the JSON array, no extra text."""

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[{"role": "user", "parts": [{"text": system_prompt}]}],
        ),
    )

    response_text = response.text.strip()

    # Extract JSON array from response
    hooks = []
    json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
    if json_match:
        try:
            hooks = json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    if not hooks:
        # Fallback: create a simple hook from the response
        hooks = [
            {
                "category": "curiosity",
                "template_text": f"What if I told you {{{{product}}}} could solve {{{{pain_point}}}}?",
                "example_filled": f"What if I told you {data.product_name} could solve {data.pain_point}?",
            }
        ]

    return HookGenerateResponse(hooks=hooks[:data.count])
