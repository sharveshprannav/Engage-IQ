"""
EngageAI — Feedback ORM Models
Feedback, FeedbackCluster, and FeedbackClusterMember models.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SourceChannel(str, enum.Enum):
    """Source channel for feedback ingestion."""
    EMAIL = "email"
    WIDGET = "widget"
    API = "api"
    CSV = "csv"
    WEBHOOK = "webhook"


class FeedbackCategory(str, enum.Enum):
    """AI-classified feedback category."""
    BUG = "bug"
    FEATURE_REQUEST = "feature_request"
    COMPLAINT = "complaint"
    PRAISE = "praise"
    INQUIRY = "inquiry"


class FeedbackPriority(str, enum.Enum):
    """Priority tier for feedback."""
    NORMAL = "normal"
    LOW = "low"
    HIGH = "high"
    VERY_HIGH = "very_high"


class FeedbackStatus(str, enum.Enum):
    """Current status of feedback in the workflow."""
    NEW = "new"
    TRIAGED = "triaged"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class CustomerTier(str, enum.Enum):
    """Customer tier for priority weighting."""
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class Feedback(Base):
    """
    Primary feedback model — stores customer feedback with AI analysis results.
    Indexes on created_at, status, priority, category for dashboard query performance.
    """
    __tablename__ = "feedback"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, default=uuid.uuid4
    )
    source_channel: Mapped[SourceChannel] = mapped_column(
        Enum(SourceChannel, name="source_channel", create_constraint=True),
        nullable=False,
        index=True,
    )
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    customer_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )
    customer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    customer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    customer_tier: Mapped[CustomerTier] = mapped_column(
        Enum(CustomerTier, name="customer_tier", create_constraint=True),
        nullable=False,
        default=CustomerTier.FREE,
        index=True,
    )

    # ─── AI Analysis Results ────────────────────────────────────
    sentiment: Mapped[float | None] = mapped_column(
        Float, nullable=True, comment="Sentiment polarity score (-1.0 to 1.0)"
    )
    sentiment_confidence: Mapped[float | None] = mapped_column(
        Float, nullable=True, comment="Confidence of sentiment prediction (0.0 to 1.0)"
    )
    category: Mapped[FeedbackCategory | None] = mapped_column(
        Enum(FeedbackCategory, name="feedback_category", create_constraint=True),
        nullable=True,
        index=True,
    )
    category_confidence: Mapped[float | None] = mapped_column(
        Float, nullable=True, comment="Confidence of category classification (0.0 to 1.0)"
    )
    priority: Mapped[FeedbackPriority] = mapped_column(
        Enum(FeedbackPriority, name="feedback_priority", create_constraint=True),
        nullable=False,
        default=FeedbackPriority.NORMAL,
        index=True,
    )
    priority_reasoning: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="Human-readable explanation of priority assignment"
    )
    topics: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Comma-separated detected topics"
    )
    summary: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="AI-generated summary of the feedback"
    )
    is_duplicate: Mapped[bool] = mapped_column(
        default=False, comment="Flagged as duplicate by similarity detection"
    )
    duplicate_of_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID, ForeignKey("feedback.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ─── Workflow State ─────────────────────────────────────────
    status: Mapped[FeedbackStatus] = mapped_column(
        Enum(FeedbackStatus, name="feedback_status", create_constraint=True),
        nullable=False,
        default=FeedbackStatus.NEW,
        index=True,
    )
    embedding_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True,
        comment="Reference to ChromaDB embedding vector ID"
    )
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID, ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ─── Timestamps ─────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    cluster_memberships: Mapped[list["FeedbackClusterMember"]] = relationship(
        "FeedbackClusterMember", back_populates="feedback", lazy="selectin"
    )
    duplicate_of: Mapped["Feedback | None"] = relationship(
        "Feedback", remote_side="Feedback.id", foreign_keys=[duplicate_of_id]
    )

    def __repr__(self) -> str:
        return f"<Feedback(id={self.id}, priority={self.priority}, status={self.status})>"


class FeedbackCluster(Base):
    """Cluster of similar feedback items identified by embedding clustering."""
    __tablename__ = "feedback_clusters"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, default=uuid.uuid4
    )
    cluster_label: Mapped[str] = mapped_column(String(255), nullable=False)
    representative_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    feedback_count: Mapped[int] = mapped_column(Integer, default=0)
    avg_sentiment: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    members: Mapped[list["FeedbackClusterMember"]] = relationship(
        "FeedbackClusterMember", back_populates="cluster", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<FeedbackCluster(id={self.id}, label={self.cluster_label}, count={self.feedback_count})>"


class FeedbackClusterMember(Base):
    """Join table linking feedback items to clusters."""
    __tablename__ = "feedback_cluster_members"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, default=uuid.uuid4
    )
    cluster_id: Mapped[uuid.UUID] = mapped_column(
        UUID,
        ForeignKey("feedback_clusters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    feedback_id: Mapped[uuid.UUID] = mapped_column(
        UUID,
        ForeignKey("feedback.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Relationships
    cluster: Mapped[FeedbackCluster] = relationship(
        "FeedbackCluster", back_populates="members"
    )
    feedback: Mapped[Feedback] = relationship(
        "Feedback", back_populates="cluster_memberships"
    )
