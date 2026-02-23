"""
Campaigns API

Organize projects and characters into campaigns (e.g. "Summer Skincare Launch").
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from typing import Optional

from app.core.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.character import Character
from app.models.campaign import Campaign, campaign_projects, campaign_characters
from app.schemas.campaign import (
    CampaignCreate,
    CampaignUpdate,
    CampaignResponse,
    CampaignDetailResponse,
    CampaignProjectSummary,
    CampaignCharacterSummary,
)
from app.api.deps import get_current_user

router = APIRouter()

VALID_STATUSES = {"draft", "active", "archived"}


async def _get_user_campaign(
    db: AsyncSession, campaign_id: UUID, user_id: UUID
) -> Campaign:
    result = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.user_id == user_id,
        )
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


def _build_campaign_response(campaign: Campaign) -> CampaignResponse:
    return CampaignResponse(
        id=campaign.id,
        user_id=campaign.user_id,
        name=campaign.name,
        description=campaign.description,
        status=campaign.status,
        metadata=campaign.metadata_,
        project_count=len(campaign.projects) if campaign.projects else 0,
        character_count=len(campaign.characters) if campaign.characters else 0,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )


def _build_campaign_detail(campaign: Campaign) -> CampaignDetailResponse:
    return CampaignDetailResponse(
        id=campaign.id,
        user_id=campaign.user_id,
        name=campaign.name,
        description=campaign.description,
        status=campaign.status,
        metadata=campaign.metadata_,
        projects=[
            CampaignProjectSummary(
                id=p.id,
                name=p.name,
                thumbnail_url=p.thumbnail_url,
                updated_at=p.updated_at,
            )
            for p in (campaign.projects or [])
        ],
        characters=[
            CampaignCharacterSummary(
                id=c.id,
                name=c.name,
                source_image_url=c.source_image_url,
            )
            for c in (campaign.characters or [])
        ],
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )


# ── Campaign CRUD ──────────────────────────────────────────────────────────


@router.get("", response_model=list[CampaignResponse])
async def list_campaigns(
    status: Optional[str] = Query(None, description="Filter by status: draft, active, archived"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all campaigns for the current user."""
    query = select(Campaign).where(
        Campaign.user_id == current_user.id
    ).order_by(Campaign.updated_at.desc())

    if status:
        if status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}")
        query = query.where(Campaign.status == status)

    result = await db.execute(query)
    campaigns = result.scalars().all()
    return [_build_campaign_response(c) for c in campaigns]


@router.post("", response_model=CampaignDetailResponse, status_code=201)
async def create_campaign(
    data: CampaignCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new campaign."""
    if data.status and data.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}")

    campaign = Campaign(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        status=data.status or "draft",
        metadata_=data.metadata or {},
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return _build_campaign_detail(campaign)


@router.get("/{campaign_id}", response_model=CampaignDetailResponse)
async def get_campaign(
    campaign_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single campaign with its projects and characters."""
    campaign = await _get_user_campaign(db, campaign_id, current_user.id)
    return _build_campaign_detail(campaign)


@router.put("/{campaign_id}", response_model=CampaignDetailResponse)
async def update_campaign(
    campaign_id: UUID,
    data: CampaignUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update campaign details."""
    campaign = await _get_user_campaign(db, campaign_id, current_user.id)

    if data.name is not None:
        campaign.name = data.name
    if data.description is not None:
        campaign.description = data.description
    if data.status is not None:
        if data.status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}")
        campaign.status = data.status
    if data.metadata is not None:
        campaign.metadata_ = data.metadata

    await db.commit()
    await db.refresh(campaign)
    return _build_campaign_detail(campaign)


@router.delete("/{campaign_id}", status_code=204)
async def delete_campaign(
    campaign_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a campaign. Does not delete the associated projects or characters."""
    campaign = await _get_user_campaign(db, campaign_id, current_user.id)
    await db.delete(campaign)
    await db.commit()


# ── Project Assignment ─────────────────────────────────────────────────────


@router.post("/{campaign_id}/projects/{project_id}", response_model=CampaignDetailResponse)
async def add_project_to_campaign(
    campaign_id: UUID,
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a project to a campaign."""
    campaign = await _get_user_campaign(db, campaign_id, current_user.id)

    # Verify project ownership
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if already linked
    if any(p.id == project_id for p in campaign.projects):
        raise HTTPException(status_code=409, detail="Project already in campaign")

    campaign.projects.append(project)
    await db.commit()
    await db.refresh(campaign)
    return _build_campaign_detail(campaign)


@router.delete("/{campaign_id}/projects/{project_id}", response_model=CampaignDetailResponse)
async def remove_project_from_campaign(
    campaign_id: UUID,
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a project from a campaign."""
    campaign = await _get_user_campaign(db, campaign_id, current_user.id)

    project_to_remove = None
    for p in campaign.projects:
        if p.id == project_id:
            project_to_remove = p
            break

    if not project_to_remove:
        raise HTTPException(status_code=404, detail="Project not in this campaign")

    campaign.projects.remove(project_to_remove)
    await db.commit()
    await db.refresh(campaign)
    return _build_campaign_detail(campaign)


# ── Character Assignment ───────────────────────────────────────────────────


@router.post("/{campaign_id}/characters/{character_id}", response_model=CampaignDetailResponse)
async def add_character_to_campaign(
    campaign_id: UUID,
    character_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a character to a campaign."""
    campaign = await _get_user_campaign(db, campaign_id, current_user.id)

    # Verify character ownership
    result = await db.execute(
        select(Character).where(Character.id == character_id, Character.user_id == current_user.id)
    )
    character = result.scalar_one_or_none()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    # Check if already linked
    if any(c.id == character_id for c in campaign.characters):
        raise HTTPException(status_code=409, detail="Character already in campaign")

    campaign.characters.append(character)
    await db.commit()
    await db.refresh(campaign)
    return _build_campaign_detail(campaign)


@router.delete("/{campaign_id}/characters/{character_id}", response_model=CampaignDetailResponse)
async def remove_character_from_campaign(
    campaign_id: UUID,
    character_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a character from a campaign."""
    campaign = await _get_user_campaign(db, campaign_id, current_user.id)

    char_to_remove = None
    for c in campaign.characters:
        if c.id == character_id:
            char_to_remove = c
            break

    if not char_to_remove:
        raise HTTPException(status_code=404, detail="Character not in this campaign")

    campaign.characters.remove(char_to_remove)
    await db.commit()
    await db.refresh(campaign)
    return _build_campaign_detail(campaign)
