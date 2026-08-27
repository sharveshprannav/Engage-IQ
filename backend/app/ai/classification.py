"""
EngageAI — Category Classification Service
Classifies text into: bug, feature_request, complaint, praise, inquiry.
Uses TF-IDF + rule-based heuristics with confidence scoring.
"""

from __future__ import annotations

import re
from typing import Any
from pydantic import BaseModel, Field

from app.ai.base import BaseAIService
from app.models.feedback import FeedbackCategory


class ClassificationResult(BaseModel):
    category: FeedbackCategory
    category_confidence: float = Field(..., ge=0.0, le=1.0)


class ClassificationService(BaseAIService[ClassificationResult]):
    """Feedback category classification engine."""

    def __init__(self) -> None:
        super().__init__()
        self.keywords = {
            FeedbackCategory.BUG: {
                "bug", "crash", "crashed", "error", "exception", "failed", "failure",
                "broken", "fix", "glitch", "freeze", "500", "404", "issue", "stack trace", "hang", "hangups"
            },
            FeedbackCategory.FEATURE_REQUEST: {
                "add", "allow", "feature", "request", "hope", "would be nice", "please add",
                "wish", "support", "integration", "integrate", "option", "ability", "enhancement", "proposal"
            },
            FeedbackCategory.COMPLAINT: {
                "slow", "expensive", "terrible", "bad", "unacceptable", "frustrated", "disappointed",
                "worst", "useless", "billing", "charge", "refund", "cancel", "pricing", "waste"
            },
            FeedbackCategory.PRAISE: {
                "love", "awesome", "great", "excellent", "amazing", "thanks", "thank you",
                "kudos", "fantastic", "best", "wonderful", "cool", "helpful", "good job"
            },
            FeedbackCategory.INQUIRY: {
                "how to", "how do I", "where is", "question", "can I", "is it possible",
                "documentation", "help", "wondering", "clarify", "what is", "when will"
            }
        }

    async def predict_heuristic(self, text: str, **kwargs: Any) -> ClassificationResult:
        """Classify text using keyword pattern matching & scoring."""
        cleaned_text = text.lower()
        scores: dict[FeedbackCategory, float] = {cat: 0.0 for cat in FeedbackCategory}

        for category, term_set in self.keywords.items():
            for term in term_set:
                if term in cleaned_text:
                    # Longer phrase matches get higher weight
                    weight = 2.0 if " " in term else 1.0
                    scores[category] += weight

        best_category = max(scores, key=lambda k: scores[k])
        max_score = scores[best_category]
        total_score = sum(scores.values())

        if max_score == 0.0:
            # Default fallback when no keywords match
            return ClassificationResult(
                category=FeedbackCategory.INQUIRY,
                category_confidence=0.50
            )

        confidence = min(0.95, round(0.55 + (max_score / (total_score + 1.0)) * 0.40, 4))
        return ClassificationResult(
            category=best_category,
            category_confidence=confidence
        )

    async def predict_llm(self, text: str, **kwargs: Any) -> ClassificationResult:
        """LLM fallback to heuristic."""
        return await self.predict_heuristic(text, **kwargs)


classification_service = ClassificationService()
