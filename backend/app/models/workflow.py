"""
EngageAI — Workflow ORM Models
Workflow rules and execution history.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
)
from app.models.types import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ActionType(str, enum.Enum):
    """Type of action a workflow executes."""
    CREATE_TICKET = "create_ticket"
    SEND_NOTIFICATION = "send_notification"
    ASSIGN_TEAM = "assign_team"
    ESCALATE = "escalate"
    AUTO_RESPOND = "auto_respond"
    TAG = "tag"


class WorkflowExecutionStatus(str, enum.Enum):
    """Status of a workflow execution."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class Workflow(Base):
    """
    Workflow rule definition — if-this-then-that automation rules.
    trigger_condition is a JSONB structure defining matching criteria.
    """
    __tablename__ = "workflows"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    trigger_condition: Mapped[dict] = mapped_column(
        JSONB, nullable=False,
        comment='JSON trigger rules, e.g. {"category": "bug", "priority_gte": "high"}'
    )
    action_type: Mapped[ActionType] = mapped_column(
        Enum(ActionType, name="action_type", create_constraint=True),
        nullable=False,
    )
    action_config: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=dict,
        comment="Action-specific configuration (ticket system, notification channel, etc.)"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    executions: Mapped[list["WorkflowExecution"]] = relationship(
        "WorkflowExecution", back_populates="workflow", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Workflow(id={self.id}, name={self.name}, active={self.is_active})>"


class WorkflowExecution(Base):
    """Record of a workflow execution against a specific feedback item."""
    __tablename__ = "workflow_executions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, default=uuid.uuid4
    )
    workflow_id: Mapped[uuid.UUID] = mapped_column(
        UUID,
        ForeignKey("workflows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    feedback_id: Mapped[uuid.UUID] = mapped_column(
        UUID,
        ForeignKey("feedback.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[WorkflowExecutionStatus] = mapped_column(
        Enum(WorkflowExecutionStatus, name="workflow_execution_status", create_constraint=True),
        nullable=False,
        default=WorkflowExecutionStatus.PENDING,
    )
    executed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    result_payload: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True,
        comment="Result data from the workflow execution"
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    workflow: Mapped[Workflow] = relationship("Workflow", back_populates="executions")

    def __repr__(self) -> str:
        return f"<WorkflowExecution(id={self.id}, status={self.status})>"
