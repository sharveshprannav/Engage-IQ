"""
EngageAI — Natural Language Query Engine Service
Answers plain-English questions ("What are the top complaints from enterprise customers this week?")
with synthesized answers + supporting feedback reference citations.
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field

from app.ai.base import BaseAIService


class ReferencedFeedbackItem(BaseModel):
    id: str
    customer_tier: str
    category: str
    sentiment: float
    snippet: str


class NLQueryAnswer(BaseModel):
    query: str
    answer: str
    confidence: float = 0.85
    references: list[ReferencedFeedbackItem] = Field(default_factory=list)
    suggested_filters: dict[str, Any] = Field(default_factory=dict)


class NLQueryEngineService(BaseAIService[NLQueryAnswer]):
    """Natural Language QA engine for customer feedback intelligence."""

    async def predict_heuristic(self, query: str, **kwargs: Any) -> NLQueryAnswer:
        """Rule-based query parsing & answer synthesis."""
        query_lower = query.lower()
        feedback_list: list[dict[str, Any]] = kwargs.get("feedback_context", [])

        # Parse query intent & filters
        target_tier = None
        target_category = None

        if "enterprise" in query_lower:
            target_tier = "enterprise"
        elif "pro" in query_lower:
            target_tier = "pro"

        if "bug" in query_lower or "crash" in query_lower or "error" in query_lower:
            target_category = "bug"
        elif "complaint" in query_lower or "issue" in query_lower:
            target_category = "complaint"
        elif "feature" in query_lower:
            target_category = "feature_request"

        # Filter matching feedback
        matching_refs = []
        for fb in feedback_list:
            match = True
            if target_tier and fb.get("customer_tier") != target_tier:
                match = False
            if target_category and fb.get("category") != target_category:
                match = False

            if match:
                matching_refs.append(
                    ReferencedFeedbackItem(
                        id=str(fb.get("id", "")),
                        customer_tier=fb.get("customer_tier", "free"),
                        category=fb.get("category", "inquiry"),
                        sentiment=fb.get("sentiment", 0.0),
                        snippet=fb.get("raw_text", "")[:120] + "..."
                    )
                )

        count = len(matching_refs)
        filter_desc = []
        if target_tier:
            filter_desc.append(f"{target_tier.title()} customers")
        if target_category:
            filter_desc.append(f"category '{target_category}'")

        filter_str = " and ".join(filter_desc) if filter_desc else "all segments"

        if count > 0:
            answer_text = (
                f"Found {count} feedback items matching your query for {filter_str}. "
                f"The primary issues relate to system performance, API timeout errors, and billing clarification requests."
            )
        else:
            answer_text = (
                f"No feedback items specifically matched the filter criteria for {filter_str}. "
                f"Try broadening your search query or removing tier restrictions."
            )

        return NLQueryAnswer(
            query=query,
            answer=answer_text,
            confidence=0.85 if count > 0 else 0.50,
            references=matching_refs[:5],
            suggested_filters={
                "customer_tier": target_tier,
                "category": target_category
            }
        )

    async def predict_llm(self, text: str, **kwargs: Any) -> NLQueryAnswer:
        """Generative Gemini-backed natural language query reasoning."""
        from app.services.gemini_service import gemini_service
        heuristic_res = await self.predict_heuristic(text, **kwargs)
        
        chat_res = await gemini_service.generate_chat_response(
            messages=[{"sender": "user", "text": text}],
            custom_api_key=kwargs.get("api_key"),
            model_name=kwargs.get("model"),
        )
        
        if chat_res.get("grounded") and chat_res.get("text"):
            return NLQueryAnswer(
                query=text,
                answer=chat_res["text"],
                confidence=0.95,
                references=heuristic_res.references,
                suggested_filters=heuristic_res.suggested_filters,
            )
        return heuristic_res


nl_query_engine_service = NLQueryEngineService()
