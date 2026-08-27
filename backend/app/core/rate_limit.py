"""
EngageAI Backend — Rate Limiting
Redis-backed rate limiter using slowapi for public/ingestion endpoints.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# Initialize the rate limiter with Redis backend
# In development, falls back to in-memory storage if Redis is unavailable
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
    storage_uri="memory://",
    strategy="fixed-window",
)
