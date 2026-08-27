"""
EngageAI — WebSocket & SSE Gateway Router
Native WebSocket endpoint (/ws/feedback-stream) + SSE fallback endpoint (/api/v1/stream).
"""

from __future__ import annotations

import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

from app.websocket.manager import ws_manager
from app.core.logging import get_logger

logger = get_logger("WebSocketGateway")

websocket_router = APIRouter(tags=["Real-Time Streaming"])


@websocket_router.websocket("/ws/feedback-stream")
async def feedback_stream_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time dashboard events.
    Broadcasting new feedback, priority updates, agent actions, and alert notifications.
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep-alive heartbeat listener
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error("websocket_error", error=str(e))
        ws_manager.disconnect(websocket)


@websocket_router.get("/api/v1/stream")
async def sse_stream_fallback():
    """
    Server-Sent Events (SSE) fallback endpoint for environments where WebSockets are blocked by proxies/firewalls.
    """
    async def event_generator():
        while True:
            await asyncio.sleep(15)
            # Heartbeat SSE comment
            yield "event: heartbeat\ndata: {}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
