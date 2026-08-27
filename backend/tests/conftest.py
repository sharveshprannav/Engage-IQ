"""
EngageAI — Pytest Conftest & Test Fixtures
Provides test DB engine, async session, and FastAPI TestClient.
"""

import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.security import create_access_token


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP test client for FastAPI endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
def auth_headers() -> dict[str, str]:
    """Test JWT authorization bearer headers."""
    token = create_access_token(
        user_id="00000000-0000-0000-0000-000000000001",
        email="testadmin@engageai.io",
        role="admin"
    )
    return {"Authorization": f"Bearer {token}"}
