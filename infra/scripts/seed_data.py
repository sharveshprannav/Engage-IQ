"""
EngageAI — Database Seed Script
Populates demo users, teams, 200+ realistic feedback items across categories & customer tiers,
initial workflows, and triggers AI classification pipeline.
"""

import asyncio
import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User, Team, UserRole
from app.models.feedback import (
    Feedback, FeedbackPriority, FeedbackCategory, FeedbackStatus, CustomerTier, SourceChannel
)
from app.models.workflow import Workflow, ActionType
from app.models.ticket import Ticket, ExternalSystem, TicketStatus
from app.ai.sentiment import sentiment_service
from app.ai.classification import classification_service
from app.ai.priority_engine import priority_engine_service

FEEDBACK_SAMPLES = [
    ("Production system crash when exporting PDF reports in enterprise workspace. System throws 500 internal error.", CustomerTier.ENTERPRISE, SourceChannel.EMAIL),
    ("The new dark mode UI is clean and slick! Really love the improved dashboard charts.", CustomerTier.PRO, SourceChannel.WIDGET),
    ("API latency spiked over 2500ms on the /v1/feedback endpoint during peak hours. Needs urgent investigation.", CustomerTier.ENTERPRISE, SourceChannel.API),
    ("Please add support for SAML / Okta SSO integration. Our security team requires it.", CustomerTier.ENTERPRISE, SourceChannel.CSV),
    ("Billing charged our account twice for monthly renewal! Need immediate refund.", CustomerTier.PRO, SourceChannel.EMAIL),
    ("Can I filter feedback Explorer table by date range and specific custom tags?", CustomerTier.FREE, SourceChannel.WIDGET),
    ("Fantastic customer support response time on our ticket! Kudos to the engineering team.", CustomerTier.PRO, SourceChannel.EMAIL),
    ("Webhook delivery fails silently when payload exceeds 1MB limit. No error logged.", CustomerTier.ENTERPRISE, SourceChannel.WEBHOOK),
    ("How do I invite team members to our workspace and assign manager role permissions?", CustomerTier.FREE, SourceChannel.INQUIRY if hasattr(SourceChannel, "INQUIRY") else SourceChannel.WIDGET),
    ("The mobile layout hides the action buttons on drawers when screen width is under 380px.", CustomerTier.FREE, SourceChannel.WIDGET),
]


from app.db.postgres import init_db


async def seed():
    print("--> Seeding EngageAI database with realistic demo data...")
    await init_db()
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # 1. Create Teams
        eng_team = Team(name="Engineering & Infrastructure", notification_channels={"slack": "#eng-alerts"})
        cs_team = Team(name="Customer Success", notification_channels={"email": "cs@engageai.io"})
        session.add_all([eng_team, cs_team])
        await session.commit()
        await session.refresh(eng_team)

        # 2. Create Users
        users = [
            User(email="admin@engageai.io", hashed_password=hash_password("admin123"), full_name="System Admin", role=UserRole.ADMIN, team_id=eng_team.id),
            User(email="manager@engageai.io", hashed_password=hash_password("manager123"), full_name="Sarah Product Lead", role=UserRole.MANAGER, team_id=cs_team.id),
            User(email="agent@engageai.io", hashed_password=hash_password("agent123"), full_name="Alex Support Agent", role=UserRole.AGENT, team_id=cs_team.id),
            User(email="viewer@engageai.io", hashed_password=hash_password("viewer123"), full_name="Demo Viewer", role=UserRole.VIEWER),
        ]
        session.add_all(users)
        await session.commit()

        # 3. Create Seed Workflows
        wf = Workflow(
            name="Critical Enterprise Bug Auto-Ticket",
            description="Auto create Jira ticket and notify Slack for Very High enterprise bugs",
            trigger_condition={"category": "bug", "customer_tier": "enterprise"},
            action_type=ActionType.CREATE_TICKET,
            action_config={"system": "jira", "priority": "high"},
            is_active=True
        )
        session.add(wf)
        await session.commit()

        # 4. Generate 200 Feedback Items
        print("Generating 200+ enriched feedback items...")
        created_count = 0
        now = datetime.now(timezone.utc)

        for i in range(200):
            template_text, tier, channel = random.choice(FEEDBACK_SAMPLES)
            # Add small variations to text
            raw_text = f"{template_text} [Ref #{i + 100}]"

            # Run heuristic AI analysis
            sent_res = await sentiment_service.predict_heuristic(raw_text)
            class_res = await classification_service.predict_heuristic(raw_text)
            prio_res = await priority_engine_service.predict_heuristic(
                raw_text, sentiment=sent_res.sentiment, category=class_res.category, customer_tier=tier
            )

            created_at = now - timedelta(days=random.randint(0, 14), hours=random.randint(0, 23))

            fb = Feedback(
                source_channel=channel,
                raw_text=raw_text,
                customer_id=f"cust_{tier.value}_{random.randint(10, 99)}",
                customer_email=f"user{i}@customer.com",
                customer_name=f"Customer {i+1}",
                customer_tier=tier,
                sentiment=sent_res.sentiment,
                sentiment_confidence=sent_res.sentiment_confidence,
                category=class_res.category,
                category_confidence=class_res.category_confidence,
                priority=prio_res.priority,
                priority_reasoning=prio_res.priority_reasoning,
                topics="Authentication, Performance, UI",
                summary=f"Summary for seed feedback item #{i + 1}",
                status=random.choice([FeedbackStatus.NEW, FeedbackStatus.TRIAGED, FeedbackStatus.IN_PROGRESS]),
                created_at=created_at,
                updated_at=created_at,
            )
            session.add(fb)
            created_count += 1

            if i % 50 == 0:
                await session.commit()

        await session.commit()
        print(f"[SUCCESS] Successfully seeded {created_count} feedback items & demo users!")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
