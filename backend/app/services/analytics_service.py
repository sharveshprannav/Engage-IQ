"""
EngageAI — Analytics Service
Computes real-time dashboard KPIs, sentiment trend points, priority distribution,
and category volume series based STRICTLY on real customer feedback stored in the database.
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.feedback import Feedback, FeedbackPriority, FeedbackCategory, FeedbackStatus
from app.schemas.analytics import (
    DashboardKPIs,
    SentimentTrendPoint,
    PriorityDistribution,
    CategoryVolumePoint,
    AnalyticsOverview,
)


class AnalyticsService:
    """Computes aggregated dashboard metrics from real database records alone."""

    async def get_dashboard_overview(self, db: AsyncSession) -> AnalyticsOverview:
        """Compute all primary metrics for the React analytics dashboard."""
        now = datetime.now(timezone.utc)
        today = now.date()
        today_start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)

        # 1. Total feedback count
        total_res = await db.execute(select(func.count(Feedback.id)))
        total_feedback = total_res.scalar_one_or_none() or 0

        # 2. Avg sentiment score
        sent_res = await db.execute(select(func.avg(Feedback.sentiment)))
        raw_avg_sentiment = sent_res.scalar_one_or_none()
        avg_sentiment = float(raw_avg_sentiment) if raw_avg_sentiment is not None else 0.0

        # 3. Open Very High priority count
        vh_res = await db.execute(
            select(func.count(Feedback.id)).where(
                Feedback.priority == FeedbackPriority.VERY_HIGH,
                Feedback.status.in_([FeedbackStatus.NEW, FeedbackStatus.TRIAGED, FeedbackStatus.IN_PROGRESS])
            )
        )
        open_vh_count = vh_res.scalar_one_or_none() or 0

        # 4. Actual SLA Breaches (VERY HIGH open > 1 hour)
        one_hour_ago = now - timedelta(hours=1)
        sla_res = await db.execute(
            select(func.count(Feedback.id)).where(
                Feedback.priority == FeedbackPriority.VERY_HIGH,
                Feedback.status.in_([FeedbackStatus.NEW, FeedbackStatus.TRIAGED]),
                Feedback.created_at < one_hour_ago
            )
        )
        sla_breach_count = sla_res.scalar_one_or_none() or 0

        # 5. Feedback today
        today_res = await db.execute(
            select(func.count(Feedback.id)).where(Feedback.created_at >= today_start)
        )
        feedback_today = today_res.scalar_one_or_none() or 0

        # 6. Trend change percent (this week vs last week)
        week_ago = now - timedelta(days=7)
        two_weeks_ago = now - timedelta(days=14)
        this_week_res = await db.execute(
            select(func.count(Feedback.id)).where(Feedback.created_at >= week_ago)
        )
        this_week_count = this_week_res.scalar_one_or_none() or 0

        prev_week_res = await db.execute(
            select(func.count(Feedback.id)).where(
                Feedback.created_at >= two_weeks_ago,
                Feedback.created_at < week_ago
            )
        )
        prev_week_count = prev_week_res.scalar_one_or_none() or 0

        if prev_week_count > 0:
            trend_change_percent = round(((this_week_count - prev_week_count) / prev_week_count) * 100, 1)
        elif this_week_count > 0:
            trend_change_percent = 100.0
        else:
            trend_change_percent = 0.0

        # 7. Priority distribution breakdown
        prio_counts = {p: 0 for p in FeedbackPriority}
        prio_res = await db.execute(
            select(Feedback.priority, func.count(Feedback.id)).group_by(Feedback.priority)
        )
        for row in prio_res.all():
            if row[0]:
                prio_counts[row[0]] = row[1]

        prio_dist = PriorityDistribution(
            very_high=prio_counts.get(FeedbackPriority.VERY_HIGH, 0),
            high=prio_counts.get(FeedbackPriority.HIGH, 0),
            low=prio_counts.get(FeedbackPriority.LOW, 0),
            normal=prio_counts.get(FeedbackPriority.NORMAL, 0)
        )

        # 8. Real 7-day trend series and category breakdown from database
        trend_points: list[SentimentTrendPoint] = []
        category_points: list[CategoryVolumePoint] = []

        for i in range(6, -1, -1):
            day_d = today - timedelta(days=i)
            day_str = day_d.strftime("%Y-%m-%d")
            day_start = datetime(day_d.year, day_d.month, day_d.day, tzinfo=timezone.utc)
            day_end = day_start + timedelta(days=1)

            # Daily count and average sentiment
            day_sent_res = await db.execute(
                select(func.count(Feedback.id), func.avg(Feedback.sentiment)).where(
                    Feedback.created_at >= day_start,
                    Feedback.created_at < day_end
                )
            )
            day_count, day_avg_sent = day_sent_res.first() or (0, None)
            day_count = day_count or 0
            day_avg = round(float(day_avg_sent), 2) if day_avg_sent is not None else 0.0

            trend_points.append(
                SentimentTrendPoint(
                    date=day_str,
                    avg_sentiment=day_avg,
                    count=day_count
                )
            )

            # Daily category counts
            cat_res = await db.execute(
                select(Feedback.category, func.count(Feedback.id)).where(
                    Feedback.created_at >= day_start,
                    Feedback.created_at < day_end
                ).group_by(Feedback.category)
            )
            cat_counts = {cat: 0 for cat in FeedbackCategory}
            for row in cat_res.all():
                if row[0]:
                    cat_counts[row[0]] = row[1]

            category_points.append(
                CategoryVolumePoint(
                    date=day_str,
                    bug=cat_counts.get(FeedbackCategory.BUG, 0),
                    feature_request=cat_counts.get(FeedbackCategory.FEATURE_REQUEST, 0),
                    complaint=cat_counts.get(FeedbackCategory.COMPLAINT, 0),
                    praise=cat_counts.get(FeedbackCategory.PRAISE, 0),
                    inquiry=cat_counts.get(FeedbackCategory.INQUIRY, 0)
                )
            )

        # 9. Extract top topics from real feedback
        top_topics: list[dict[str, Any]] = []
        if total_feedback > 0:
            # Query topics text from feedback
            topic_rows = await db.execute(
                select(Feedback.topics).where(Feedback.topics.isnot(None))
            )
            topic_counter: Counter[str] = Counter()
            for (topics_str,) in topic_rows.all():
                if topics_str:
                    for t in topics_str.split(","):
                        cleaned = t.strip().title()
                        if cleaned:
                            topic_counter[cleaned] += 1

            if topic_counter:
                top_topics = [
                    {"topic": topic, "count": count}
                    for topic, count in topic_counter.most_common(6)
                ]
            else:
                # Fallback to actual category distribution
                cat_totals = await db.execute(
                    select(Feedback.category, func.count(Feedback.id)).group_by(Feedback.category)
                )
                top_topics = [
                    {"topic": str(cat).replace("_", " ").title(), "count": count}
                    for cat, count in cat_totals.all() if cat
                ]

        kpis = DashboardKPIs(
            total_feedback=total_feedback,
            avg_sentiment=round(avg_sentiment, 2),
            open_very_high_count=open_vh_count,
            sla_breach_count=sla_breach_count,
            feedback_today=feedback_today,
            trend_change_percent=trend_change_percent
        )

        return AnalyticsOverview(
            kpis=kpis,
            sentiment_trend=trend_points,
            priority_distribution=prio_dist,
            category_volume=category_points,
            clusters=[],
            top_topics=top_topics
        )


analytics_service = AnalyticsService()
