"""
EngageAI — Search Service
Provides natural language semantic search over ChromaDB embeddings with metadata filtering.
"""

from __future__ import annotations

from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.chroma import chroma_client
from app.ai.embeddings import embedding_service
from app.models.feedback import Feedback
from app.schemas.feedback import SimilarFeedbackResponse


class SearchService:
    """Semantic vector search service."""

    async def semantic_search(
        self,
        db: AsyncSession,
        query_text: str,
        limit: int = 10,
        category: str | None = None
    ) -> list[SimilarFeedbackResponse]:
        """Embed query and search top-k nearest vectors in ChromaDB."""
        # 1. Generate query embedding
        emb_res = await embedding_service.predict_heuristic(query_text)

        # 2. Build metadata filter
        where_filter = {}
        if category:
            where_filter["category"] = category

        # 3. Query ChromaDB
        chroma_res = await chroma_client.query_similar(
            query_embedding=emb_res.vector,
            n_results=limit,
            where=where_filter if where_filter else None
        )

        results: list[SimilarFeedbackResponse] = []
        if chroma_res["ids"] and chroma_res["ids"][0]:
            for i, (doc_id, dist) in enumerate(zip(chroma_res["ids"][0], chroma_res["distances"][0])):
                similarity = round(1.0 - dist, 4)
                doc = chroma_res["documents"][0][i] if chroma_res["documents"] else ""
                meta = chroma_res["metadatas"][0][i] if chroma_res["metadatas"] else {}

                results.append(
                    SimilarFeedbackResponse(
                        feedback_id=doc_id,
                        similarity=similarity,
                        text_preview=doc[:150] + "..." if len(doc) > 150 else doc,
                        category=meta.get("category"),
                        sentiment=meta.get("sentiment")
                    )
                )

        return results


search_service = SearchService()
