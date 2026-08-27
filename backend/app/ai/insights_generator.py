"""
EngageAI — Insights Generator Service
Synthesizes aggregated feedback into executive summaries, key friction points, and recommendations.
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field

from app.ai.base import BaseAIService


class ActionableInsight(BaseModel):
    title: str
    category: str
    finding: str
    recommended_action: str
    impact_score: float = 0.8


class InsightsResult(BaseModel):
    executive_summary: str
    top_friction_points: list[str] = Field(default_factory=list)
    actionable_insights: list[ActionableInsight] = Field(default_factory=list)


class InsightsGeneratorService(BaseAIService[InsightsResult]):
    """Executive insights generator."""

    async def predict_heuristic(self, text: str, **kwargs: Any) -> InsightsResult:
        """Template-based aggregation heuristic."""
        total_items: int = kwargs.get("total_items", 100)
        top_category: str = kwargs.get("top_category", "bug")
        neg_percent: float = kwargs.get("neg_percent", 35.0)

        exec_summary = (
            f"Over the evaluated period ({total_items} items ingested), the primary driver of customer sentiment "
            f"was '{top_category}' reports. Approximately {neg_percent:.1f}% of feedback expressed negative sentiment, "
            f"concentrated around operational stability and feature gaps."
        )

        frictions = [
            f"High volume of '{top_category}' feedback affecting user workflows.",
            "Response times for High/Very High priority issues require optimization.",
            "Recurring queries regarding subscription management and integration APIs."
        ]

        actions = [
            ActionableInsight(
                title=f"Prioritize {top_category.capitalize()} Fixes",
                category=top_category,
                finding=f"Customer complaints are heavily weighted toward {top_category} issues.",
                recommended_action=f"Assign dedicated engineering sprint to address top {top_category} reports.",
                impact_score=0.90
            ),
            ActionableInsight(
                title="Automate Triage Workflows",
                category="Operations",
                finding="High SLA pressure on incoming enterprise requests.",
                recommended_action="Enable auto-ticketing rule for Enterprise customer bug reports.",
                impact_score=0.85
            )
        ]

        return InsightsResult(
            executive_summary=exec_summary,
            top_friction_points=frictions,
            actionable_insights=actions
        )

    async def predict_llm(self, text: str, **kwargs: Any) -> InsightsResult:
        return await self.predict_heuristic(text, **kwargs)


insights_generator_service = InsightsGeneratorService()
