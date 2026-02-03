from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.models.project import Project
from app.models.node import Node
from app.models.connection import Connection
from app.schemas.connection import ConnectionCreate, ConnectionResponse
from app.api.deps import verify_project_access

router = APIRouter()


@router.get("/{project_id}/connections", response_model=List[ConnectionResponse])
async def list_connections(
    project: Project = Depends(verify_project_access),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Connection).where(Connection.project_id == project.id)
    )
    connections = result.scalars().all()
    return connections


@router.post(
    "/{project_id}/connections",
    response_model=ConnectionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_connection(
    connection_data: ConnectionCreate,
    project: Project = Depends(verify_project_access),
    db: AsyncSession = Depends(get_db),
):
    # Verify source node exists and belongs to project
    source_result = await db.execute(
        select(Node).where(
            Node.id == connection_data.source_node_id,
            Node.project_id == project.id,
        )
    )
    source_node = source_result.scalar_one_or_none()
    if not source_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source node not found",
        )

    # Verify target node exists and belongs to project
    target_result = await db.execute(
        select(Node).where(
            Node.id == connection_data.target_node_id,
            Node.project_id == project.id,
        )
    )
    target_node = target_result.scalar_one_or_none()
    if not target_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target node not found",
        )

    # Check for duplicate connection
    existing_result = await db.execute(
        select(Connection).where(
            Connection.source_node_id == connection_data.source_node_id,
            Connection.target_node_id == connection_data.target_node_id,
            Connection.source_handle == connection_data.source_handle,
            Connection.target_handle == connection_data.target_handle,
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connection already exists",
        )

    # Prevent self-loops
    if connection_data.source_node_id == connection_data.target_node_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot connect a node to itself",
        )

    connection = Connection(
        project_id=project.id,
        source_node_id=connection_data.source_node_id,
        target_node_id=connection_data.target_node_id,
        source_handle=connection_data.source_handle,
        target_handle=connection_data.target_handle,
    )
    db.add(connection)
    await db.commit()
    await db.refresh(connection)

    return connection


@router.delete(
    "/{project_id}/connections/{connection_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_connection(
    connection_id: UUID,
    project: Project = Depends(verify_project_access),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Connection).where(
            Connection.id == connection_id,
            Connection.project_id == project.id,
        )
    )
    connection = result.scalar_one_or_none()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found",
        )

    await db.delete(connection)
    await db.commit()
