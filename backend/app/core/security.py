"""
EngageAI Backend — Security Module
JWT access/refresh tokens, password hashing (bcrypt), OAuth2 bearer scheme.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.core.config import settings

import hashlib
import hmac

def hash_password(password: str) -> str:
    """Hash a plain-text password using SHA-256 with secret key salt."""
    salt = settings.SECRET_KEY.encode('utf-8')
    pw_bytes = password.encode('utf-8')
    return hmac.new(salt, pw_bytes, hashlib.sha256).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against hash."""
    expected = hash_password(plain_password)
    return hmac.compare_digest(expected, hashed_password)


# ─── JWT Token Models ──────────────────────────────────────────
class TokenData(BaseModel):
    """Decoded JWT token payload."""
    user_id: str
    email: str
    role: str
    token_type: str = "access"  # "access" or "refresh"


class TokenPair(BaseModel):
    """Access + refresh token pair returned on login."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


# ─── OAuth2 Scheme ──────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ─── Token Creation ────────────────────────────────────────────
def create_access_token(
    user_id: UUID | str,
    email: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a JWT access token."""
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "type": "access",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(
    user_id: UUID | str,
    email: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a JWT refresh token with longer expiry."""
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    )
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "type": "refresh",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_token_pair(user_id: UUID | str, email: str, role: str) -> TokenPair:
    """Generate both access and refresh tokens."""
    access_token = create_access_token(user_id, email, role)
    refresh_token = create_refresh_token(user_id, email, role)
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


# ─── Token Verification ────────────────────────────────────────
def decode_token(token: str) -> TokenData:
    """
    Decode and validate a JWT token.
    Raises HTTPException 401 if token is invalid or expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id: Optional[str] = payload.get("sub")
        email: Optional[str] = payload.get("email")
        role: Optional[str] = payload.get("role")
        token_type: str = payload.get("type", "access")

        if user_id is None or email is None or role is None:
            raise credentials_exception

        return TokenData(
            user_id=user_id,
            email=email,
            role=role,
            token_type=token_type,
        )
    except JWTError:
        raise credentials_exception


def verify_refresh_token(token: str) -> TokenData:
    """Verify a refresh token specifically."""
    token_data = decode_token(token)
    if token_data.token_type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    return token_data


# ─── Role-Based Access Control ──────────────────────────────────
ROLE_HIERARCHY = {
    "admin": 4,
    "manager": 3,
    "agent": 2,
    "viewer": 1,
}


def check_role_permission(user_role: str, required_role: str) -> bool:
    """Check if user's role meets the required role level."""
    user_level = ROLE_HIERARCHY.get(user_role, 0)
    required_level = ROLE_HIERARCHY.get(required_role, 0)
    return user_level >= required_level


def require_role(required_role: str):
    """
    FastAPI dependency that checks if the current user has the required role.
    Usage: Depends(require_role("manager"))
    """
    async def role_checker(token: str = Depends(oauth2_scheme)) -> TokenData:
        token_data = decode_token(token)
        if not check_role_permission(token_data.role, required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{required_role}' or higher required. Your role: '{token_data.role}'",
            )
        return token_data
    return role_checker
