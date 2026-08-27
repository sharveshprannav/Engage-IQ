"""
EngageAI — Analytics Router
Endpoints for real-time dashboard KPIs, sentiment trend points, and cluster visualizations.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_db_session
from app.schemas.analytics import AnalyticsOverview
from app.services.analytics_service import analytics_service
from app.ai.insights_generator import insights_generator_service, InsightsResult
from app.ai.clustering import clustering_service, ClusteringResult

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
async def get_analytics_overview(db: AsyncSession = Depends(get_db_session)):
    """Fetch complete aggregated dashboard KPIs and time-series datasets."""
    return await analytics_service.get_dashboard_overview(db)


@router.get("/insights", response_model=InsightsResult)
async def get_executive_insights(db: AsyncSession = Depends(get_db_session)):
    """Generate executive AI insights summary and top friction points."""
    return await insights_generator_service.predict_heuristic(text="")


@router.get("/clusters", response_model=ClusteringResult)
async def get_cluster_analysis(db: AsyncSession = Depends(get_db_session)):
    """Run vector embedding clustering and return thematic cluster groups."""
    return await clustering_service.predict_heuristic(text="")
