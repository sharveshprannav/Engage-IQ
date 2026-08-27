"""
EngageAI — FastAPI API Dependencies
Dependency injection for Database session, Current authenticated User, and RBAC.
"""

from __future__ import annotations

from typing import AsyncGenerator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.postgres import get_db_session
from app.core.security import oauth2_scheme, decode_token
from app.models.user import User

http_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db_session)
) -> User:
    """Validate JWT bearer token and retrieve matching user from database."""
    token_data = decode_token(token)
    res = await db.execute(select(User).where(User.email == token_data.email))
    user = res.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account inactive or not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_optional_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
    db: AsyncSession = Depends(get_db_session),
) -> Optional[User]:
    """Retrieve authenticated user if valid Bearer token is provided, else return None."""
    if not auth or not auth.credentials:
        return None
    try:
        token_data = decode_token(auth.credentials)
        res = await db.execute(select(User).where(User.email == token_data.email))
        user = res.scalar_one_or_none()
        if user and user.is_active:
            return user
    except Exception:
        return None
    return None


def require_role(min_role: str):
    """RBAC dependency checking user role against required level."""
    role_levels = {"viewer": 1, "agent": 2, "manager": 3, "admin": 4}

    async def role_dependency(user: User = Depends(get_current_user)) -> User:
        user_lvl = role_levels.get(user.role.value if hasattr(user.role, "value") else str(user.role), 1)
        required_lvl = role_levels.get(min_role, 1)

        if user_lvl < required_lvl:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: role '{min_role}' or higher required."
            )
        return user

    return role_dependency
