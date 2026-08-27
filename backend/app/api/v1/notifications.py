"""
EngageAI — Notifications Router
Endpoints for viewing system notifications and acknowledging alerts.
"""

from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_db_session
from app.services.notification_service import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
async def list_user_notifications(
    limit: int = 20,
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db_session)
):
    """Retrieve recent notifications and alerts."""
    items = await notification_service.list_notifications(db, limit=limit, unread_only=unread_only)
    return {"notifications": items}


@router.post("/{notification_id}/acknowledge")
async def acknowledge_notification_item(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db_session)
):
    """Mark alert notification as acknowledged."""
    success = await notification_service.acknowledge_notification(db, notification_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return {"status": "acknowledged", "id": str(notification_id)}
