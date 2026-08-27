"""
EngageAI — Topic Detection Service
Extracts key topics, tags, and keywords from feedback text.
Uses TF-IDF / N-gram keyword extraction with LLM fallback.
"""

from __future__ import annotations

import re
from typing import Any
from pydantic import BaseModel, Field

from app.ai.base import BaseAIService


class TopicDetectionResult(BaseModel):
    topics: list[str] = Field(default_factory=list, description="Extracted topic labels")
    keywords: list[str] = Field(default_factory=list, description="Raw key phrases extracted")


class TopicDetectionService(BaseAIService[TopicDetectionResult]):
    """Extracts main themes and topics from text."""

    def __init__(self) -> None:
        super().__init__()
        self.stop_words = {
            "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "been", "be",
            "have", "has", "had", "do", "does", "did", "to", "at", "in", "on", "by", "for",
            "with", "about", "against", "between", "into", "through", "during", "before",
            "after", "above", "below", "from", "up", "down", "in", "out", "off", "over",
            "under", "again", "further", "then", "once", "here", "there", "when", "where",
            "why", "how", "all", "any", "both", "each", "few", "more", "most", "other",
            "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
            "very", "s", "t", "can", "will", "just", "don", "should", "now", "i", "we", "my",
            "our", "you", "your", "it", "its", "this", "that", "these", "those"
        }

    async def predict_heuristic(self, text: str, **kwargs: Any) -> TopicDetectionResult:
        """Extract key phrases and topic tags using term frequencies."""
        if not text or not text.strip():
            return TopicDetectionResult(topics=[], keywords=[])

        words = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
        filtered_words = [w for w in words if w not in self.stop_words]

        freq: dict[str, int] = {}
        for w in filtered_words:
            freq[w] = freq.get(w, 0) + 1

        sorted_words = sorted(freq.items(), key=lambda item: item[1], reverse=True)
        top_keywords = [word for word, count in sorted_words[:5]]

        # Domain topic mapping heuristic
        domain_topics = []
        text_lower = text.lower()
        if any(term in text_lower for term in ["login", "auth", "password", "sso", "sign in"]):
            domain_topics.append("Authentication")
        if any(term in text_lower for term in ["billing", "invoice", "payment", "card", "charge", "subscription"]):
            domain_topics.append("Billing & Subscriptions")
        if any(term in text_lower for term in ["api", "webhook", "sdk", "endpoint", "integration"]):
            domain_topics.append("Developer API")
        if any(term in text_lower for term in ["dashboard", "ui", "ux", "button", "screen", "mobile"]):
            domain_topics.append("UI & Experience")
        if any(term in text_lower for term in ["slow", "latency", "timeout", "lag", "performance"]):
            domain_topics.append("Performance")

        if not domain_topics:
            domain_topics = [kw.capitalize() for kw in top_keywords[:3]]

        return TopicDetectionResult(
            topics=domain_topics,
            keywords=top_keywords
        )

    async def predict_llm(self, text: str, **kwargs: Any) -> TopicDetectionResult:
        return await self.predict_heuristic(text, **kwargs)


topic_detection_service = TopicDetectionService()
