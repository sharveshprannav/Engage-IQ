"""
EngageAI — Email SMTP Client Adapter
Real + Mock adapter behind clean interface.
TODO(production): Replace mock implementation with `aiosmtplib` async SMTP relay.
"""

from __future__ import annotations

from typing import Any
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("EmailClientAdapter")


class EmailClientAdapter:
    """Email alert notification client."""

    def __init__(self) -> None:
        self.enabled = settings.EMAIL_ENABLED

    async def send_email(self, recipient: str, subject: str, body: str) -> dict[str, Any]:
        """
        Send email message via SMTP.
        """
        if self.enabled:
            # TODO(production): Plug in real aiosmtplib call:
            # message = EmailMessage()
            # message["From"] = settings.EMAIL_FROM
            # message["To"] = recipient
            # message["Subject"] = subject
            # message.set_content(body)
            # await aiosmtplib.send(message, hostname=settings.SMTP_HOST, port=settings.SMTP_PORT, username=settings.SMTP_USER, password=settings.SMTP_PASSWORD, start_tls=True)
            pass

        logger.info("email_mock_sent", recipient=recipient, subject=subject)
        return {"success": True, "recipient": recipient, "is_mock": True}


email_client = EmailClientAdapter()
