"""
EngageAI — Sentiment Analysis Unit Tests
"""

import pytest
from app.ai.sentiment import sentiment_service


@pytest.mark.asyncio
async def test_positive_sentiment():
    result = await sentiment_service.predict_heuristic("This platform is amazing and super fast!")
    assert result.sentiment > 0.3
    assert result.label == "positive"


@pytest.mark.asyncio
async def test_negative_sentiment():
    result = await sentiment_service.predict_heuristic("Terrible outage, system crashed and unusable.")
    assert result.sentiment < -0.3
    assert result.label == "negative"
