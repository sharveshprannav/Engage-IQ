"""
EngageAI — Agent Pydantic Schemas
Schemas for agent status, control, and execution history.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class AgentStatus(BaseModel):
    """Current status of an autonomous agent."""
    name: str
    status: str = Field(
        ..., pattern=r"^(idle|running|paused|error|stopped)$"
    )
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    runs_completed: int = 0
    errors_count: int = 0
    last_error: Optional[str] = None
    config: dict[str, Any] = Field(default_factory=dict)


class AgentStatusList(BaseModel):
    """List of all agent statuses."""
    agents: list[AgentStatus]
    orchestrator_status: str


class AgentRunRecord(BaseModel):
    """Record of a single agent execution."""
    id: str
    agent_name: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    status: str
    items_processed: int = 0
    result_summary: Optional[str] = None
    error: Optional[str] = None


class AgentRunHistory(BaseModel):
    """Paginated agent run history."""
    runs: list[AgentRunRecord]
    total: int
    page: int
    page_size: int


class AgentControlRequest(BaseModel):
    """Request to control an agent (start/pause/stop)."""
    action: str = Field(
        ..., pattern=r"^(start|pause|resume|stop|trigger)$"
    )
    agent_name: Optional[str] = None
    config: Optional[dict[str, Any]] = None


class AgentEvent(BaseModel):
    """Event published by an agent to the event bus."""
    event_type: str
    agent_name: str
    payload: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime


class RootCauseHypothesis(BaseModel):
    """Root cause analysis hypothesis from the RootCauseAgent."""
    hypothesis: str
    confidence: float = Field(ge=0.0, le=1.0)
    supporting_evidence: list[str] = Field(default_factory=list)
    related_feedback_ids: list[str] = Field(default_factory=list)
    suggested_actions: list[str] = Field(default_factory=list)
    disclaimer: str = "This is an AI-generated hypothesis, not a confirmed root cause."


class WorkflowTimelineEntry(BaseModel):
    """Entry in the workflow execution timeline."""
    timestamp: datetime
    agent_name: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    status: str
