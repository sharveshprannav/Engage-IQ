"""
EngageAI — API v1 Router Aggregator
Combines all domain routers into a single master v1 router.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.feedback import router as feedback_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.search import router as search_router

from app.api.v1.notifications import router as notifications_router
from app.integrations.webhook_receiver import router as webhook_router
from app.api.v1.ml_pipeline import router as ml_pipeline_router
from app.api.v1.assistant import router as assistant_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(feedback_router)
api_v1_router.include_router(analytics_router)
api_v1_router.include_router(search_router)
api_v1_router.include_router(assistant_router)

api_v1_router.include_router(notifications_router)
api_v1_router.include_router(webhook_router)
api_v1_router.include_router(ml_pipeline_router)

