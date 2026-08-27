"""
EngageAI — Base AI Service Interface
Abstract base class for all AI/ML services with fallback execution logic.
Every AI call is wrapped in try/except with graceful degradation and logging.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Generic, TypeVar

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

T = TypeVar("T")


class BaseAIService(ABC, Generic[T]):
    """
    Abstract base class for AI service modules.
    Provides dual-path execution (LLM vs. Heuristic) and graceful fallback handling.
    """

    def __init__(self) -> None:
        self.logger = get_logger(self.__class__.__name__)

    @property
    def has_llm_credentials(self) -> bool:
        """Check if LLM API key (Gemini, OpenAI, or Anthropic) is configured."""
        return bool(settings.GEMINI_API_KEY or settings.OPENAI_API_KEY or settings.ANTHROPIC_API_KEY)

    @property
    def use_llm(self) -> bool:
        """Check if LLM path should be used."""
        return settings.AI_USE_LLM and self.has_llm_credentials

    @abstractmethod
    async def predict_heuristic(self, text: str, **kwargs: Any) -> T:
        """Rule-based, statistical, or local ML model fallback prediction logic."""
        pass

    @abstractmethod
    async def predict_llm(self, text: str, **kwargs: Any) -> T:
        """Generative LLM-backed prediction logic."""
        pass

    async def analyze(self, text: str, **kwargs: Any) -> T:
        """
        Execute prediction pipeline with automatic fallback and error handling.
        Never crashes the request pipeline on AI service failure.
        """
        if self.use_llm:
            try:
                self.logger.debug("executing_llm_path", service=self.__class__.__name__)
                return await self.predict_llm(text, **kwargs)
            except Exception as e:
                self.logger.warning(
                    "llm_prediction_failed_falling_back",
                    service=self.__class__.__name__,
                    error=str(e),
                )
                if not settings.AI_FALLBACK_ENABLED:
                    raise e

        # Fallback to local heuristic / machine learning pipeline
        try:
            self.logger.debug("executing_heuristic_path", service=self.__class__.__name__)
            return await self.predict_heuristic(text, **kwargs)
        except Exception as e:
            self.logger.error(
                "heuristic_prediction_failed",
                service=self.__class__.__name__,
                error=str(e),
                exc_info=True,
            )
            # Return safe default instance or re-raise if handled upstream
            raise e
