"""
EngageAI Backend — Google Gemini AI Service
Provides async integration with Google Gemini LLM API (gemini-3.6-flash / gemini-3.7-flash)
for conversational intelligence, sentiment synthesis, and RAG database grounding.
"""

from __future__ import annotations

import json
from typing import Any, Optional
import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.models.feedback import Feedback
from app.models.ml_inference_log import MLInferenceLog

logger = get_logger("GeminiService")

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

# Map older/deprecated model names to current active models
MODEL_ALIASES = {
    "gemini-2.0-flash": "gemini-3.6-flash",
    "gemini-2.0-flash-exp": "gemini-3.6-flash",
    "gemini-2.0-flash-lite": "gemini-3.6-flash",
    "gemini-2.0-pro": "gemini-3.7-flash",
    "gemini-2.0-pro-exp": "gemini-3.7-flash",
    "gemini-2.0-flash-thinking-exp": "gemini-3.7-flash",
    "gemini-1.5-flash": "gemini-3.6-flash",
    "gemini-1.5-flash-8b": "gemini-3.6-flash",
    "gemini-1.5-pro": "gemini-3.7-flash",
    "gemini-2.5-flash": "gemini-3.6-flash",
    "gemini-2.5-pro": "gemini-3.7-flash",
    "gemini-flash-latest": "gemini-3.6-flash",
    "gemini-pro-latest": "gemini-3.7-flash",
}


class GeminiService:
    """Async client and reasoning service for Google Gemini API."""

    def __init__(self) -> None:
        raw_model = settings.GEMINI_MODEL or "gemini-3.6-flash"
        self.default_model = MODEL_ALIASES.get(raw_model, raw_model)

    def get_api_key(self, custom_key: Optional[str] = None) -> Optional[str]:
        """Resolve API key from explicit parameter or settings."""
        if custom_key and custom_key.strip():
            return custom_key.strip()
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
            return settings.GEMINI_API_KEY.strip()
        return None

    async def get_database_context(
        self,
        db: AsyncSession,
        user_id: Optional[uuid.UUID] = None,
    ) -> dict[str, Any]:
        """
        Extract real-time database context (recent feedback, sentiment, ML runs)
        to ground Gemini responses in actual customer data.
        Inference logs are strictly isolated to the requesting user.
        """
        try:
            # 1. Fetch recent feedback records
            fb_stmt = select(Feedback).order_by(Feedback.created_at.desc()).limit(15)
            fb_res = await db.execute(fb_stmt)
            feedbacks = fb_res.scalars().all()

            feedback_items = [
                {
                    "id": str(fb.id)[:8],
                    "title": fb.title or "Feedback",
                    "category": fb.category or "General",
                    "priority": fb.priority or "Medium",
                    "sentiment": round(fb.sentiment_score, 2) if fb.sentiment_score is not None else 0.0,
                    "sentiment_label": fb.sentiment_label or "neutral",
                    "customer_tier": fb.customer_tier or "standard",
                    "snippet": (fb.raw_text or "")[:150],
                    "status": fb.status or "new",
                }
                for fb in feedbacks
            ]

            # 2. Compute aggregate counts
            count_stmt = select(func.count(Feedback.id))
            count_res = await db.execute(count_stmt)
            total_feedback = count_res.scalar() or 0

            # 3. Recent ML pipeline inference logs (strictly isolated to current user)
            ml_conditions = []
            if user_id is not None:
                ml_conditions.append(MLInferenceLog.user_id == user_id)

            ml_stmt = select(MLInferenceLog)
            if ml_conditions:
                ml_stmt = ml_stmt.where(*ml_conditions)
            ml_stmt = ml_stmt.order_by(MLInferenceLog.created_at.desc()).limit(10)
            ml_res = await db.execute(ml_stmt)
            ml_logs = ml_res.scalars().all()

            ml_items = [
                {
                    "request_id": log.request_id,
                    "category": log.category_name or log.primary_label or "General",
                    "input_type": log.input_type,
                    "confidence": round(log.overall_confidence, 2) if log.overall_confidence else None,
                    "latency_ms": round(log.latency_total_ms, 1) if log.latency_total_ms else None,
                    "status": log.status,
                    "summary": log.input_summary or log.output_summary or "",
                }
                for log in ml_logs
            ]

            return {
                "total_feedback_count": total_feedback,
                "recent_feedback_samples": feedback_items,
                "recent_ml_pipeline_runs": ml_items,
            }
        except Exception as e:
            logger.warning("failed_to_fetch_database_context", error=str(e))
            return {
                "total_feedback_count": 0,
                "recent_feedback_samples": [],
                "recent_ml_pipeline_runs": [],
            }

    async def generate_chat_response(
        self,
        messages: list[dict[str, str]],
        db: Optional[AsyncSession] = None,
        custom_api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> dict[str, Any]:
        """
        Execute multi-turn chat generation using Google Gemini API with RAG context grounding.
        """
        api_key = self.get_api_key(custom_api_key)
        raw_requested = model_name or self.default_model
        model = MODEL_ALIASES.get(raw_requested, raw_requested)

        # Fetch live database context if session is available
        context_data = {}
        if db is not None:
            context_data = await self.get_database_context(db, user_id=user_id)

        # If no API key configured, return guidance message with fallback synthesis
        if not api_key:
            return {
                "text": (
                    "⚠️ **Google Gemini API Key Required**\n\n"
                    "No Gemini API key is configured. You can either:\n"
                    "1. Click the **'⚙️ Gemini Key'** button in the top right to paste your API key directly in this session.\n"
                    "2. Or add `GEMINI_API_KEY=your-key-here` to the `.env` file in the project backend.\n\n"
                    f"*(Live Context Status: {context_data.get('total_feedback_count', 0)} feedback records and "
                    f"{len(context_data.get('recent_ml_pipeline_runs', []))} ML inference sessions available in database)*"
                ),
                "model": model,
                "grounded": False,
                "has_key": False,
            }

        # Build system prompt with EngageAI Persona and Database Grounding
        system_instruction = (
            "You are EngageAI Assistant — an autonomous, next-generation customer feedback intelligence "
            "and ML analytics assistant. You help product managers, engineers, and support leads understand "
            "customer pain points, triage bug reports, monitor SLAs, analyze sentiment polarity distributions, "
            "and discover strategic product opportunities.\n\n"
            "CURRENT LIVE PLATFORM DATA CONTEXT:\n"
            f"- Total Ingested Feedback in DB: {context_data.get('total_feedback_count', 0)}\n"
            f"- Recent Feedback Samples:\n{json.dumps(context_data.get('recent_feedback_samples', []), indent=2)}\n\n"
            f"- Recent ML Pipeline Inference Sessions:\n{json.dumps(context_data.get('recent_ml_pipeline_runs', []), indent=2)}\n\n"
            "GUIDELINES:\n"
            "1. Ground your answers in the real platform data provided above whenever the user asks about stats, trends, feedback, bugs, or inference sessions.\n"
            "2. If the user asks general questions, answer them insightfully with modern customer success and engineering best practices.\n"
            "3. Format answers with clean GitHub markdown: bold text, bullet points, metric highlights, and emoji headers.\n"
            "4. Provide actionable takeaways and strategic recommendations."
        )

        # Build Gemini contents structure
        contents = []
        for msg in messages:
            role = "user" if msg.get("sender") == "user" or msg.get("role") == "user" else "model"
            text_content = msg.get("text") or msg.get("content") or ""
            if text_content.strip():
                contents.append({
                    "role": role,
                    "parts": [{"text": text_content}],
                })

        if not contents:
            contents.append({"role": "user", "parts": [{"text": "Hello"}]})

        payload = {
            "contents": contents,
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "generationConfig": {
                "temperature": 0.7,
                "topP": 0.95,
                "maxOutputTokens": 2048,
            }
        }

        async def _call_gemini(target_model: str) -> httpx.Response:
            url = f"{GEMINI_API_BASE}/{target_model}:generateContent?key={api_key}"
            async with httpx.AsyncClient(timeout=45.0) as client:
                return await client.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )

        try:
            response = await _call_gemini(model)

            # Auto-fallback to gemini-3.6-flash if selected model returned 404 or unsupported
            if response.status_code == 404 and model != "gemini-3.6-flash":
                logger.warning("gemini_model_not_found_falling_back", requested=model, fallback="gemini-3.6-flash")
                model = "gemini-3.6-flash"
                response = await _call_gemini(model)

            if response.status_code != 200:
                error_detail = response.text
                try:
                    err_json = response.json()
                    error_detail = err_json.get("error", {}).get("message", response.text)
                except Exception:
                    pass
                
                logger.error("gemini_api_error", status_code=response.status_code, error=error_detail)
                return {
                    "text": f"❌ **Gemini API Error ({response.status_code})**: {error_detail}\n\nPlease check that your Gemini API key has access to model `{model}`.",
                    "model": model,
                    "grounded": False,
                    "has_key": True,
                    "error": error_detail,
                }

            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return {
                    "text": "No response candidates returned by Gemini model.",
                    "model": model,
                    "grounded": True,
                    "has_key": True,
                }

            parts = candidates[0].get("content", {}).get("parts", [])
            text_response = "".join(p.get("text", "") for p in parts if "text" in p)

            return {
                "text": text_response or "Analysis completed successfully.",
                "model": model,
                "grounded": True,
                "has_key": True,
                "feedback_count": context_data.get("total_feedback_count", 0),
            }

        except httpx.TimeoutException:
            logger.error("gemini_request_timeout")
            return {
                "text": "⏱️ **Request Timeout**: Gemini API took too long to respond. Please try again.",
                "model": model,
                "grounded": False,
                "has_key": True,
            }
        except Exception as e:
            logger.error("gemini_request_failed", error=str(e))
            return {
                "text": f"⚠️ **Connection Error**: Failed to connect to Gemini API: {str(e)}",
                "model": model,
                "grounded": False,
                "has_key": True,
            }


gemini_service = GeminiService()
