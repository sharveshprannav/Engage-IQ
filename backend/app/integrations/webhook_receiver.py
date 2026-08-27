"""
EngageAI — Webhook Ingestion Receiver Router
Public webhook endpoint for receiving raw customer feedback payloads from external services (Zendesk, Intercom, Typeform).
"""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_db_session
from app.services.feedback_service import feedback_service
from app.schemas.feedback import FeedbackCreate

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/ingest", status_code=status.HTTP_201_CREATED)
async def handle_incoming_webhook(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db_session)
):
    """
    Ingest webhook payload, normalize fields, and trigger AI processing pipeline.
    """
    text = payload.get("text") or payload.get("raw_text") or payload.get("body") or payload.get("message", "")
    if not text:
        return {"status": "skipped", "reason": "No feedback text found in payload"}

    dto = FeedbackCreate(
        source_channel="webhook",
        raw_text=text,
        customer_id=str(payload.get("customer_id") or payload.get("user_id") or "anon"),
        customer_email=payload.get("customer_email") or payload.get("email"),
        customer_tier=payload.get("customer_tier", "free")
    )

    fb = await feedback_service.create_feedback(db, dto)
    return {"status": "success", "feedback_id": str(fb.id), "priority": fb.priority.value}
