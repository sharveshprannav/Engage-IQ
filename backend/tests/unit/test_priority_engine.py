"""
EngageAI — Priority Engine Unit Tests
Verifies composite scoring formula and SLA tier mapping across scenarios.
"""

import pytest
from app.ai.priority_engine import priority_engine_service
from app.models.feedback import FeedbackPriority, FeedbackCategory, CustomerTier


@pytest.mark.asyncio
async def test_very_high_priority_assignment():
    """Enterprise customer with negative sentiment and outage keywords must trigger Very High priority."""
    result = await priority_engine_service.predict_heuristic(
        text="Production system is down! Critical outage affecting all enterprise users.",
        sentiment=-0.85,
        category=FeedbackCategory.BUG,
        customer_tier=CustomerTier.ENTERPRISE
    )

    assert result.priority == FeedbackPriority.VERY_HIGH
    assert result.composite_score >= 0.80
    assert "Very High" in result.priority_reasoning
    assert result.sla_target_hours == 1


@pytest.mark.asyncio
async def test_normal_priority_assignment():
    """Free tier customer with positive sentiment praise must yield standard Low or Normal priority."""
    result = await priority_engine_service.predict_heuristic(
        text="Love the new UI update! Great work team.",
        sentiment=0.75,
        category=FeedbackCategory.PRAISE,
        customer_tier=CustomerTier.FREE
    )

    assert result.priority in (FeedbackPriority.LOW, FeedbackPriority.NORMAL)
    assert result.composite_score < 0.40
    assert result.sla_target_hours <= 120
