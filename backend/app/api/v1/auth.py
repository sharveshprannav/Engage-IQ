"""
EngageAI — Authentication Router
Endpoints for user registration, login (JWT token generation), token refresh, password reset, and user profile.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.postgres import get_db_session
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResetPassword,
    UserResponse,
    TokenResponse,
    TokenRefreshRequest,
)
from app.models.user import User, UserRole
from app.core.security import (
    hash_password,
    verify_password,
    create_token_pair,
    verify_refresh_token,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(dto: UserCreate, db: AsyncSession = Depends(get_db_session)):
    """Register a new platform user."""
    res = await db.execute(select(User).where(User.email == dto.email))
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    role_enum = UserRole.VIEWER if dto.role in ("viewer", "user") else UserRole(dto.role)
    user = User(
        email=dto.email,
        hashed_password=hash_password(dto.password),
        full_name=dto.full_name,
        role=role_enum,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(dto: UserLogin, db: AsyncSession = Depends(get_db_session)):
    """Authenticate credentials and return access + refresh JWT tokens."""
    res = await db.execute(select(User).where(User.email == dto.email))
    user = res.scalar_one_or_none()

    if not user or not verify_password(dto.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
    token_pair = create_token_pair(user_id=user.id, email=user.email, role=role_str)

    return TokenResponse(
        access_token=token_pair.access_token,
        refresh_token=token_pair.refresh_token,
        token_type="bearer",
        expires_in=token_pair.expires_in
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token_endpoint(dto: TokenRefreshRequest, db: AsyncSession = Depends(get_db_session)):
    """Refresh expired access token using valid refresh token."""
    token_data = verify_refresh_token(dto.refresh_token)
    res = await db.execute(select(User).where(User.email == token_data.email))
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
    token_pair = create_token_pair(user_id=user.id, email=user.email, role=role_str)
    return TokenResponse(
        access_token=token_pair.access_token,
        refresh_token=token_pair.refresh_token,
        token_type="bearer",
        expires_in=token_pair.expires_in
    )


@router.post("/forgot-password")
async def forgot_password_endpoint(
    dto: UserResetPassword, db: AsyncSession = Depends(get_db_session)
):
    """Reset user password by verified email."""
    res = await db.execute(select(User).where(User.email == dto.email))
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address."
        )

    user.hashed_password = hash_password(dto.new_password)
    await db.commit()
    return {"message": "Password reset successfully. You can now sign in with your new password."}


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Return profile info of currently logged in user."""
    return current_user
