"""
EngageAI Backend — SQLAlchemy Declarative Base
Base class for all ORM models.
"""

from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase, MappedAsDataclass


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass
