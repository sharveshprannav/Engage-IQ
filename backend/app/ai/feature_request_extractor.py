"""
EngageAI — Feature Request Extractor Service
Extracts proposed features, functional requirements, and target components from feedback text.
"""

from __future__ import annotations

import re
from typing import Any
from pydantic import BaseModel, Field

from app.ai.base import BaseAIService


class ExtractedFeature(BaseModel):
    feature_title: str
    description: str
    target_module: str = "General"
    impact_level: str = "Medium"


class FeatureExtractorResult(BaseModel):
    has_feature_request: bool
    features: list[ExtractedFeature] = Field(default_factory=list)


class FeatureRequestExtractorService(BaseAIService[FeatureExtractorResult]):
    """Extracts explicit product enhancement ideas."""

    def __init__(self) -> None:
        super().__init__()
        self.trigger_patterns = [
            r"(?:would be nice|please add|feature request|wish there was|hope you can add|need ability to|support for)\s+([^.!?\n]+)",
            r"(?:allow us to|can you make it so|option to)\s+([^.!?\n]+)"
        ]

    async def predict_heuristic(self, text: str, **kwargs: Any) -> FeatureExtractorResult:
        """Regex pattern extraction fallback."""
        extracted: list[ExtractedFeature] = []

        for pattern in self.trigger_patterns:
            matches = re.findall(pattern, text, flags=re.IGNORECASE)
            for m in matches:
                clean_req = m.strip()
                if len(clean_req) > 5:
                    extracted.append(
                        ExtractedFeature(
                            feature_title=clean_req[:60].title(),
                            description=f"Requested feature: {clean_req}",
                            target_module="Product Backlog",
                            impact_level="Medium"
                        )
                    )

        return FeatureExtractorResult(
            has_feature_request=len(extracted) > 0,
            features=extracted
        )

    async def predict_llm(self, text: str, **kwargs: Any) -> FeatureExtractorResult:
        return await self.predict_heuristic(text, **kwargs)


feature_request_extractor_service = FeatureRequestExtractorService()
