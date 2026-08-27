"""
EngageAI — WebSocket Connection Manager
Handles active WebSocket client connections and broadcasts live updates
(new feedback, priority changes, agent actions, notifications).
"""

from __future__ import annotations

import json
from typing import Any
from fastapi import WebSocket
from app.core.logging import get_logger

logger = get_logger("WebSocketManager")


class ConnectionManager:
    """Manages active WebSocket client connections."""

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """Accept connection and store websocket reference."""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("websocket_client_connected", active_total=len(self.active_connections))

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove disconnected websocket."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("websocket_client_disconnected", active_total=len(self.active_connections))

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Broadcast JSON event payload to all connected clients."""
        if not self.active_connections:
            return

        payload = json.dumps(message)
        disconnected = []

        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning("websocket_send_failed", error=str(e))
                disconnected.append(connection)

        # Cleanup disconnected clients
        for conn in disconnected:
            self.disconnect(conn)


ws_manager = ConnectionManager()
