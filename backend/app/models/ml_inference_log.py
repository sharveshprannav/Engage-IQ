"""
EngageAI — ML Inference Log ORM Model
Tracks every ML Pipeline Studio request for debugging and model improvement.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, String, Text
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MLInferenceStatus(str, enum.Enum):
    SUCCESS = "success"
    AMBIGUOUS = "ambiguous"
    ERROR = "error"
    FALLBACK = "fallback"
    PENDING = "pending"


class MLInputType(str, enum.Enum):
    TEXT = "text"
    CSV = "csv"
    EXCEL = "excel"
    IMAGE = "image"
    STRUCTURED = "structured"


class MLInferenceLog(Base):
    """
    Stores one record per ML Pipeline inference request.
    Used for audit, debugging, and model improvement feedback loops.
    """
    __tablename__ = "ml_inference_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True,
        comment="Associated platform user who executed this inference session"
    )
    request_id: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True,
        comment="Client-visible short request ID"
    )
    input_type: Mapped[MLInputType] = mapped_column(
        Enum(MLInputType, name="ml_input_type", create_constraint=False, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
    )
    input_hash: Mapped[str | None] = mapped_column(
        String(64), nullable=True,
        comment="SHA-256 hash of the raw input for dedup tracking"
    )
    model_used: Mapped[str] = mapped_column(
        String(255), nullable=False,
        comment="Pipeline / model name that produced this result"
    )
    latency_total_ms: Mapped[float] = mapped_column(
        Float, nullable=False, comment="End-to-end wall-clock latency in milliseconds"
    )
    latency_validation_ms: Mapped[float] = mapped_column(Float, default=0.0)
    latency_preprocessing_ms: Mapped[float] = mapped_column(Float, default=0.0)
    latency_model_ms: Mapped[float] = mapped_column(Float, default=0.0)
    latency_postprocessing_ms: Mapped[float] = mapped_column(Float, default=0.0)
    overall_confidence: Mapped[float | None] = mapped_column(
        Float, nullable=True, comment="Top-level confidence score (0.0 to 1.0)"
    )
    status: Mapped[MLInferenceStatus] = mapped_column(
        Enum(MLInferenceStatus, name="ml_inference_status", create_constraint=False, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=MLInferenceStatus.SUCCESS,
        index=True,
    )
    ambiguity_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    category_name: Mapped[str | None] = mapped_column(
        String(128), nullable=True, comment="Target category or domain name requested by user"
    )
    primary_label: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="Top predicted label"
    )
    input_summary: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Snippet or filename of input payload"
    )
    output_summary: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Comprehensive summary of analysis results"
    )
    details_json: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Serialized predictions and metadata JSON"
    )
    user_corrected: Mapped[bool] = mapped_column(
        Boolean, default=False, comment="User submitted a correction via feedback loop"
    )
    corrected_label: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="User-supplied correct label"
    )
    correction_note: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Optional correction note from user"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    # Relationships
    user = relationship("User")

    def __repr__(self) -> str:
        return f"<MLInferenceLog(id={self.id}, user_id={self.user_id}, type={self.input_type}, status={self.status})>"
