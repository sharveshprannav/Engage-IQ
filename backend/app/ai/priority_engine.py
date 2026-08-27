"""
EngageAI — Priority Engine (Section 7 Requirement)
Combines sentiment polarity + category + customer tier + severity/churn keywords into a weighted composite score.
Maps to 4 tiers: Very High, High, Low, Normal with human-readable explainable reasoning string.
"""

from __future__ import annotations

import re
from typing import Any
from pydantic import BaseModel, Field

from app.ai.base import BaseAIService
from app.models.feedback import FeedbackPriority, FeedbackCategory, CustomerTier
from app.core.config import settings


class PriorityResult(BaseModel):
    priority: FeedbackPriority
    composite_score: float = Field(..., ge=0.0, le=1.0)
    priority_reasoning: str = Field(..., description="Human-readable explanation of priority tier assignment")
    sla_target_hours: int = Field(..., description="Target response SLA window in hours")


class PriorityEngineService(BaseAIService[PriorityResult]):
    """Weighted hybrid priority scoring engine."""

    def __init__(self) -> None:
        super().__init__()
        self.outage_keywords = {"outage", "down", "crash", "crashed", "500 error", "production down", "urgent", "security", "data loss", "data breach"}
        self.churn_keywords = {"cancel", "cancellation", "refund", "switching to", "unacceptable", "competitor", "leaving"}

    async def predict_heuristic(self, text: str, **kwargs: Any) -> PriorityResult:
        """
        Calculate priority composite score using weighted formulas.
        Weights defined in settings:
          - sentiment_weight (0.30)
          - category_weight (0.25)
          - tier_weight (0.25)
          - keyword_weight (0.20)
        """
        sentiment: float = kwargs.get("sentiment", 0.0)  # -1.0 to 1.0
        category: FeedbackCategory = kwargs.get("category", FeedbackCategory.INQUIRY)
        customer_tier: CustomerTier = kwargs.get("customer_tier", CustomerTier.FREE)
        is_anomaly_flagged: bool = kwargs.get("is_anomaly_flagged", False)

        reasoning_parts: list[str] = []

        # 1. Sentiment Score Component (0.0 to 1.0; more negative = higher score)
        # Convert sentiment (-1 to 1) -> negative intensity (0 to 1)
        neg_intensity = max(0.0, -sentiment)
        sentiment_score = neg_intensity
        if sentiment < -0.4:
            reasoning_parts.append(f"negative sentiment ({sentiment:.2f})")

        # 2. Category Score Component (0.0 to 1.0)
        category_weights = {
            FeedbackCategory.BUG: 0.90,
            FeedbackCategory.COMPLAINT: 0.75,
            FeedbackCategory.FEATURE_REQUEST: 0.40,
            FeedbackCategory.INQUIRY: 0.30,
            FeedbackCategory.PRAISE: 0.10,
        }
        cat_score = category_weights.get(category, 0.30)
        reasoning_parts.append(f"{category.value} category")

        # 3. Customer Tier Score Component (0.0 to 1.0)
        tier_weights = {
            CustomerTier.ENTERPRISE: 1.00,
            CustomerTier.PRO: 0.60,
            CustomerTier.FREE: 0.20,
        }
        tier_score = tier_weights.get(customer_tier, 0.20)
        reasoning_parts.append(f"{customer_tier.value} tier customer")

        # 4. Keyword Severity & Churn Risk Component (0.0 to 1.0)
        kw_score = 0.0
        text_lower = text.lower()
        has_outage = any(kw in text_lower for kw in self.outage_keywords)
        has_churn = any(kw in text_lower for kw in self.churn_keywords)

        if has_outage:
            kw_score += 0.80
            reasoning_parts.append("mentions critical outage/production issue")
        if has_churn:
            kw_score += 0.60
            reasoning_parts.append("contains churn risk keywords")
        kw_score = min(1.0, kw_score)

        # 5. Composite Weighted Score Calculation
        w_sent = settings.PRIORITY_SENTIMENT_WEIGHT
        w_cat = settings.PRIORITY_CATEGORY_WEIGHT
        w_tier = settings.PRIORITY_TIER_WEIGHT
        w_kw = settings.PRIORITY_KEYWORD_WEIGHT

        composite = (
            w_sent * sentiment_score +
            w_cat * cat_score +
            w_tier * tier_score +
            w_kw * kw_score
        )

        # Boost for anomaly spike
        if is_anomaly_flagged:
            composite = min(1.0, composite + 0.15)
            reasoning_parts.append("flagged by AnomalyAgent spike detection")

        composite = round(composite, 4)

        # Tier mapping & SLA target resolution:
        # - VERY HIGH: Critical production outages, system-wide failures, security incidents
        # - HIGH: Severe churn risk or major enterprise blockers
        # - NORMAL: Standard solvable negative feedback, bug triage, complaints, and usability items
        # - LOW: Minor inquiries, trivial suggestions, and positive praise
        if (has_outage and (customer_tier == CustomerTier.ENTERPRISE or sentiment < -0.6)) or composite >= settings.PRIORITY_VERY_HIGH_THRESHOLD:
            priority = FeedbackPriority.VERY_HIGH
            sla_hours = 1
            prefix = "Escalated to Very High"
        elif composite >= settings.PRIORITY_HIGH_THRESHOLD or (has_churn and customer_tier == CustomerTier.ENTERPRISE):
            priority = FeedbackPriority.HIGH
            sla_hours = 4
            prefix = "Assigned High priority"
        elif composite >= settings.PRIORITY_LOW_THRESHOLD or sentiment < 0.0 or category in (FeedbackCategory.BUG, FeedbackCategory.COMPLAINT):
            priority = FeedbackPriority.NORMAL
            sla_hours = 24  # Solvable standard response window
            prefix = "Assigned Normal priority (Solvable)"
        else:
            priority = FeedbackPriority.LOW
            sla_hours = 72
            prefix = "Assigned Low priority"

        reasoning = f"{prefix}: {', '.join(reasoning_parts)} (score: {composite})."

        return PriorityResult(
            priority=priority,
            composite_score=composite,
            priority_reasoning=reasoning,
            sla_target_hours=sla_hours
        )

    async def predict_llm(self, text: str, **kwargs: Any) -> PriorityResult:
        return await self.predict_heuristic(text, **kwargs)


priority_engine_service = PriorityEngineService()
