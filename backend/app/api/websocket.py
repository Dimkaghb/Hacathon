from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional

from app.core.database import AsyncSessionLocal
from app.core.security import decode_token
from app.core.websocket_manager import manager
from app.models.user import User
from app.models.project import Project

router = APIRouter()


async def get_user_from_token(token: str) -> Optional[User]:
    """Validate token and get user"""
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == UUID(user_id)))
        return result.scalar_one_or_none()


async def verify_project_access_ws(user: User, project_id: UUID) -> bool:
    """Verify user has access to project"""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Project).where(
                Project.id == project_id,
                Project.user_id == user.id,
            )
        )
        return result.scalar_one_or_none() is not None


@router.websocket("/projects/{project_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    project_id: UUID,
    token: str = Query(...),
):
    # Authenticate user
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    # Verify project access
    has_access = await verify_project_access_ws(user, project_id)
    if not has_access:
        await websocket.close(code=4003, reason="Forbidden")
        return

    # Connect to project room
    await manager.connect(websocket, str(project_id))

    try:
        # Send connection confirmation
        await manager.send_personal_message(
            {
                "type": "connected",
                "project_id": str(project_id),
                "user_id": str(user.id),
            },
            websocket,
        )

        # Listen for messages
        while True:
            data = await websocket.receive_json()

            # Handle different message types
            message_type = data.get("type")

            if message_type == "ping":
                await manager.send_personal_message({"type": "pong"}, websocket)

            elif message_type == "cursor_move":
                # Broadcast cursor position to other users
                await manager.broadcast_to_project(
                    str(project_id),
                    {
                        "type": "cursor_move",
                        "user_id": str(user.id),
                        "x": data.get("x"),
                        "y": data.get("y"),
                    },
                )

            elif message_type == "node_select":
                # Broadcast node selection
                await manager.broadcast_to_project(
                    str(project_id),
                    {
                        "type": "node_select",
                        "user_id": str(user.id),
                        "node_id": data.get("node_id"),
                    },
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket, str(project_id))
        # Notify others about disconnection
        await manager.broadcast_to_project(
            str(project_id),
            {
                "type": "user_disconnected",
                "user_id": str(user.id),
            },
        )
