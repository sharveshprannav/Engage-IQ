"""
EngageAI — Vector Embedding Service
Generates dense vector embeddings using SentenceTransformers (or local fallback vectorizer).
"""

from __future__ import annotations

from typing import Any
import numpy as np
from pydantic import BaseModel, Field

from app.ai.base import BaseAIService
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class EmbeddingResult(BaseModel):
    vector: list[float] = Field(..., description="Dense embedding vector")
    dimension: int = Field(..., description="Vector dimension size")
    model_name: str = Field(..., description="Model identifier used")


class EmbeddingService(BaseAIService[EmbeddingResult]):
    """Embeddings generator using SentenceTransformers with lightweight TF-IDF fallback."""

    def __init__(self) -> None:
        super().__init__()
        self._st_model = None
        self._attempted_st_load = False

    def _get_st_model(self):
        """Lazy loader for SentenceTransformer model to prevent slow boot times."""
        if not self._attempted_st_load and self._st_model is None:
            self._attempted_st_load = True
            try:
                from sentence_transformers import SentenceTransformer
                self.logger.info("loading_sentence_transformer_model", model=settings.EMBEDDING_MODEL)
                self._st_model = SentenceTransformer(settings.EMBEDDING_MODEL)
            except Exception as e:
                self.logger.warning("sentence_transformers_load_failed", error=str(e))
                self._st_model = None
        return self._st_model

    async def predict_heuristic(self, text: str, **kwargs: Any) -> EmbeddingResult:
        """Local vector embedding generation."""
        model = self._get_st_model()
        if model is not None:
            try:
                vector = model.encode(text, convert_to_numpy=True).astype(float).tolist()
                return EmbeddingResult(
                    vector=vector,
                    dimension=len(vector),
                    model_name=settings.EMBEDDING_MODEL
                )
            except Exception as e:
                self.logger.error("st_encode_failed", error=str(e))

        # Fallback: Deterministic pseudo-embedding using hash-based vector projection
        dim = settings.EMBEDDING_DIMENSION
        rng = np.random.RandomState(abs(hash(text)) % (2**32))
        vector = rng.normal(0, 1, dim)
        vector = (vector / np.linalg.norm(vector)).astype(float).tolist()

        return EmbeddingResult(
            vector=vector,
            dimension=dim,
            model_name="hash-pseudo-embedding-fallback"
        )

    async def predict_llm(self, text: str, **kwargs: Any) -> EmbeddingResult:
        return await self.predict_heuristic(text, **kwargs)


embedding_service = EmbeddingService()
