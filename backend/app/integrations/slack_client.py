"""
EngageAI — Slack Notification Client Adapter
Real + Mock adapter behind clean interface.
TODO(production): Replace mock implementation with `slack_sdk` WebClient (`slack_sdk.WebClient(token=settings.SLACK_BOT_TOKEN)`).
"""

from __future__ import annotations

from typing import Any
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("SlackClientAdapter")


class SlackClientAdapter:
    """Slack bot notification client."""

    def __init__(self) -> None:
        self.enabled = settings.SLACK_ENABLED
        self.default_channel = settings.SLACK_DEFAULT_CHANNEL

    async def send_message(self, channel: str, text: str, blocks: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        """
        Post message to Slack channel.
        """
        target_channel = channel or self.default_channel

        if self.enabled:
            # TODO(production): Plug in real Slack SDK client call:
            # client = WebClient(token=settings.SLACK_BOT_TOKEN)
            # response = client.chat_postMessage(channel=target_channel, text=text, blocks=blocks)
            pass

        logger.info("slack_mock_message_sent", channel=target_channel, text_preview=text[:60])
        return {"success": True, "channel": target_channel, "is_mock": True}


slack_client = SlackClientAdapter()
