"""
Scene Definitions API

Pre-built scene types (hooks, body scenes, closers) for the scene gallery.
System scenes are public; users can also create custom scene definitions.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional

from app.core.database import get_db
from app.models.user import User
from app.models.scene_definition import SceneDefinition
from app.schemas.scene_definition import SceneDefinitionCreate, SceneDefinitionResponse
from app.api.deps import get_current_user

router = APIRouter()


@router.get("", response_model=list[SceneDefinitionResponse])
async def list_scene_definitions(
    category: Optional[str] = Query(None, description="Filter by category (hook, body, closer)"),
    db: AsyncSession = Depends(get_db),
):
    """List all scene definitions. Optionally filter by category. No auth required."""
    query = select(SceneDefinition).order_by(
        SceneDefinition.sort_order.asc(),
        SceneDefinition.category.asc(),
        SceneDefinition.name.asc(),
    )
    if category:
        query = query.where(SceneDefinition.category == category)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{scene_id}", response_model=SceneDefinitionResponse)
async def get_scene_definition(
    scene_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single scene definition by ID. No auth required."""
    result = await db.execute(
        select(SceneDefinition).where(SceneDefinition.id == scene_id)
    )
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene definition not found")
    return scene


@router.post("", response_model=SceneDefinitionResponse, status_code=201)
async def create_scene_definition(
    data: SceneDefinitionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a custom scene definition. Requires auth."""
    scene = SceneDefinition(
        name=data.name,
        category=data.category,
        subcategory=data.subcategory,
        description=data.description,
        prompt_template=data.prompt_template,
        default_script=data.default_script,
        setting=data.setting or {},
        duration=data.duration,
        tone=data.tone,
        is_system=False,
        creator_id=current_user.id,
    )
    db.add(scene)
    await db.commit()
    await db.refresh(scene)
    return scene
