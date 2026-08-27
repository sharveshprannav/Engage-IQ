"""
EngageAI — Analytics & Audit ORM Models
Analytics snapshots, notifications, and audit logs.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    String,
    Text,
)
from app.models.types import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MetricType(str, enum.Enum):
    """Type of analytics metric."""
    SENTIMENT_TREND = "sentiment_trend"
    VOLUME_BY_CATEGORY = "volume_by_category"
    PRIORITY_DISTRIBUTION = "priority_distribution"
    RESPONSE_TIME = "response_time"
    SLA_COMPLIANCE = "sla_compliance"
    CLUSTER_SUMMARY = "cluster_summary"
    CUSTOMER_SATISFACTION = "customer_satisfaction"
    AGENT_PERFORMANCE = "agent_performance"


class NotificationChannel(str, enum.Enum):
    """Notification delivery channel."""
    EMAIL = "email"
    SLACK = "slack"
    IN_APP = "in_app"
    WEBHOOK = "webhook"


class NotificationSeverity(str, enum.Enum):
    """Notification severity level."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    ESCALATION = "escalation"


class AnalyticsSnapshot(Base):
    """
    Pre-computed analytics snapshots for dashboard performance.
    Stores time-bucketed metric values as JSONB.
    """
    __tablename__ = "analytics_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, default=uuid.uuid4
    )
    metric_type: Mapped[MetricType] = mapped_column(
        Enum(MetricType, name="metric_type", create_constraint=True),
        nullable=False,
        index=True,
    )
    time_bucket: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    value: Mapped[dict] = mapped_column(
        JSONB, nullable=False,
        comment="Metric value payload — structure depends on metric_type"
    )
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    def __repr__(self) -> str:
        return f"<AnalyticsSnapshot(metric={self.metric_type}, bucket={self.time_bucket})>"


class Notification(Base):
    """Notification records for all alert channels."""
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, default=uuid.uuid4
    )
    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel, name="notification_channel", create_constraint=True),
        nullable=False,
        index=True,
    )
    recipient: Mapped[str] = mapped_column(
        String(255), nullable=False,
        comment="Email address, Slack channel, user ID, or webhook URL"
    )
    severity: Mapped[NotificationSeverity] = mapped_column(
        Enum(NotificationSeverity, name="notification_severity", create_constraint=True),
        nullable=False,
        default=NotificationSeverity.INFO,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    feedback_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID, nullable=True, index=True,
        comment="Related feedback ID if applicable"
    )
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    acknowledged_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, channel={self.channel}, severity={self.severity})>"


class AuditLog(Base):
    """
    Audit log for tracking all system actions.
    Records actor, action, entity context, and timestamp.
    """
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, default=uuid.uuid4
    )
    actor: Mapped[str] = mapped_column(
        String(255), nullable=False,
        comment="User email, agent name, or 'system'"
    )
    action: Mapped[str] = mapped_column(
        String(255), nullable=False,
        comment="Action performed (e.g., 'feedback.created', 'ticket.auto_created')"
    )
    entity_type: Mapped[str] = mapped_column(
        String(100), nullable=False,
        comment="Type of entity acted upon (feedback, ticket, workflow, etc.)"
    )
    entity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID, nullable=True, index=True
    )
    details: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True,
        comment="Additional context about the action"
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    def __repr__(self) -> str:
        return f"<AuditLog(actor={self.actor}, action={self.action}, entity={self.entity_type})>"
