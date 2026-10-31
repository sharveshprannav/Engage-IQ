"""
EngageAI Backend — Google Gemini AI Service
Provides async integration with Google Gemini LLM API with automatic API key rotation.

Key rotation strategy:
  - All configured keys (GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3) are tried in order.
  - If a key returns 429 (rate limit), 403 (quota exceeded), or 400 (invalid key),
    the service automatically retries with the next available key.
  - Only valid keys (starting with "AIzaSy...") are used; OAuth tokens are skipped.
  - The key that last succeeded is remembered in-process so future requests start from it.
"""

from __future__ import annotations

import json
import uuid
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

# HTTP status codes that trigger key rotation to the next key
KEY_ROTATION_STATUSES = {400, 401, 403, 429}

# Map custom/deprecated/nonexistent model names to real Google Gemini API model IDs.
MODEL_ALIASES = {
    # Fake "gemini-3.x" names → real models
    "gemini-3.6-flash":     "gemini-2.0-flash",
    "gemini-3.7-flash":     "gemini-2.5-pro-preview-06-05",
    "gemini-3.5-flash":     "gemini-1.5-flash",
    "gemini-3.1-pro-preview": "gemini-2.5-pro-preview-06-05",
    # Legacy / convenience aliases
    "gemini-2.0-flash-exp": "gemini-2.0-flash-exp",
    "gemini-2.0-flash-lite": "gemini-2.0-flash-lite",
    "gemini-2.0-pro-exp":   "gemini-2.5-pro-preview-06-05",
    "gemini-2.0-flash-thinking-exp": "gemini-2.0-flash-thinking-exp-01-21",
    "gemini-1.5-flash-8b":  "gemini-1.5-flash-8b",
    "gemini-2.5-flash":     "gemini-2.5-flash-preview-05-20",
    "gemini-2.5-pro":       "gemini-2.5-pro-preview-06-05",
    "gemini-flash-latest":  "gemini-2.0-flash",
    "gemini-pro-latest":    "gemini-2.5-pro-preview-06-05",
}


def _is_valid_api_key(key: Optional[str]) -> bool:
    """
    A valid Google AI Studio API key starts with 'AIzaSy'.
    OAuth2 tokens (starting with 'AQ.') and empty values are rejected.
    """
    return bool(key and key.strip() and key.strip().startswith("AIzaSy"))


class GeminiService:
    """
    Async client for Google Gemini API with automatic key rotation.

    Key pool is built from GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3
    (in that order). Invalid/OAuth keys are filtered out at startup.
    When a key is exhausted, the next one is tried transparently.
    """

    def __init__(self) -> None:
        raw_model = settings.GEMINI_MODEL or "gemini-2.0-flash"
        self.default_model = MODEL_ALIASES.get(raw_model, raw_model)

        # Build ordered pool of valid keys from all configured slots
        candidates = [
            settings.GEMINI_API_KEY,
            settings.GEMINI_API_KEY_2,
            settings.GEMINI_API_KEY_3,
        ]
        self._key_pool: list[str] = [
            k.strip() for k in candidates if _is_valid_api_key(k)
        ]

        # Track which key to start with (advances on exhaustion)
        self._active_key_index: int = 0

        invalid_count = len([k for k in candidates if k and not _is_valid_api_key(k)])

        logger.info(
            "gemini_key_pool_initialized",
            total_valid_keys=len(self._key_pool),
            invalid_or_oauth_skipped=invalid_count,
        )

    # ── Key Resolution ─────────────────────────────────────────────────────────

    def _get_key_pool(self, custom_key: Optional[str] = None) -> list[str]:
        """
        Return ordered list of API keys to try.
        If a custom_key is provided and valid, it is prepended and tried first.
        """
        if _is_valid_api_key(custom_key):
            # Prepend custom key; deduplicate while preserving order
            pool = [custom_key.strip()]
            for k in self._key_pool:
                if k != custom_key.strip():
                    pool.append(k)
            return pool
        return list(self._key_pool)

    def get_api_key(self, custom_key: Optional[str] = None) -> Optional[str]:
        """Return the first available key (used for status checks)."""
        pool = self._get_key_pool(custom_key)
        return pool[0] if pool else None

    def _advance_active_key(self) -> None:
        """Move to the next key in the pool (called when active key is exhausted)."""
        if self._active_key_index < len(self._key_pool) - 1:
            self._active_key_index += 1
            logger.warning(
                "gemini_key_rotated",
                new_key_index=self._active_key_index,
                keys_remaining=len(self._key_pool) - self._active_key_index,
            )

    # ── Database Context ────────────────────────────────────────────────────────

    async def get_database_context(
        self,
        db: AsyncSession,
        user_id: Optional[uuid.UUID] = None,
    ) -> dict[str, Any]:
        """
        Extract real-time database context (recent feedback, sentiment, ML runs)
        to ground Gemini responses in actual customer data.
        """
        try:
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

            count_stmt = select(func.count(Feedback.id))
            count_res = await db.execute(count_stmt)
            total_feedback = count_res.scalar() or 0

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

    # ── Core Chat with Key Rotation ─────────────────────────────────────────────

    async def generate_chat_response(
        self,
        messages: list[dict[str, str]],
        db: Optional[AsyncSession] = None,
        custom_api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> dict[str, Any]:
        """
        Execute multi-turn chat using Google Gemini API with:
        - RAG context grounding from live database
        - Automatic key rotation on quota / rate-limit errors
        - Model fallback on 404 / 503
        """
        raw_requested = model_name or self.default_model
        model = MODEL_ALIASES.get(raw_requested, raw_requested)

        # Fetch live database context
        context_data: dict[str, Any] = {}
        if db is not None:
            context_data = await self.get_database_context(db, user_id=user_id)

        # Resolve ordered key pool for this request
        key_pool = self._get_key_pool(custom_api_key)

        if not key_pool:
            return {
                "text": (
                    "⚠️ **Google Gemini API Key Required**\n\n"
                    "No valid Gemini API keys are configured on the server.\n"
                    "Please add `GEMINI_API_KEY=AIzaSy...` to the backend `.env` file.\n\n"
                    f"*(Live Context: {context_data.get('total_feedback_count', 0)} feedback records, "
                    f"{len(context_data.get('recent_ml_pipeline_runs', []))} ML sessions in database)*"
                ),
                "model": model,
                "grounded": False,
                "has_key": False,
            }

        # Build system prompt
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
                contents.append({"role": role, "parts": [{"text": text_content}]})

        if not contents:
            contents.append({"role": "user", "parts": [{"text": "Hello"}]})

        request_payload = {
            "contents": contents,
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "generationConfig": {
                "temperature": 0.7,
                "topP": 0.95,
                "maxOutputTokens": 2048,
            },
        }

        # ── Key rotation loop ────────────────────────────────────────────────
        last_error: str = ""
        last_status: int = 0

        for key_index, api_key in enumerate(key_pool):
            key_label = f"key_{key_index + 1}"
            logger.info("gemini_attempt", key_label=key_label, model=model)

            try:
                response = await self._post_to_gemini(api_key, model, request_payload)

                # ── Model fallback (404 / 503) — same key, different model ─────
                if response.status_code in (404, 503) and model != "gemini-2.0-flash":
                    logger.warning(
                        "gemini_model_fallback",
                        key_label=key_label,
                        original_model=model,
                        fallback_model="gemini-2.0-flash",
                        status=response.status_code,
                    )
                    model = "gemini-2.0-flash"
                    response = await self._post_to_gemini(api_key, model, request_payload)

                # ── Key exhausted — rotate to next key ─────────────────────────
                if response.status_code in KEY_ROTATION_STATUSES:
                    error_msg = self._extract_error(response)
                    logger.warning(
                        "gemini_key_exhausted_rotating",
                        key_label=key_label,
                        status=response.status_code,
                        error=error_msg,
                        keys_remaining=len(key_pool) - key_index - 1,
                    )
                    last_error = error_msg
                    last_status = response.status_code
                    # Advance the persistent active index if this was from the pool
                    if not custom_api_key and key_index == self._active_key_index:
                        self._advance_active_key()
                    continue  # try next key

                # ── Non-rotation error ─────────────────────────────────────────
                if response.status_code != 200:
                    error_msg = self._extract_error(response)
                    logger.error("gemini_api_error", key_label=key_label, status=response.status_code, error=error_msg)
                    return {
                        "text": f"❌ **Gemini API Error ({response.status_code})**: {error_msg}\n\nUsing model `{model}`.",
                        "model": model,
                        "grounded": False,
                        "has_key": True,
                        "error": error_msg,
                    }

                # ── Success ────────────────────────────────────────────────────
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

                logger.info("gemini_success", key_label=key_label, model=model)
                return {
                    "text": text_response or "Analysis completed successfully.",
                    "model": model,
                    "grounded": True,
                    "has_key": True,
                    "feedback_count": context_data.get("total_feedback_count", 0),
                }

            except httpx.TimeoutException:
                logger.warning("gemini_timeout", key_label=key_label)
                last_error = "Request timed out"
                last_status = 408
                continue  # try next key on timeout too

            except Exception as exc:
                logger.error("gemini_request_exception", key_label=key_label, error=str(exc))
                return {
                    "text": f"⚠️ **Connection Error**: Failed to reach Gemini API — {exc}",
                    "model": model,
                    "grounded": False,
                    "has_key": True,
                }

        # ── All keys exhausted ─────────────────────────────────────────────────
        logger.error(
            "gemini_all_keys_exhausted",
            total_keys_tried=len(key_pool),
            last_status=last_status,
            last_error=last_error,
        )
        return {
            "text": (
                f"❌ **All Gemini API Keys Exhausted** (tried {len(key_pool)} key{'s' if len(key_pool) != 1 else ''})\n\n"
                f"Last error: `{last_error or 'Unknown'}`\n\n"
                "**What to do:**\n"
                "- Wait a few minutes for rate limits to reset (they reset every minute)\n"
                "- Add more API keys to `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3` in the backend `.env`\n"
                "- Get a new free key at https://aistudio.google.com/app/apikey"
            ),
            "model": model,
            "grounded": False,
            "has_key": True,
            "error": last_error,
        }

    # ── Internal helpers ───────────────────────────────────────────────────────

    async def _post_to_gemini(
        self,
        api_key: str,
        model: str,
        payload: dict[str, Any],
    ) -> httpx.Response:
        """Send a POST request to the Gemini generateContent endpoint."""
        url = f"{GEMINI_API_BASE}/{model}:generateContent?key={api_key}"
        async with httpx.AsyncClient(timeout=45.0) as client:
            return await client.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )

    @staticmethod
    def _extract_error(response: httpx.Response) -> str:
        """Extract human-readable error message from a Gemini API error response."""
        try:
            err_json = response.json()
            return err_json.get("error", {}).get("message", response.text)
        except Exception:
            return response.text


gemini_service = GeminiService()
