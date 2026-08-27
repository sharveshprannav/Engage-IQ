"""
EngageAI — Linear Client Adapter
Real + Mock adapter behind clean interface.
TODO(production): Replace mock implementation with Linear GraphQL API client using `httpx`.
"""

from __future__ import annotations

from typing import Any
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("LinearClientAdapter")


class LinearClientAdapter:
    """Linear issue tracker integration adapter."""

    def __init__(self) -> None:
        self.enabled = settings.LINEAR_ENABLED
        self.team_id = settings.LINEAR_TEAM_ID

    async def create_issue(self, title: str, description: str) -> dict[str, Any]:
        """
        Create issue in Linear team workspace.
        """
        if self.enabled:
            # TODO(production): Execute GraphQL mutation against https://api.linear.app/graphql
            # mutation = "mutation IssueCreate($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier url } } }"
            pass

        mock_id = f"ENG-{abs(hash(title)) % 500 + 50}"
        mock_url = f"https://linear.app/engageai/issue/{mock_id}"

        logger.info("linear_mock_issue_created", key=mock_id, title=title[:40])
        return {
            "status": "created",
            "external_id": mock_id,
            "url": mock_url,
            "is_mock": True
        }


linear_client = LinearClientAdapter()
