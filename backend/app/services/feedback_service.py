"""
EngageAI — Feedback Service
Handles feedback creation, AI enrichment pipeline, retrieval, filtering, and updates.
"""

from __future__ import annotations

import math
from typing import Any, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc, asc

from app.models.feedback import Feedback, FeedbackStatus, FeedbackPriority, FeedbackCategory, CustomerTier
from app.schemas.feedback import FeedbackCreate, FeedbackUpdate, FeedbackFilter, FeedbackResponse, FeedbackListResponse
from app.ai.sentiment import sentiment_service
from app.ai.classification import classification_service
from app.ai.topic_detection import topic_detection_service
from app.ai.summarization import summarization_service
from app.ai.embeddings import embedding_service
from app.ai.duplicate_detection import duplicate_detection_service
from app.ai.priority_engine import priority_engine_service
from app.db.chroma import chroma_client
from app.websocket.manager import ws_manager
from app.core.logging import get_logger

logger = get_logger("FeedbackService")


class FeedbackService:
    """Core service managing customer feedback lifecycle."""

    async def create_feedback(self, db: AsyncSession, dto: FeedbackCreate) -> Feedback:
        """
        Ingest new feedback:
        1. Run AI sentiment analysis
        2. Run AI category classification
        3. Extract topics & summary
        4. Generate dense embedding & upsert to ChromaDB
        5. Check duplicate similarity
        6. Calculate priority & reasoning via priority engine
        7. Save to PostgreSQL & broadcast real-time WebSocket event
        """
        raw_text = dto.raw_text

        # Parallel/sequential AI pipelines
        sent_res = await sentiment_service.predict_heuristic(raw_text)
        class_res = await classification_service.predict_heuristic(raw_text)
        topic_res = await topic_detection_service.predict_heuristic(raw_text)
        summ_res = await summarization_service.predict_heuristic(raw_text)
        emb_res = await embedding_service.predict_heuristic(raw_text)

        # Check duplicates
        dup_res = await duplicate_detection_service.predict_heuristic(
            raw_text, embedding=emb_res.vector
        )

        # Calculate Priority
        prio_res = await priority_engine_service.predict_heuristic(
            raw_text,
            sentiment=sent_res.sentiment,
            category=class_res.category,
            customer_tier=CustomerTier(dto.customer_tier)
        )

        fb = Feedback(
            source_channel=dto.source_channel,
            raw_text=raw_text,
            customer_id=dto.customer_id,
            customer_email=dto.customer_email,
            customer_name=dto.customer_name,
            customer_tier=dto.customer_tier,
            sentiment=sent_res.sentiment,
            sentiment_confidence=sent_res.sentiment_confidence,
            category=class_res.category,
            category_confidence=class_res.category_confidence,
            priority=prio_res.priority,
            priority_reasoning=prio_res.priority_reasoning,
            topics=", ".join(topic_res.topics),
            summary=summ_res.summary,
            is_duplicate=dup_res.is_duplicate,
            duplicate_of_id=UUID(dup_res.matches[0].duplicate_feedback_id) if dup_res.matches else None,
            status=FeedbackStatus.NEW,
        )

        db.add(fb)
        await db.commit()
        await db.refresh(fb)

        # Upsert embedding to ChromaDB with feedback_id metadata
        fb.embedding_id = str(fb.id)
        await chroma_client.upsert_embedding(
            embedding_id=str(fb.id),
            embedding=emb_res.vector,
            metadata={
                "feedback_id": str(fb.id),
                "category": class_res.category.value if class_res.category else "inquiry",
                "sentiment": sent_res.sentiment,
                "customer_tier": dto.customer_tier,
            },
            document=raw_text
        )
        await db.commit()

        # Real-time WebSocket Push
        await ws_manager.broadcast({
            "type": "new_feedback",
            "data": {
                "id": str(fb.id),
                "source_channel": fb.source_channel.value,
                "raw_text": fb.raw_text,
                "category": fb.category.value if fb.category else None,
                "priority": fb.priority.value,
                "sentiment": fb.sentiment,
                "customer_tier": fb.customer_tier.value,
                "created_at": fb.created_at.isoformat()
            }
        })

        return fb

    async def get_feedback_list(self, db: AsyncSession, filters: FeedbackFilter) -> FeedbackListResponse:
        """Retrieve paginated & filtered feedback list."""
        query = select(Feedback)

        if filters.status:
            query = query.where(Feedback.status == filters.status)
        if filters.priority:
            query = query.where(Feedback.priority == filters.priority)
        if filters.category:
            query = query.where(Feedback.category == filters.category)
        if filters.customer_tier:
            query = query.where(Feedback.customer_tier == filters.customer_tier)
        if filters.source_channel:
            query = query.where(Feedback.source_channel == filters.source_channel)
        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.where(
                or_(
                    Feedback.raw_text.ilike(search_term),
                    Feedback.summary.ilike(search_term),
                    Feedback.topics.ilike(search_term)
                )
            )

        # Total count query
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar_one_or_none() or 0

        # Sorting
        sort_attr = getattr(Feedback, filters.sort_by, Feedback.created_at)
        if filters.sort_order == "desc":
            query = query.order_by(desc(sort_attr))
        else:
            query = query.order_by(asc(sort_attr))

        # Pagination
        offset = (filters.page - 1) * filters.page_size
        query = query.offset(offset).limit(filters.page_size)

        res = await db.execute(query)
        items = list(res.scalars().all())

        pages = math.ceil(total / filters.page_size) if total > 0 else 1

        # Transform to Pydantic responses
        fb_responses = [FeedbackResponse.model_validate(item) for item in items]

        return FeedbackListResponse(
            items=fb_responses,
            total=total,
            page=filters.page,
            page_size=filters.page_size,
            pages=pages
        )

    async def get_feedback_by_id(self, db: AsyncSession, feedback_id: UUID) -> Optional[Feedback]:
        """Fetch single feedback by ID."""
        result = await db.execute(select(Feedback).where(Feedback.id == feedback_id))
        return result.scalar_one_or_none()

    async def update_feedback(self, db: AsyncSession, feedback_id: UUID, dto: FeedbackUpdate) -> Optional[Feedback]:
        """Update feedback status or priority."""
        fb = await self.get_feedback_by_id(db, feedback_id)
        if not fb:
            return None

        if dto.status:
            fb.status = FeedbackStatus(dto.status)
        if dto.priority:
            fb.priority = FeedbackPriority(dto.priority)
        if dto.assigned_to:
            fb.assigned_to = dto.assigned_to
        if dto.category:
            fb.category = FeedbackCategory(dto.category)

        await db.commit()
        await db.refresh(fb)
        return fb


feedback_service = FeedbackService()
