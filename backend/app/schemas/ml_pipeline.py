"""
EngageAI — ML Pipeline Pydantic v2 Schemas
Full input/output contract for the multi-modal ML Pipeline Studio endpoint.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


# ─── Enums ──────────────────────────────────────────────────────────────────

class InputType(str, Enum):
    TEXT = "text"
    CSV = "csv"
    EXCEL = "excel"
    IMAGE = "image"
    STRUCTURED = "structured"


class ProcessingMode(str, Enum):
    REALTIME = "realtime"
    BATCH = "batch"


class OutputFormat(str, Enum):
    JSON = "json"
    TABLE = "table"
    NL = "nl"
    VISUALIZATION = "visualization"


class PipelineStatus(str, Enum):
    SUCCESS = "success"
    AMBIGUOUS = "ambiguous"
    ERROR = "error"
    FALLBACK = "fallback"
    PENDING = "pending"


# ─── Input Schemas ───────────────────────────────────────────────────────────

class NumericalField(BaseModel):
    """Single named numerical field with optional bounds."""
    key: str = Field(..., min_length=1, max_length=100)
    value: float
    unit: Optional[str] = Field(None, max_length=50)
    range_min: Optional[float] = None
    range_max: Optional[float] = None


class MLPipelineInput(BaseModel):
    """
    Multi-modal ML pipeline input.
    Exactly one of text_content / numerical_data / image_base64 / structured_query
    must be populated, matching the declared input_type.
    """
    input_type: InputType
    category_name: Optional[str] = Field(
        None, max_length=128, description="Target category or analysis domain name"
    )
    mode: ProcessingMode = ProcessingMode.REALTIME
    output_formats: list[OutputFormat] = Field(
        default=[OutputFormat.JSON, OutputFormat.NL],
        min_length=1,
    )

    # Text input
    text_content: Optional[str] = Field(
        None, min_length=1, max_length=50_000,
        description="Raw text content for NLP analysis"
    )

    # CSV input
    csv_content: Optional[str] = Field(
        None, max_length=50_000,
        description="Raw CSV file text content"
    )
    csv_filename: Optional[str] = Field(None, max_length=255)

    # Excel input (base64 encoded xlsx)
    excel_base64: Optional[str] = Field(
        None, max_length=14_000_000,
        description="Base64 encoded Excel document"
    )
    excel_filename: Optional[str] = Field(None, max_length=255)

    # Image input (base64-encoded, max ~10MB decoded ≈ 13.3MB base64)
    image_base64: Optional[str] = Field(
        None, max_length=14_000_000,
        description="Base64-encoded image (JPEG/PNG/WEBP)"
    )
    image_filename: Optional[str] = Field(None, max_length=255)
    image_mime_type: Optional[str] = Field(None, pattern=r"^image/(jpeg|png|webp|gif)$")

    # Structured JSON query
    structured_query: Optional[dict[str, Any]] = Field(
        None, description="Arbitrary structured query / JSON payload"
    )

    # Optional clarification context (returned to user when ambiguity is resolved)
    clarification_context: Optional[dict[str, Any]] = Field(
        None,
        description="User-supplied clarification after AmbiguityModal prompt"
    )

    @field_validator("text_content")
    @classmethod
    def strip_text(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v else v

    @model_validator(mode="after")
    def check_payload_matches_type(self) -> "MLPipelineInput":
        type_to_field = {
            InputType.TEXT: self.text_content,
            InputType.CSV: self.csv_content,
            InputType.EXCEL: self.excel_base64,
            InputType.IMAGE: self.image_base64,
            InputType.STRUCTURED: self.structured_query,
        }
        if type_to_field[self.input_type] is None:
            raise ValueError(
                f"input_type is '{self.input_type.value}' but the corresponding "
                f"payload field is missing or null."
            )
        return self


# ─── Validation / Preprocessing Result ──────────────────────────────────────

class ValidationResult(BaseModel):
    is_valid: bool
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    preprocessing_steps: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Each step: {name, status, detail}"
    )


# ─── Prediction / Output Schemas ─────────────────────────────────────────────

class AlternativePrediction(BaseModel):
    label: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    reasoning: Optional[str] = None


class PredictionResult(BaseModel):
    model_name: str
    task: str  # e.g. "sentiment", "classification", "priority", "trend"
    label: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    raw_score: Optional[float] = None
    alternatives: list[AlternativePrediction] = Field(default_factory=list)
    explanation: Optional[str] = None


class LatencyBreakdown(BaseModel):
    total_ms: float
    validation_ms: float
    preprocessing_ms: float
    model_ms: float
    postprocessing_ms: float


class TableRow(BaseModel):
    field: str
    value: Any
    confidence: Optional[float] = None
    unit: Optional[str] = None


class VisualizationData(BaseModel):
    chart_type: Literal["bar", "gauge", "radar", "scatter"]
    title: str
    labels: list[str]
    datasets: list[dict[str, Any]]


class OutputFormats(BaseModel):
    json: Optional[dict[str, Any]] = None
    table: Optional[list[TableRow]] = None
    nl: Optional[str] = None
    visualization: Optional[VisualizationData] = None


class MLPipelineOutput(BaseModel):
    request_id: str
    input_type: InputType
    mode: ProcessingMode
    status: PipelineStatus
    validation: ValidationResult
    ambiguity_detected: bool = False
    clarification_hints: list[str] = Field(default_factory=list)
    predictions: list[PredictionResult] = Field(default_factory=list)
    overall_confidence: float = Field(0.0, ge=0.0, le=1.0)
    model_used: str
    latency: LatencyBreakdown
    output_formats: OutputFormats
    metadata: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime


# ─── Batch Job ───────────────────────────────────────────────────────────────

class BatchJobResponse(BaseModel):
    job_id: str
    status: PipelineStatus = PipelineStatus.PENDING
    submitted_at: datetime
    estimated_completion_seconds: int = 30
    poll_url: str


# ─── User Feedback / Correction ──────────────────────────────────────────────

class MLFeedbackSubmit(BaseModel):
    """User correction loop — captures (predicted, corrected) label pair."""
    request_id: str = Field(..., min_length=1, max_length=64)
    task: str = Field(..., description="e.g. 'classification', 'sentiment', 'priority'")
    predicted_label: str
    corrected_label: str
    correction_note: Optional[str] = Field(None, max_length=2000)


class MLFeedbackResponse(BaseModel):
    accepted: bool
    message: str


# ─── I/O Log ─────────────────────────────────────────────────────────────────

class IOLogEntry(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    request_id: str
    input_type: InputType
    category_name: Optional[str] = None
    model_used: str
    latency_total_ms: float
    overall_confidence: Optional[float] = None
    status: PipelineStatus
    primary_label: Optional[str] = None
    input_summary: Optional[str] = None
    output_summary: Optional[str] = None
    details_json: Optional[str] = None
    user_corrected: bool
    corrected_label: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class IOLogListResponse(BaseModel):
    items: list[IOLogEntry]
    total: int
    page: int
    page_size: int


class IOLogUpdate(BaseModel):
    category_name: Optional[str] = Field(None, max_length=128)
    primary_label: Optional[str] = Field(None, max_length=255)
    correction_note: Optional[str] = Field(None, max_length=2000)
    corrected_label: Optional[str] = Field(None, max_length=255)


class IOLogDeleteResponse(BaseModel):
    success: bool
    request_id: str
    message: str


class IOLogClearResponse(BaseModel):
    success: bool
    deleted_count: int
    message: str

