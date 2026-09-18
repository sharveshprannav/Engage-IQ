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
    """Generate executive AI insights summary and top friction points from real feedback."""
    from sqlalchemy import select, func
    from app.models.feedback import Feedback

    total_res = await db.execute(select(func.count(Feedback.id)))
    total_items = total_res.scalar_one_or_none() or 0

    if total_items == 0:
        return await insights_generator_service.predict_heuristic(text="", total_items=0)

    # Top category
    cat_res = await db.execute(
        select(Feedback.category, func.count(Feedback.id))
        .group_by(Feedback.category)
        .order_by(func.count(Feedback.id).desc())
    )
    top_cat_row = cat_res.first()
    top_category = str(top_cat_row[0]) if top_cat_row and top_cat_row[0] else "feedback"

    # Negative sentiment %
    neg_res = await db.execute(
        select(func.count(Feedback.id)).where(Feedback.sentiment < 0)
    )
    neg_count = neg_res.scalar_one_or_none() or 0
    neg_percent = (neg_count / total_items) * 100 if total_items > 0 else 0.0

    return await insights_generator_service.predict_heuristic(
        text="",
        total_items=total_items,
        top_category=top_category,
        neg_percent=neg_percent
    )


@router.get("/clusters", response_model=ClusteringResult)
async def get_cluster_analysis(db: AsyncSession = Depends(get_db_session)):
    """Run vector embedding clustering and return thematic cluster groups."""
    return await clustering_service.predict_heuristic(text="")
