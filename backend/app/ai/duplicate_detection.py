"""
EngageAI — Duplicate Detection Service
Detects semantically identical feedback items using ChromaDB cosine similarity threshold (default 0.92).
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field

from app.ai.base import BaseAIService
from app.db.chroma import chroma_client
from app.core.config import settings


class DuplicateMatch(BaseModel):
    duplicate_feedback_id: str
    similarity_score: float
    text_snippet: str


class DuplicateDetectionResult(BaseModel):
    is_duplicate: bool
    highest_similarity: float = 0.0
    matches: list[DuplicateMatch] = Field(default_factory=list)


class DuplicateDetectionService(BaseAIService[DuplicateDetectionResult]):
    """Duplicate feedback checker."""

    async def predict_heuristic(self, text: str, **kwargs: Any) -> DuplicateDetectionResult:
        """Check duplicate via vector similarity search in ChromaDB."""
        embedding: list[float] = kwargs.get("embedding", [])
        exclude_id: str | None = kwargs.get("exclude_id", None)
        threshold: float = kwargs.get("threshold", settings.PRIORITY_DUPLICATE_THRESHOLD)

        if not embedding:
            return DuplicateDetectionResult(is_duplicate=False)

        raw_dups = await chroma_client.check_duplicates(
            embedding=embedding,
            threshold=threshold,
            exclude_id=exclude_id
        )

        matches = []
        highest_sim = 0.0
        for item in raw_dups:
            sim = item.get("similarity", 0.0)
            if sim > highest_sim:
                highest_sim = sim
            matches.append(
                DuplicateMatch(
                    duplicate_feedback_id=item.get("id", ""),
                    similarity_score=sim,
                    text_snippet=item.get("document", "")[:150]
                )
            )

        return DuplicateDetectionResult(
            is_duplicate=len(matches) > 0,
            highest_similarity=highest_sim,
            matches=matches
        )

    async def predict_llm(self, text: str, **kwargs: Any) -> DuplicateDetectionResult:
        return await self.predict_heuristic(text, **kwargs)


duplicate_detection_service = DuplicateDetectionService()
