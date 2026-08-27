"""
EngageAI — Notification Service
Manages notification creation, retrieval, and acknowledgment tracking.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.models.analytics import Notification, NotificationChannel, NotificationSeverity


class NotificationService:
    """Manages system notifications and alerts."""

    async def list_notifications(
        self, db: AsyncSession, limit: int = 20, unread_only: bool = False
    ) -> list[Notification]:
        """Fetch latest notifications."""
        query = select(Notification)
        if unread_only:
            query = query.where(Notification.acknowledged == False)

        query = query.order_by(desc(Notification.sent_at)).limit(limit)
        res = await db.execute(query)
        return list(res.scalars().all())

    async def acknowledge_notification(self, db: AsyncSession, notif_id: UUID) -> bool:
        """Mark notification as acknowledged."""
        res = await db.execute(select(Notification).where(Notification.id == notif_id))
        notif = res.scalar_one_or_none()
        if not notif:
            return False

        notif.acknowledged = True
        notif.acknowledged_at = datetime.now(timezone.utc)
        await db.commit()
        return True


notification_service = NotificationService()
