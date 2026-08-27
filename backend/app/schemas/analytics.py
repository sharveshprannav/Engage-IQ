"""
EngageAI — Analytics Pydantic Schemas
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class DashboardKPIs(BaseModel):
    """Key performance indicators for the dashboard."""
    total_feedback: int = 0
    avg_sentiment: float = 0.0
    open_very_high_count: int = 0
    sla_breach_count: int = 0
    feedback_today: int = 0
    trend_change_percent: float = 0.0


class SentimentTrendPoint(BaseModel):
    """Single data point for sentiment trend chart."""
    date: str
    avg_sentiment: float
    count: int


class SentimentTrendResponse(BaseModel):
    """Sentiment trend over time."""
    data: list[SentimentTrendPoint]
    period: str = "7d"


class PriorityDistribution(BaseModel):
    """Priority distribution for chart."""
    very_high: int = 0
    high: int = 0
    low: int = 0
    normal: int = 0


class CategoryVolumePoint(BaseModel):
    """Volume by category for a time period."""
    date: str
    bug: int = 0
    feature_request: int = 0
    complaint: int = 0
    praise: int = 0
    inquiry: int = 0


class CategoryVolumeResponse(BaseModel):
    """Feedback volume by category over time."""
    data: list[CategoryVolumePoint]
    period: str = "7d"


class ClusterSummary(BaseModel):
    """Summary of a feedback cluster."""
    id: UUID
    label: str
    summary: Optional[str] = None
    feedback_count: int
    avg_sentiment: Optional[float] = None


class ClusterVisualizationPoint(BaseModel):
    """Data point for cluster scatter chart."""
    cluster_id: str
    label: str
    feedback_count: int
    avg_sentiment: float
    x: float = 0.0
    y: float = 0.0


class AnalyticsOverview(BaseModel):
    """Complete analytics overview response."""
    kpis: DashboardKPIs
    sentiment_trend: list[SentimentTrendPoint]
    priority_distribution: PriorityDistribution
    category_volume: list[CategoryVolumePoint]
    clusters: list[ClusterSummary]
    top_topics: list[dict[str, Any]] = Field(default_factory=list)
