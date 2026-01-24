from fastapi import WebSocket
from typing import Dict, Set
import json


class ConnectionManager:
    def __init__(self):
        # project_id -> set of websocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = set()
        self.active_connections[project_id].add(websocket)

    def disconnect(self, websocket: WebSocket, project_id: str):
        if project_id in self.active_connections:
            self.active_connections[project_id].discard(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast_to_project(self, project_id: str, message: dict):
        if project_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[project_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    disconnected.add(connection)
            # Clean up disconnected clients
            for conn in disconnected:
                self.active_connections[project_id].discard(conn)

    async def broadcast_node_update(
        self, project_id: str, node_id: str, update_type: str, data: dict
    ):
        message = {
            "type": "node_update",
            "node_id": node_id,
            "update_type": update_type,
            "data": data,
        }
        await self.broadcast_to_project(project_id, message)

    async def broadcast_job_progress(
        self, project_id: str, node_id: str, progress: int, status: str, message: str = ""
    ):
        msg = {
            "type": "job_progress",
            "node_id": node_id,
            "progress": progress,
            "status": status,
            "message": message,
        }
        await self.broadcast_to_project(project_id, msg)


manager = ConnectionManager()
