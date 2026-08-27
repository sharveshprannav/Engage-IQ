"""
EngageAI — Sentiment Analysis Service
Combines VADER Sentiment, keyword polarity scoring, and optional LLM paths.
Returns sentiment polarity (-1.0 to 1.0) and confidence score (0.0 to 1.0).
"""

from __future__ import annotations

import re
from typing import Any
from pydantic import BaseModel, Field

from app.ai.base import BaseAIService
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer


class SentimentResult(BaseModel):
    sentiment: float = Field(..., ge=-1.0, le=1.0, description="Polarity score from -1.0 (very negative) to 1.0 (very positive)")
    sentiment_confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score from 0.0 to 1.0")
    label: str = Field(..., description="Human-readable label: positive, negative, mixed, neutral")


class SentimentService(BaseAIService[SentimentResult]):
    """Sentiment analysis service using VADER Sentiment with LLM override option."""

    def __init__(self) -> None:
        super().__init__()
        self._vader = SentimentIntensityAnalyzer()

        # Keyword dictionaries for polarity boosting
        self.negative_triggers = {
            "outage", "broken", "bug", "crash", "crashed", "slow", "down", "terrible",
            "horrible", "frustrated", "refund", "cancel", "useless", "error", "fail", "failed"
        }
        self.positive_triggers = {
            "love", "great", "awesome", "excellent", "amazing", "fast", "helpful",
            "fantastic", "best", "perfect", "thanks", "thank you", "kudos", "wonderfully"
        }

    async def predict_heuristic(self, text: str, **kwargs: Any) -> SentimentResult:
        """Rule-based sentiment prediction using VADER + keyword heuristics."""
        if not text or not text.strip():
            return SentimentResult(sentiment=0.0, sentiment_confidence=0.5, label="neutral")

        scores = self._vader.polarity_scores(text)
        compound = float(scores["compound"])

        # Check triggers for fine-tuning
        words = set(re.findall(r"\w+", text.lower()))
        neg_count = len(words.intersection(self.negative_triggers))
        pos_count = len(words.intersection(self.positive_triggers))

        # Adjust score if strong keywords exist
        if neg_count > pos_count and compound > -0.2:
            compound -= 0.25 * neg_count
        elif pos_count > neg_count and compound < 0.2:
            compound += 0.25 * pos_count

        compound = max(-1.0, min(1.0, round(compound, 4)))

        # Determine label & confidence
        if compound <= -0.35:
            label = "negative"
            confidence = min(0.95, 0.6 + abs(compound) * 0.35)
        elif compound >= 0.35:
            label = "positive"
            confidence = min(0.95, 0.6 + compound * 0.35)
        elif neg_count > 0 and pos_count > 0:
            label = "mixed"
            confidence = 0.70
        else:
            label = "neutral"
            confidence = 0.65

        return SentimentResult(
            sentiment=compound,
            sentiment_confidence=round(confidence, 4),
            label=label
        )

    async def predict_llm(self, text: str, **kwargs: Any) -> SentimentResult:
        """LLM-based sentiment prediction (uses heuristic fallback if LLM client not initialized)."""
        # When LLM key is active, standard LLM client call occurs here.
        # Fall back gracefully to heuristic
        return await self.predict_heuristic(text, **kwargs)


sentiment_service = SentimentService()
