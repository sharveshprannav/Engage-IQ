"""
EngageAI — Cross-Database Portable ORM Types
Provides GUID and JSONB types compatible with both PostgreSQL and SQLite.
"""

from __future__ import annotations

import uuid
from sqlalchemy import JSON, String
from sqlalchemy.types import TypeDecorator


class GUID(TypeDecorator):
    """Platform-independent GUID type. Uses PostgreSQL UUID or String(36)."""
    impl = String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return str(value)
        return str(uuid.UUID(str(value)))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(str(value))


# Portable JSON type rendering JSONB on Postgres and JSON on SQLite
JSONB = JSON
UUID = GUID
