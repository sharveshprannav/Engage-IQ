"""
EngageAI Backend — AI Assistant Router
Endpoints for conversational customer intelligence, Gemini model status, and live database context.
"""

from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, Header, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_optional_current_user
from app.models.user import User
from app.core.config import settings
from app.db.postgres import get_db_session
from app.models.feedback import Feedback
from app.services.gemini_service import gemini_service

router = APIRouter(prefix="/assistant", tags=["AI Assistant"])


class ChatMessage(BaseModel):
    id: Optional[str] = None
    sender: str = Field(default="user", description="'user' or 'assistant'")
    text: str = Field(..., min_length=1)
    timestamp: Optional[str] = None


class AssistantChatRequest(BaseModel):
    messages: list[ChatMessage]
    model: Optional[str] = None
    api_key: Optional[str] = None


class AssistantChatResponse(BaseModel):
    text: str
    model: str
    grounded: bool = True
    has_key: bool = True
    feedback_count: Optional[int] = None
    error: Optional[str] = None


class AssistantStatusResponse(BaseModel):
    has_key: bool
    default_model: str
    provider: str
    total_feedback_count: int


@router.post(
    "/chat",
    response_model=AssistantChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Chat with EngageAI Assistant",
    description="Multi-turn conversation powered by Google Gemini with live feedback RAG grounding.",
)
async def chat_with_assistant(
    payload: AssistantChatRequest,
    x_gemini_api_key: Optional[str] = Header(None, alias="X-Gemini-Api-Key"),
    db: AsyncSession = Depends(get_db_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> AssistantChatResponse:
    # Key priority: request body api_key > X-Gemini-Api-Key header > .env settings
    active_key = payload.api_key or x_gemini_api_key

    messages_data = [
        {"sender": m.sender, "text": m.text}
        for m in payload.messages
    ]

    result = await gemini_service.generate_chat_response(
        messages=messages_data,
        db=db,
        custom_api_key=active_key,
        model_name=payload.model,
        user_id=current_user.id if current_user else None,
    )

    return AssistantChatResponse(**result)


@router.get(
    "/status",
    response_model=AssistantStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get AI Assistant & Gemini Configuration Status",
)
async def get_assistant_status(
    db: AsyncSession = Depends(get_db_session),
) -> AssistantStatusResponse:
    has_server_key = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())
    
    count_stmt = select(func.count(Feedback.id))
    count_res = await db.execute(count_stmt)
    total_feedback = count_res.scalar() or 0

    return AssistantStatusResponse(
        has_key=has_server_key,
        default_model=settings.GEMINI_MODEL or "gemini-3.6-flash",
        provider=settings.AI_PROVIDER or "gemini",
        total_feedback_count=total_feedback,
    )
