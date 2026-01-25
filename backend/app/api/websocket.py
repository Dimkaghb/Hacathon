from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID, uuid4
from typing import Optional

from app.core.database import AsyncSessionLocal
from app.core.security import decode_token
from app.core.websocket_manager import manager
from app.models.user import User
from app.models.project import Project

router = APIRouter()


async def get_user_from_token(token: str) -> Optional[User]:
    """Validate token and get user"""
    if not token or token == "guest":
        return None
        
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == UUID(user_id)))
        return result.scalar_one_or_none()


async def verify_project_access_ws(user: Optional[User], project_id: UUID, share_token: Optional[str] = None) -> bool:
    """Verify access to project - either by ownership or share token"""
    async with AsyncSessionLocal() as db:
        # Check share token access first
        if share_token:
            result = await db.execute(
                select(Project).where(
                    Project.id == project_id,
                    Project.share_token == share_token,
                    Project.share_enabled == True,
                )
            )
            if result.scalar_one_or_none():
                return True
        
        # Check owner access
        if user:
            result = await db.execute(
                select(Project).where(
                    Project.id == project_id,
                    Project.user_id == user.id,
                )
            )
            if result.scalar_one_or_none():
                return True
        
        return False


@router.websocket("/projects/{project_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    project_id: UUID,
    token: str = Query(default="guest"),
    share: Optional[str] = Query(default=None),
):
    # Try to authenticate user (optional for shared projects)
    user = await get_user_from_token(token)
    
    # Generate a guest ID for unauthenticated users
    user_id = str(user.id) if user else f"guest_{uuid4().hex[:8]}"

    # Verify project access (either owner or via share token)
    has_access = await verify_project_access_ws(user, project_id, share)
    if not has_access:
        await websocket.close(code=4003, reason="Forbidden - No access to this project")
        return

    # Connect to project room
    await manager.connect(websocket, str(project_id))

    try:
        # Send connection confirmation
        await manager.send_personal_message(
            {
                "type": "connected",
                "project_id": str(project_id),
                "user_id": user_id,
                "is_guest": user is None,
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
                        "user_id": user_id,
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
                        "user_id": user_id,
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
                "user_id": user_id,
            },
        )
