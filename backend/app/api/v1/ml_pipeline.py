"""
EngageAI — ML Pipeline API Router
Full suite of user-isolated endpoints:
/predict, /batch, /feedback, /logs, /logs/{identifier}, /logs (clear), /logs/export
"""

from __future__ import annotations

import csv
import io
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.postgres import get_db_session
from app.models.user import User
from app.schemas.ml_pipeline import (
    BatchJobResponse,
    IOLogEntry,
    IOLogListResponse,
    IOLogUpdate,
    MLFeedbackResponse,
    MLFeedbackSubmit,
    MLPipelineInput,
    MLPipelineOutput,
    PipelineStatus,
)
from app.services.ml_pipeline_service import ml_pipeline_service
from app.core.logging import get_logger

router = APIRouter(prefix="/ml-pipeline", tags=["ML Pipeline"])
logger = get_logger("MLPipelineRouter")


@router.post(
    "/predict",
    response_model=MLPipelineOutput,
    status_code=status.HTTP_200_OK,
    summary="Multi-modal inference endpoint",
    description=(
        "Accepts text, numerical, image, or structured JSON input. "
        "Runs validation → preprocessing → model dispatch → output normalization. "
        "Persists the session to history associated with the currently authenticated user."
    ),
)
async def predict(
    payload: MLPipelineInput,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> MLPipelineOutput:
    """Real-time inference with user-isolated history logging."""
    logger.info(
        "ml_predict_request",
        user_id=str(current_user.id),
        user_email=current_user.email,
        input_type=payload.input_type.value,
        mode=payload.mode.value,
        output_formats=[f.value for f in payload.output_formats],
    )
    result = await ml_pipeline_service.predict(db, payload, user_id=current_user.id)
    return result


@router.post(
    "/batch",
    response_model=BatchJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit async batch inference job",
    description=(
        "Queues a batch inference job linked to the authenticated user. "
        "Returns a job_id that can be polled."
    ),
)
async def submit_batch(
    payload: MLPipelineInput,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> BatchJobResponse:
    """Batch mode inference with user scoping."""
    job_id = uuid.uuid4().hex[:16]
    logger.info(
        "ml_batch_submitted",
        job_id=job_id,
        user_id=str(current_user.id),
        input_type=payload.input_type.value,
    )

    return BatchJobResponse(
        job_id=job_id,
        status=PipelineStatus.PENDING,
        submitted_at=datetime.now(timezone.utc),
        estimated_completion_seconds=30,
        poll_url=f"/api/v1/ml-pipeline/batch/{job_id}",
    )


@router.post(
    "/feedback",
    response_model=MLFeedbackResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit user correction (feedback loop)",
    description=(
        "Allows an authenticated user to correct a prediction for a history record they own. "
        "Enforces server-side authorization: returns 403 Forbidden if attempting to modify another user's record."
    ),
)
async def submit_feedback(
    correction: MLFeedbackSubmit,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> MLFeedbackResponse:
    """User feedback loop with ownership authorization check."""
    logger.info(
        "ml_feedback_received",
        user_id=str(current_user.id),
        request_id=correction.request_id,
        task=correction.task,
        predicted=correction.predicted_label,
        corrected=correction.corrected_label,
    )
    return await ml_pipeline_service.submit_feedback(db, correction, user_id=current_user.id)


@router.get(
    "/logs",
    response_model=IOLogListResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve authenticated user's paginated history",
    description=(
        "Returns only history records owned by the currently authenticated user. "
        "One user's history is never returned or exposed to another user."
    ),
)
async def get_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    search: Optional[str] = Query(default=None, description="Search across request_id, summary, labels"),
    input_type: Optional[str] = Query(default=None, description="Filter by input_type (text, csv, excel, image)"),
    status: Optional[str] = Query(default=None, description="Filter by status (success, error, ambiguous)"),
    category: Optional[str] = Query(default=None, description="Filter by category"),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> IOLogListResponse:
    """Paginated, user-isolated inference I/O log."""
    return await ml_pipeline_service.get_logs(
        db,
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        search=search,
        input_type=input_type,
        status_val=status,
        category=category,
    )


@router.get(
    "/logs/export",
    status_code=status.HTTP_200_OK,
    summary="Export authenticated user's history",
    description="Exports only the history records belonging to the authenticated user in CSV or JSON format.",
)
async def export_logs(
    format: str = Query(default="csv", pattern="^(csv|json)$"),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Export user-isolated history records."""
    logs = await ml_pipeline_service.export_user_logs(db, user_id=current_user.id)

    if format == "json":
        json_data = json.dumps([log.model_dump(mode="json") for log in logs], indent=2)
        return Response(
            content=json_data,
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename=user_history_{datetime.now(timezone.utc).strftime('%Y%m%d')}.json"
            },
        )

    # Default CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID",
        "Request ID",
        "Input Type",
        "Category",
        "Model Used",
        "Latency Total (ms)",
        "Confidence",
        "Status",
        "Primary Label",
        "Input Summary",
        "Output Summary",
        "User Corrected",
        "Corrected Label",
        "Created At",
    ])

    for log in logs:
        writer.writerow([
            str(log.id),
            log.request_id,
            log.input_type.value if hasattr(log.input_type, "value") else str(log.input_type),
            log.category_name or "",
            log.model_used,
            log.latency_total_ms,
            log.overall_confidence or "",
            log.status.value if hasattr(log.status, "value") else str(log.status),
            log.primary_label or "",
            log.input_summary or "",
            log.output_summary or "",
            log.user_corrected,
            log.corrected_label or "",
            log.created_at.isoformat() if log.created_at else "",
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=user_history_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
        },
    )


@router.get(
    "/logs/{identifier}",
    response_model=IOLogEntry,
    status_code=status.HTTP_200_OK,
    summary="Get single history record by ID or request_id",
    description=(
        "Retrieves a single history record. Returns 403 Forbidden if the record belongs to another user, "
        "or 404 Not Found if the record does not exist."
    ),
)
async def get_log_detail(
    identifier: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> IOLogEntry:
    """Retrieve single history item with 403 server-side authorization check."""
    log_entry = await ml_pipeline_service.get_log_by_id_or_request_id(
        db, identifier=identifier, user_id=current_user.id
    )
    return IOLogEntry.model_validate(log_entry)


@router.patch(
    "/logs/{identifier}",
    response_model=IOLogEntry,
    status_code=status.HTTP_200_OK,
    summary="Update a single history record",
    description=(
        "Updates category, label, or notes for a history record. Returns 403 Forbidden if the record belongs to another user, "
        "or 404 Not Found if the record does not exist."
    ),
)
async def update_log_detail(
    identifier: str,
    dto: IOLogUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> IOLogEntry:
    """Update single history item with 403 server-side authorization check."""
    updated = await ml_pipeline_service.update_log(
        db, identifier=identifier, dto=dto, user_id=current_user.id
    )
    return IOLogEntry.model_validate(updated)



@router.delete(
    "/logs/{identifier}",
    status_code=status.HTTP_200_OK,
    summary="Delete a single history record",
    description=(
        "Deletes a specific history record. Returns 403 Forbidden if the record belongs to another user, "
        "or 404 Not Found if the record does not exist."
    ),
)
async def delete_log(
    identifier: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Delete a single history record with authorization validation."""
    return await ml_pipeline_service.delete_log(db, identifier=identifier, user_id=current_user.id)


@router.delete(
    "/logs",
    status_code=status.HTTP_200_OK,
    summary="Clear all history records for the current user",
    description="Deletes all history records belonging to the authenticated user. Does not affect any other user's history.",
)
async def clear_logs(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Clear all history records for the authenticated user."""
    return await ml_pipeline_service.clear_user_logs(db, user_id=current_user.id)
