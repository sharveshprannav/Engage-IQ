"""
EngageAI — Feedback Router
Endpoints for feedback ingestion, listing, filtering, detail retrieval, and updates.
"""

from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_db_session
from app.schemas.feedback import (
    FeedbackCreate,
    FeedbackBulkCreate,
    FeedbackUpdate,
    FeedbackResponse,
    FeedbackListResponse,
    FeedbackFilter,
)
from app.services.feedback_service import feedback_service
from app.api.deps import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def create_feedback_item(
    dto: FeedbackCreate,
    db: AsyncSession = Depends(get_db_session)
):
    """Ingest single customer feedback item and trigger AI enrichment."""
    fb = await feedback_service.create_feedback(db, dto)
    return fb


@router.post("/bulk", status_code=status.HTTP_201_CREATED)
async def bulk_import_feedback(
    dto: FeedbackBulkCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_role("agent"))
):
    """Bulk import list of feedback items (CSV drop / API batch)."""
    imported = []
    for item in dto.items:
        fb = await feedback_service.create_feedback(db, item)
        imported.append(str(fb.id))
    return {"status": "success", "imported_count": len(imported), "ids": imported}


@router.get("", response_model=FeedbackListResponse)
async def list_feedback_items(
    filters: FeedbackFilter = Depends(),
    db: AsyncSession = Depends(get_db_session)
):
    """List paginated feedback with filtering and sorting."""
    return await feedback_service.get_feedback_list(db, filters)


@router.get("/{feedback_id}", response_model=FeedbackResponse)
async def get_feedback_detail(
    feedback_id: UUID,
    db: AsyncSession = Depends(get_db_session)
):
    """Retrieve full details & AI reasoning for a single feedback item."""
    fb = await feedback_service.get_feedback_by_id(db, feedback_id)
    if not fb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")
    return fb


@router.patch("/{feedback_id}", response_model=FeedbackResponse)
async def update_feedback_item(
    feedback_id: UUID,
    dto: FeedbackUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_role("agent"))
):
    """Update feedback status, priority, or assigned team member."""
    fb = await feedback_service.update_feedback(db, feedback_id, dto)
    if not fb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")
    return fb
