"""
EngageAI — User Pydantic Schemas
Request/response models for user and auth endpoints.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserBase(BaseModel):
    """Base user fields."""
    email: EmailStr
    full_name: Optional[str] = None
    role: str = Field(default="viewer", pattern=r"^(admin|manager|agent|viewer|user)$")


class UserCreate(UserBase):
    """Schema for user registration."""
    password: str = Field(..., min_length=6, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    """Schema for login request."""
    email: EmailStr
    password: str


class UserResetPassword(BaseModel):
    """Schema for password reset request."""
    email: EmailStr
    new_password: str = Field(..., min_length=6, max_length=128)


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    full_name: Optional[str] = None
    role: Optional[str] = Field(None, pattern=r"^(admin|manager|agent|viewer)$")
    team_id: Optional[UUID] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    """Schema for user response (no password)."""
    id: UUID
    email: str
    full_name: Optional[str] = None
    role: str
    team_id: Optional[UUID] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Schema for authentication token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenRefreshRequest(BaseModel):
    """Schema for token refresh request."""
    refresh_token: str


class TeamCreate(BaseModel):
    """Schema for creating a team."""
    name: str = Field(..., min_length=1, max_length=255)
    notification_channels: dict = Field(default_factory=dict)


class TeamResponse(BaseModel):
    """Schema for team response."""
    id: UUID
    name: str
    notification_channels: dict
    created_at: datetime

    model_config = {"from_attributes": True}
