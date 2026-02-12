from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Set
from uuid import UUID, uuid4
import copy

from app.core.database import get_db
from app.models.project import Project
from app.models.node import Node, NodeType, NodeStatus
from app.models.connection import Connection
from app.schemas.node import NodeCreate, NodeUpdate, NodeResponse, BranchConfig, BranchResponse, ConnectionResponse
from app.api.deps import verify_project_access

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


async def collect_downstream_chain(
    db: AsyncSession, project_id: UUID, start_node_id: UUID
) -> List[Node]:
    """BFS traversal to collect all nodes downstream of start_node_id (inclusive)."""
    visited: Set[UUID] = set()
    queue = [start_node_id]
    result = []

    while queue:
        current_id = queue.pop(0)
        if current_id in visited:
            continue
        visited.add(current_id)

        res = await db.execute(
            select(Node).where(Node.id == current_id, Node.project_id == project_id)
        )
        node = res.scalar_one_or_none()
        if node:
            result.append(node)

        outgoing = await db.execute(
            select(Connection).where(
                Connection.project_id == project_id,
                Connection.source_node_id == current_id,
            )
        )
        for conn in outgoing.scalars():
            if conn.target_node_id not in visited:
                queue.append(conn.target_node_id)

    return result


@router.post(
    "/{project_id}/nodes/{node_id}/branch",
    response_model=BranchResponse,
    status_code=status.HTTP_201_CREATED,
)
async def branch_from_node(
    node_id: UUID,
    branch_config: BranchConfig,
    project: Project = Depends(verify_project_access),
    db: AsyncSession = Depends(get_db),
):
    """
    Clone all downstream nodes from the branch point.

    Given: A → B → C → D
    Branch from B creates: A → B → C → D   (original)
                           A → B' → C' → D' (branch)

    Upstream connections (A → B) are duplicated so A also feeds B'.
    """
    # 1. Verify branch point exists
    result = await db.execute(
        select(Node).where(Node.id == node_id, Node.project_id == project.id)
    )
    branch_node = result.scalar_one_or_none()
    if not branch_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found",
        )

    # 2. Collect downstream chain (includes branch point itself)
    downstream_nodes = await collect_downstream_chain(db, project.id, node_id)

    downstream_ids = {n.id for n in downstream_nodes}
    branch_group_id = str(uuid4())
    offset_y = branch_config.offset_y

    # 3. Clone each downstream node with Y offset
    clone_map: Dict[UUID, Node] = {}  # original_id -> cloned_node

    for original_node in downstream_nodes:
        cloned_data = copy.deepcopy(original_node.data) if original_node.data else {}

        # Clear generated content from cloned data
        for key in ["video_url", "veo_video_uri", "veo_video_name", "progress", "progress_message"]:
            cloned_data.pop(key, None)

        # Tag with branch group
        cloned_data["branch_group_id"] = branch_group_id
        cloned_data["branch_source_node_id"] = str(original_node.id)

        # Apply modifications if provided
        if branch_config.modifications:
            mods = branch_config.modifications.get(str(original_node.id))
            if mods:
                cloned_data.update(mods)

        cloned = Node(
            project_id=project.id,
            type=original_node.type,
            position_x=original_node.position_x,
            position_y=original_node.position_y + offset_y,
            data=cloned_data,
            character_id=original_node.character_id,
            status=NodeStatus.IDLE,
        )
        db.add(cloned)
        await db.flush()
        clone_map[original_node.id] = cloned

    # 4. Clone internal connections (between downstream nodes)
    cloned_connections = []
    all_connections = await db.execute(
        select(Connection).where(Connection.project_id == project.id)
    )
    for conn in all_connections.scalars():
        if conn.source_node_id in downstream_ids and conn.target_node_id in downstream_ids:
            # Internal connection — clone with mapped IDs
            new_conn = Connection(
                project_id=project.id,
                source_node_id=clone_map[conn.source_node_id].id,
                target_node_id=clone_map[conn.target_node_id].id,
                source_handle=conn.source_handle,
                target_handle=conn.target_handle,
            )
            db.add(new_conn)
            await db.flush()
            cloned_connections.append(new_conn)

    # 5. Re-attach upstream connections to cloned entry point
    # (connections where target is the branch point but source is NOT downstream)
    upstream_connections = await db.execute(
        select(Connection).where(
            Connection.project_id == project.id,
            Connection.target_node_id == node_id,
        )
    )
    for conn in upstream_connections.scalars():
        if conn.source_node_id not in downstream_ids:
            new_conn = Connection(
                project_id=project.id,
                source_node_id=conn.source_node_id,
                target_node_id=clone_map[node_id].id,
                source_handle=conn.source_handle,
                target_handle=conn.target_handle,
            )
            db.add(new_conn)
            await db.flush()
            cloned_connections.append(new_conn)

    # Also tag original nodes with branch group for visual grouping
    for original_node in downstream_nodes:
        original_data = copy.deepcopy(original_node.data) if original_node.data else {}
        if "branch_group_id" not in original_data:
            original_data["branch_group_id"] = branch_group_id
            original_node.data = original_data

    await db.commit()

    # Refresh all cloned nodes for response
    cloned_node_list = []
    for original_id, cloned in clone_map.items():
        await db.refresh(cloned)
        cloned_node_list.append(cloned)

    for conn in cloned_connections:
        await db.refresh(conn)

    return BranchResponse(
        cloned_nodes=cloned_node_list,
        cloned_connections=cloned_connections,
        branch_group_id=branch_group_id,
    )
