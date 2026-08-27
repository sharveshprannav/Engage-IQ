"""
EngageAI — Jira Client Adapter
Real + Mock adapter behind clean interface.
TODO(production): Replace mock implementation with `jira` Python library (`from jira import JIRA`).
"""

from __future__ import annotations

import uuid
from typing import Any
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("JiraClientAdapter")


class JiraClientAdapter:
    """Jira ticket integration adapter."""

    def __init__(self) -> None:
        self.enabled = settings.JIRA_ENABLED
        self.base_url = settings.JIRA_BASE_URL
        self.project_key = settings.JIRA_PROJECT_KEY

    async def create_issue(
        self,
        title: str,
        description: str,
        issue_type: str = "Bug",
        priority: str = "High"
    ) -> dict[str, Any]:
        """
        Create issue in Jira project.
        """
        if self.enabled:
            # TODO(production): Plug in real Jira API client call here:
            # jira = JIRA(server=self.base_url, basic_auth=(settings.JIRA_EMAIL, settings.JIRA_API_TOKEN))
            # new_issue = jira.create_issue(project=self.project_key, summary=title, description=description, issuetype={'name': issue_type})
            # return {"external_id": new_issue.key, "url": f"{self.base_url}/browse/{new_issue.key}"}
            pass

        # Mock Sandbox Fallback
        mock_id = f"{self.project_key}-{abs(hash(title)) % 900 + 100}"
        mock_url = f"{self.base_url}/browse/{mock_id}"

        logger.info("jira_mock_ticket_created", key=mock_id, title=title[:40])
        return {
            "status": "created",
            "external_id": mock_id,
            "url": mock_url,
            "is_mock": True
        }


jira_client = JiraClientAdapter()
