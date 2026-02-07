from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID, uuid4

from app.core.database import get_db
from app.models.user import User
from app.models.project import Project, generate_share_token
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectDetailResponse,
    ShareLinkResponse,
)
from app.api.deps import get_current_user, verify_project_access
from app.services.storage_service import storage_service

router = APIRouter()


# Helper to get project by share token
async def get_project_by_share_token(
    share_token: str,
    db: AsyncSession,
) -> Optional[Project]:
    """Get a project by its share token if sharing is enabled"""
    result = await db.execute(
        select(Project).where(
            Project.share_token == share_token,
            Project.share_enabled == True,
        )
    )
    return result.scalar_one_or_none()


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project)
        .where(Project.user_id == current_user.id)
        .order_by(Project.updated_at.desc())
    )
    projects = result.scalars().all()
    return projects


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(
        user_id=current_user.id,
        name=project_data.name,
        description=project_data.description,
        canvas_state={},
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id, Project.user_id == current_user.id)
        .options(
            selectinload(Project.nodes),
            selectinload(Project.connections),
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    project_data: ProjectUpdate,
    project: Project = Depends(verify_project_access),
    db: AsyncSession = Depends(get_db),
):
    if project_data.name is not None:
        project.name = project_data.name
    if project_data.description is not None:
        project.description = project_data.description
    if project_data.canvas_state is not None:
        project.canvas_state = project_data.canvas_state
    if project_data.thumbnail_url is not None:
        project.thumbnail_url = project_data.thumbnail_url

    await db.commit()
    await db.refresh(project)
    return project


@router.post("/{project_id}/thumbnail")
async def upload_project_thumbnail(
    project_id: UUID,
    file: UploadFile = File(...),
    project: Project = Depends(verify_project_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a thumbnail image for a project"""
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )

    # Delete all old thumbnails for this project
    deleted_count = await storage_service.delete_project_thumbnails(
        str(current_user.id),
        str(project_id)
    )
    if deleted_count > 0:
        print(f"Deleted {deleted_count} old thumbnail(s) for project {project_id}")

    # Generate unique object name
    file_id = str(uuid4())
    extension = file.filename.split(".")[-1] if file.filename and "." in file.filename else "png"
    object_name = f"thumbnails/{current_user.id}/{project_id}/{file_id}.{extension}"

    # Read file content
    content = await file.read()

    # Upload to storage (returns signed URL valid for 7 days)
    thumbnail_url = await storage_service.upload_file(
        file_data=content,
        object_name=object_name,
        content_type=file.content_type,
    )

    # Update project with the signed URL
    project.thumbnail_url = thumbnail_url
    await db.commit()
    await db.refresh(project)

    return {
        "thumbnail_url": thumbnail_url,
        "object_name": object_name,
    }


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    project: Project = Depends(verify_project_access),
    db: AsyncSession = Depends(get_db),
):
    await db.delete(project)
    await db.commit()


# ============================================
# Sharing Endpoints
# ============================================

@router.post("/{project_id}/share", response_model=ShareLinkResponse)
async def enable_sharing(
    project_id: UUID,
    request: Request,
    project: Project = Depends(verify_project_access),
    db: AsyncSession = Depends(get_db),
):
    """Enable sharing for a project and get the share link"""
    # Generate token if not exists
    if not project.share_token:
        project.share_token = generate_share_token()
    
    project.share_enabled = True
    await db.commit()
    await db.refresh(project)
    
    # Build share URL
    base_url = str(request.base_url).rstrip('/')
    # Frontend URL - assuming it's on a different port or same origin
    frontend_url = base_url.replace(':8000', ':3000')  # Adjust as needed
    share_url = f"{frontend_url}/main?share={project.share_token}"
    
    return ShareLinkResponse(
        share_enabled=True,
        share_token=project.share_token,
        share_url=share_url,
    )


@router.delete("/{project_id}/share", response_model=ShareLinkResponse)
async def disable_sharing(
    project_id: UUID,
    project: Project = Depends(verify_project_access),
    db: AsyncSession = Depends(get_db),
):
    """Disable sharing for a project"""
    project.share_enabled = False
    await db.commit()
    await db.refresh(project)
    
    return ShareLinkResponse(
        share_enabled=False,
        share_token=None,
        share_url=None,
    )


@router.post("/{project_id}/share/regenerate", response_model=ShareLinkResponse)
async def regenerate_share_link(
    project_id: UUID,
    request: Request,
    project: Project = Depends(verify_project_access),
    db: AsyncSession = Depends(get_db),
):
    """Regenerate the share token (invalidates old links)"""
    project.share_token = generate_share_token()
    project.share_enabled = True
    await db.commit()
    await db.refresh(project)
    
    frontend_url = str(request.base_url).rstrip('/').replace(':8000', ':3000')
    share_url = f"{frontend_url}/main?share={project.share_token}"
    
    return ShareLinkResponse(
        share_enabled=True,
        share_token=project.share_token,
        share_url=share_url,
    )


@router.get("/{project_id}/share", response_model=ShareLinkResponse)
async def get_share_status(
    project_id: UUID,
    request: Request,
    project: Project = Depends(verify_project_access),
    db: AsyncSession = Depends(get_db),
):
    """Get current sharing status for a project"""
    share_url = None
    if project.share_enabled and project.share_token:
        frontend_url = str(request.base_url).rstrip('/').replace(':8000', ':3000')
        share_url = f"{frontend_url}/main?share={project.share_token}"
    
    return ShareLinkResponse(
        share_enabled=project.share_enabled or False,
        share_token=project.share_token if project.share_enabled else None,
        share_url=share_url,
    )


# ============================================
# Shared Project Access (Public endpoint)
# ============================================

@router.get("/shared/{share_token}", response_model=ProjectDetailResponse)
async def get_shared_project(
    share_token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Access a project via share token.
    This is a public endpoint - no authentication required.
    """
    result = await db.execute(
        select(Project)
        .where(
            Project.share_token == share_token,
            Project.share_enabled == True,
        )
        .options(
            selectinload(Project.nodes),
            selectinload(Project.connections),
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared project not found or sharing is disabled",
        )
    
    return project
