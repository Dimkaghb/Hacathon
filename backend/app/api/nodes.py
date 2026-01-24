from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.models.project import Project
from app.models.node import Node, NodeType, NodeStatus
from app.schemas.node import NodeCreate, NodeUpdate, NodeResponse
from app.api.deps import verify_project_access
from app.core.websocket_manager import manager

router = APIRouter()


@router.get("/{project_id}/nodes", response_model=List[NodeResponse])
async def list_nodes(
    project: Project = Depends(verify_project_access),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Node).where(Node.project_id == project.id)
    )
    nodes = result.scalars().all()
    return nodes


@router.post(
    "/{project_id}/nodes",
    response_model=NodeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_node(
    node_data: NodeCreate,
    project: Project = Depends(verify_project_access),
    db: AsyncSession = Depends(get_db),
):
    node = Node(
        project_id=project.id,
        type=NodeType(node_data.type.value),
        position_x=node_data.position_x,
        position_y=node_data.position_y,
        data=node_data.data,
        character_id=node_data.character_id,
        status=NodeStatus.IDLE,
    )
    db.add(node)
    await db.commit()
    await db.refresh(node)

    # Broadcast to WebSocket clients
    await manager.broadcast_node_update(
        str(project.id),
        str(node.id),
        "created",
        {
            "id": str(node.id),
            "type": node.type.value,
            "position_x": node.position_x,
            "position_y": node.position_y,
            "data": node.data,
            "status": node.status.value,
        },
    )

    return node


@router.get("/{project_id}/nodes/{node_id}", response_model=NodeResponse)
async def get_node(
    node_id: UUID,
    project: Project = Depends(verify_project_access),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Node).where(Node.id == node_id, Node.project_id == project.id)
    )
    node = result.scalar_one_or_none()

    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found",
        )

    return node


@router.put("/{project_id}/nodes/{node_id}", response_model=NodeResponse)
async def update_node(
    node_id: UUID,
    node_data: NodeUpdate,
    project: Project = Depends(verify_project_access),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Node).where(Node.id == node_id, Node.project_id == project.id)
    )
    node = result.scalar_one_or_none()

    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found",
        )

    if node_data.position_x is not None:
        node.position_x = node_data.position_x
    if node_data.position_y is not None:
        node.position_y = node_data.position_y
    if node_data.data is not None:
        node.data = {**node.data, **node_data.data}
    if node_data.character_id is not None:
        node.character_id = node_data.character_id

    await db.commit()
    await db.refresh(node)

    # Broadcast update
    await manager.broadcast_node_update(
        str(project.id),
        str(node.id),
        "updated",
        {
            "id": str(node.id),
            "position_x": node.position_x,
            "position_y": node.position_y,
            "data": node.data,
            "status": node.status.value,
        },
    )

    return node


@router.delete("/{project_id}/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_node(
    node_id: UUID,
    project: Project = Depends(verify_project_access),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Node).where(Node.id == node_id, Node.project_id == project.id)
    )
    node = result.scalar_one_or_none()

    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found",
        )

    await db.delete(node)
    await db.commit()

    # Broadcast deletion
    await manager.broadcast_node_update(
        str(project.id),
        str(node_id),
        "deleted",
        {"id": str(node_id)},
    )
