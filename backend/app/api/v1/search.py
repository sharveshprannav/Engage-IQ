"""
EngageAI — Search Router
Endpoints for natural language semantic search and plain-English QA.
"""

from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_db_session
from app.schemas.feedback import SimilarFeedbackResponse
from app.services.search_service import search_service
from app.ai.nl_query_engine import nl_query_engine_service, NLQueryAnswer

router = APIRouter(prefix="/search", tags=["Search & NLQ"])


@router.get("/semantic", response_model=list[SimilarFeedbackResponse])
async def search_feedback_semantic(
    q: str = Query(..., min_length=2, description="Natural language search query"),
    limit: int = Query(default=10, ge=1, le=50),
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session)
):
    """Execute vector similarity search using sentence embeddings."""
    return await search_service.semantic_search(db, query_text=q, limit=limit, category=category)


@router.get("/nl-query", response_model=NLQueryAnswer)
async def ask_natural_language_question(
    q: str = Query(..., min_length=2, description="Plain English question"),
    db: AsyncSession = Depends(get_db_session)
):
    """Ask plain-English question and receive AI synthesis + supporting citations."""
    return await nl_query_engine_service.predict_heuristic(query=q)
