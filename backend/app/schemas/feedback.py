"""
EngageAI — Feedback Pydantic Schemas
Request/response models for feedback CRUD and analysis.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class FeedbackCreate(BaseModel):
    """Schema for creating new feedback."""
    source_channel: str = Field(
        ..., pattern=r"^(email|widget|api|csv|webhook)$",
        description="Channel the feedback was received from"
    )
    raw_text: str = Field(
        ..., min_length=1, max_length=10000,
        description="The raw feedback text"
    )
    customer_id: Optional[str] = Field(None, max_length=255)
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    customer_tier: str = Field(
        default="free", pattern=r"^(free|pro|enterprise)$"
    )

    @field_validator("raw_text")
    @classmethod
    def validate_raw_text(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Feedback text cannot be empty")
        return stripped


class FeedbackBulkCreate(BaseModel):
    """Schema for bulk CSV import."""
    items: list[FeedbackCreate] = Field(
        ..., min_length=1, max_length=1000,
        description="List of feedback items to import"
    )


class FeedbackUpdate(BaseModel):
    """Schema for updating feedback."""
    status: Optional[str] = Field(
        None, pattern=r"^(new|triaged|in_progress|resolved|closed)$"
    )
    priority: Optional[str] = Field(
        None, pattern=r"^(normal|low|high|very_high)$"
    )
    assigned_to: Optional[UUID] = None
    category: Optional[str] = Field(
        None, pattern=r"^(bug|feature_request|complaint|praise|inquiry)$"
    )


class FeedbackAIResult(BaseModel):
    """AI analysis results attached to feedback."""
    sentiment: Optional[float] = Field(None, ge=-1.0, le=1.0)
    sentiment_confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    category: Optional[str] = None
    category_confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    priority: Optional[str] = None
    priority_reasoning: Optional[str] = None
    topics: Optional[str] = None
    summary: Optional[str] = None
    is_duplicate: bool = False
    duplicate_of_id: Optional[UUID] = None


class FeedbackResponse(BaseModel):
    """Full feedback response with AI analysis."""
    id: UUID
    source_channel: str
    raw_text: str
    customer_id: Optional[str] = None
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    customer_tier: str
    sentiment: Optional[float] = None
    sentiment_confidence: Optional[float] = None
    category: Optional[str] = None
    category_confidence: Optional[float] = None
    priority: str
    priority_reasoning: Optional[str] = None
    topics: Optional[str] = None
    summary: Optional[str] = None
    status: str
    is_duplicate: bool = False
    duplicate_of_id: Optional[UUID] = None
    embedding_id: Optional[str] = None
    assigned_to: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FeedbackListResponse(BaseModel):
    """Paginated list of feedback items."""
    items: list[FeedbackResponse]
    total: int
    page: int
    page_size: int
    pages: int


class FeedbackFilter(BaseModel):
    """Query filters for feedback list."""
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    customer_tier: Optional[str] = None
    source_channel: Optional[str] = None
    sentiment_min: Optional[float] = Field(None, ge=-1.0, le=1.0)
    sentiment_max: Optional[float] = Field(None, ge=-1.0, le=1.0)
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    search: Optional[str] = None
    sort_by: str = Field(default="created_at", pattern=r"^(created_at|priority|sentiment|status|category)$")
    sort_order: str = Field(default="desc", pattern=r"^(asc|desc)$")
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class SimilarFeedbackResponse(BaseModel):
    """Response for duplicate/similar feedback queries."""
    feedback_id: str
    similarity: float
    text_preview: str
    category: Optional[str] = None
    sentiment: Optional[float] = None
