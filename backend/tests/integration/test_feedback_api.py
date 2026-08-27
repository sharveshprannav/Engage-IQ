"""
EngageAI — Feedback API Integration Test
Verifies health check and feedback endpoint response schemas.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check_endpoint(async_client: AsyncClient):
    """Health check endpoint must return healthy status."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "EngageAI"
