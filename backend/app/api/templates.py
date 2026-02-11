"""
Templates API

Pre-built multi-node graph templates (video formats like Testimonial, GRWM, Unboxing).
System templates are public; users can also create custom templates.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional

from app.core.database import get_db
from app.models.user import User
from app.models.template import Template
from app.models.node import Node, NodeType, NodeStatus
from app.models.connection import Connection
from app.schemas.template import (
    TemplateCreate,
    TemplateResponse,
    TemplateInstantiateRequest,
    TemplateInstantiateResponse,
)
from app.api.deps import get_current_user, verify_project_access

router = APIRouter()


@router.get("", response_model=list[TemplateResponse])
async def list_templates(
    category: Optional[str] = Query(None, description="Filter by category"),
    db: AsyncSession = Depends(get_db),
):
    """List all templates. Optionally filter by category. No auth required."""
    query = select(Template).order_by(
        Template.usage_count.desc(),
        Template.name.asc(),
    )
    if category:
        query = query.where(Template.category == category)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single template by ID. No auth required."""
    result = await db.execute(
        select(Template).where(Template.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.post("", response_model=TemplateResponse, status_code=201)
async def create_template(
    data: TemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a custom template. Requires auth."""
    template = Template(
        name=data.name,
        description=data.description,
        category=data.category,
        graph_definition=data.graph_definition,
        scene_count=data.scene_count,
        estimated_duration=data.estimated_duration,
        best_for=data.best_for,
        thumbnail_url=data.thumbnail_url,
        is_system=False,
        creator_id=current_user.id,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a user template. Only the creator can delete. Requires auth."""
    result = await db.execute(
        select(Template).where(Template.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if template.is_system:
        raise HTTPException(status_code=403, detail="Cannot delete system templates")
    if template.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this template")
    await db.delete(template)
    await db.commit()


def _substitute_string(text: str, variables: dict[str, str]) -> str:
    """Substitute {variable_key} placeholders in a single string."""
    for var_key, var_value in variables.items():
        text = text.replace(f"{{{var_key}}}", var_value)
    return text


def _substitute_variables(data: dict, variables: dict[str, str]) -> dict:
    """Recursively substitute {variable_key} placeholders in string values."""
    result = {}
    for key, value in data.items():
        if isinstance(value, str):
            result[key] = _substitute_string(value, variables)
        elif isinstance(value, dict):
            result[key] = _substitute_variables(value, variables)
        elif isinstance(value, list):
            new_list = []
            for item in value:
                if isinstance(item, dict):
                    new_list.append(_substitute_variables(item, variables))
                elif isinstance(item, str):
                    new_list.append(_substitute_string(item, variables))
                else:
                    new_list.append(item)
            result[key] = new_list
        else:
            result[key] = value
    return result


@router.post("/{template_id}/instantiate", response_model=TemplateInstantiateResponse)
async def instantiate_template(
    template_id: UUID,
    data: TemplateInstantiateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stamp a template onto a project canvas, creating nodes and connections."""
    # Load template
    result = await db.execute(
        select(Template).where(Template.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Verify project access
    project = await verify_project_access(data.project_id, None, current_user, db)

    graph = template.graph_definition or {}
    node_defs = graph.get("nodes", [])
    connection_defs = graph.get("connections", [])
    variables = data.variables or {}

    # Map ref_id -> created node id
    ref_to_node_id: dict[str, uuid.UUID] = {}
    created_nodes = []
    created_connections = []

    # Create nodes
    for node_def in node_defs:
        ref_id = node_def.get("ref_id", str(uuid.uuid4()))
        node_type_str = node_def.get("type", "scene")
        position = node_def.get("position", {"x": 0, "y": 0})
        node_data = node_def.get("data", {})

        # Variable substitution in node data
        if variables and isinstance(node_data, dict):
            node_data = _substitute_variables(node_data, variables)

        # Substitute in label if present
        label = node_def.get("label", "")
        if variables and label:
            label = _substitute_string(label, variables)

        # Add label to data
        if label:
            node_data["label"] = label

        # Map string type to NodeType enum
        try:
            node_type = NodeType(node_type_str)
        except ValueError:
            node_type = NodeType.SCENE

        node = Node(
            id=uuid.uuid4(),
            project_id=data.project_id,
            type=node_type,
            position_x=position.get("x", 0) + data.offset_x,
            position_y=position.get("y", 0) + data.offset_y,
            data=node_data,
            status=NodeStatus.IDLE,
        )
        db.add(node)
        ref_to_node_id[ref_id] = node.id
        created_nodes.append(node)

    # Flush to ensure node IDs are available
    await db.flush()

    # Create connections
    for conn_def in connection_defs:
        source_ref = conn_def.get("source")
        target_ref = conn_def.get("target")

        source_node_id = ref_to_node_id.get(source_ref)
        target_node_id = ref_to_node_id.get(target_ref)

        if not source_node_id or not target_node_id:
            continue

        connection = Connection(
            id=uuid.uuid4(),
            project_id=data.project_id,
            source_node_id=source_node_id,
            target_node_id=target_node_id,
            source_handle=conn_def.get("source_handle"),
            target_handle=conn_def.get("target_handle"),
        )
        db.add(connection)
        created_connections.append(connection)

    # Increment usage count
    template.usage_count = (template.usage_count or 0) + 1

    await db.commit()

    # Refresh all objects
    for node in created_nodes:
        await db.refresh(node)
    for conn in created_connections:
        await db.refresh(conn)

    return TemplateInstantiateResponse(
        nodes=[
            {
                "id": str(n.id),
                "project_id": str(n.project_id),
                "type": n.type.value if hasattr(n.type, 'value') else str(n.type),
                "position_x": n.position_x,
                "position_y": n.position_y,
                "data": n.data or {},
                "status": n.status.value if hasattr(n.status, 'value') else str(n.status),
                "error_message": n.error_message,
                "created_at": n.created_at.isoformat() if n.created_at else None,
                "updated_at": n.updated_at.isoformat() if n.updated_at else None,
            }
            for n in created_nodes
        ],
        connections=[
            {
                "id": str(c.id),
                "project_id": str(c.project_id),
                "source_node_id": str(c.source_node_id),
                "target_node_id": str(c.target_node_id),
                "source_handle": c.source_handle,
                "target_handle": c.target_handle,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in created_connections
        ],
    )
