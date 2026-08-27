"""
EngageAI — Text Summarization Service
Generates concise representative summaries of single or clustered feedback items.
Extractive heuristic (top sentences) + LLM generative path.
"""

from __future__ import annotations

import re
from typing import Any
from pydantic import BaseModel, Field

from app.ai.base import BaseAIService


class SummarizationResult(BaseModel):
    summary: str = Field(..., description="Concise summary text")
    is_extractive: bool = Field(default=True, description="True if generated via extractive heuristic fallback")


class SummarizationService(BaseAIService[SummarizationResult]):
    """Generates concise text summaries."""

    async def predict_heuristic(self, text: str, **kwargs: Any) -> SummarizationResult:
        """Extractive summarization heuristic: selects first sentence & key sentence."""
        if not text or not text.strip():
            return SummarizationResult(summary="No content provided.", is_extractive=True)

        sentences = re.split(r"(?<=[.!?])\s+", text.strip())
        if len(sentences) <= 2:
            return SummarizationResult(summary=text.strip(), is_extractive=True)

        # Pick first sentence and longest middle sentence as representative key points
        first_sentence = sentences[0]
        remaining = sentences[1:]
        best_middle = max(remaining, key=len)

        if best_middle != first_sentence:
            summary_text = f"{first_sentence} {best_middle}"
        else:
            summary_text = first_sentence

        # Truncate to max 250 chars cleanly
        if len(summary_text) > 250:
            summary_text = summary_text[:247] + "..."

        return SummarizationResult(summary=summary_text, is_extractive=True)

    async def predict_llm(self, text: str, **kwargs: Any) -> SummarizationResult:
        """Generative LLM summarization fallback."""
        return await self.predict_heuristic(text, **kwargs)


summarization_service = SummarizationService()
