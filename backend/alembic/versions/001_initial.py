"""
Initial schema — all tables, enums, indexes

Revision ID: 001_initial
Revises: None
Create Date: 2024-01-01
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ─── Create Enums ───────────────────────────────────────────
    user_role = postgresql.ENUM("admin", "manager", "agent", "viewer", name="user_role", create_type=True)
    source_channel = postgresql.ENUM("email", "widget", "api", "csv", "webhook", name="source_channel", create_type=True)
    feedback_category = postgresql.ENUM("bug", "feature_request", "complaint", "praise", "inquiry", name="feedback_category", create_type=True)
    feedback_priority = postgresql.ENUM("normal", "low", "high", "very_high", name="feedback_priority", create_type=True)
    feedback_status = postgresql.ENUM("new", "triaged", "in_progress", "resolved", "closed", name="feedback_status", create_type=True)
    customer_tier = postgresql.ENUM("free", "pro", "enterprise", name="customer_tier", create_type=True)
    action_type = postgresql.ENUM("create_ticket", "send_notification", "assign_team", "escalate", "auto_respond", "tag", name="action_type", create_type=True)
    wf_exec_status = postgresql.ENUM("pending", "running", "completed", "failed", "skipped", name="workflow_execution_status", create_type=True)
    external_system = postgresql.ENUM("jira", "linear", name="external_system", create_type=True)
    ticket_status = postgresql.ENUM("open", "in_progress", "resolved", "closed", name="ticket_status", create_type=True)
    metric_type = postgresql.ENUM(
        "sentiment_trend", "volume_by_category", "priority_distribution",
        "response_time", "sla_compliance", "cluster_summary",
        "customer_satisfaction", "agent_performance",
        name="metric_type", create_type=True,
    )
    notification_channel = postgresql.ENUM("email", "slack", "in_app", "webhook", name="notification_channel", create_type=True)
    notification_severity = postgresql.ENUM("info", "warning", "critical", "escalation", name="notification_severity", create_type=True)

    user_role.create(op.get_bind(), checkfirst=True)
    source_channel.create(op.get_bind(), checkfirst=True)
    feedback_category.create(op.get_bind(), checkfirst=True)
    feedback_priority.create(op.get_bind(), checkfirst=True)
    feedback_status.create(op.get_bind(), checkfirst=True)
    customer_tier.create(op.get_bind(), checkfirst=True)
    action_type.create(op.get_bind(), checkfirst=True)
    wf_exec_status.create(op.get_bind(), checkfirst=True)
    external_system.create(op.get_bind(), checkfirst=True)
    ticket_status.create(op.get_bind(), checkfirst=True)
    metric_type.create(op.get_bind(), checkfirst=True)
    notification_channel.create(op.get_bind(), checkfirst=True)
    notification_severity.create(op.get_bind(), checkfirst=True)

    # ─── Teams ──────────────────────────────────────────────────
    op.create_table(
        "teams",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column("notification_channels", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ─── Users ──────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("role", user_role, nullable=False, server_default="viewer"),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teams.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_role", "users", ["role"])

    # ─── Feedback ───────────────────────────────────────────────
    op.create_table(
        "feedback",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source_channel", source_channel, nullable=False),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("customer_id", sa.String(255), nullable=True),
        sa.Column("customer_email", sa.String(255), nullable=True),
        sa.Column("customer_name", sa.String(255), nullable=True),
        sa.Column("customer_tier", customer_tier, nullable=False, server_default="free"),
        sa.Column("sentiment", sa.Float(), nullable=True),
        sa.Column("sentiment_confidence", sa.Float(), nullable=True),
        sa.Column("category", feedback_category, nullable=True),
        sa.Column("category_confidence", sa.Float(), nullable=True),
        sa.Column("priority", feedback_priority, nullable=False, server_default="normal"),
        sa.Column("priority_reasoning", sa.Text(), nullable=True),
        sa.Column("topics", sa.Text(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("is_duplicate", sa.Boolean(), server_default="false"),
        sa.Column("duplicate_of_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("feedback.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", feedback_status, nullable=False, server_default="new"),
        sa.Column("embedding_id", sa.String(255), nullable=True),
        sa.Column("assigned_to", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_feedback_created_at", "feedback", ["created_at"])
    op.create_index("ix_feedback_status", "feedback", ["status"])
    op.create_index("ix_feedback_priority", "feedback", ["priority"])
    op.create_index("ix_feedback_category", "feedback", ["category"])
    op.create_index("ix_feedback_source_channel", "feedback", ["source_channel"])
    op.create_index("ix_feedback_customer_tier", "feedback", ["customer_tier"])
    op.create_index("ix_feedback_customer_id", "feedback", ["customer_id"])

    # ─── Feedback Clusters ──────────────────────────────────────
    op.create_table(
        "feedback_clusters",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cluster_label", sa.String(255), nullable=False),
        sa.Column("representative_summary", sa.Text(), nullable=True),
        sa.Column("feedback_count", sa.Integer(), server_default="0"),
        sa.Column("avg_sentiment", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ─── Feedback Cluster Members ───────────────────────────────
    op.create_table(
        "feedback_cluster_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cluster_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("feedback_clusters.id", ondelete="CASCADE"), nullable=False),
        sa.Column("feedback_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("feedback.id", ondelete="CASCADE"), nullable=False),
    )
    op.create_index("ix_fcm_cluster_id", "feedback_cluster_members", ["cluster_id"])
    op.create_index("ix_fcm_feedback_id", "feedback_cluster_members", ["feedback_id"])

    # ─── Workflows ──────────────────────────────────────────────
    op.create_table(
        "workflows",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("trigger_condition", postgresql.JSONB(), nullable=False),
        sa.Column("action_type", action_type, nullable=False),
        sa.Column("action_config", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ─── Workflow Executions ────────────────────────────────────
    op.create_table(
        "workflow_executions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workflow_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False),
        sa.Column("feedback_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("feedback.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", wf_exec_status, nullable=False, server_default="pending"),
        sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("result_payload", postgresql.JSONB(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
    )
    op.create_index("ix_wfe_workflow_id", "workflow_executions", ["workflow_id"])
    op.create_index("ix_wfe_feedback_id", "workflow_executions", ["feedback_id"])

    # ─── Tickets ────────────────────────────────────────────────
    op.create_table(
        "tickets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("feedback_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("feedback.id", ondelete="CASCADE"), nullable=False),
        sa.Column("external_system", external_system, nullable=False),
        sa.Column("external_ticket_id", sa.String(255), nullable=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("url", sa.String(1000), nullable=True),
        sa.Column("status", ticket_status, nullable=False, server_default="open"),
        sa.Column("created_by_agent", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_tickets_feedback_id", "tickets", ["feedback_id"])
    op.create_index("ix_tickets_external_ticket_id", "tickets", ["external_ticket_id"])

    # ─── Analytics Snapshots ────────────────────────────────────
    op.create_table(
        "analytics_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("metric_type", metric_type, nullable=False),
        sa.Column("time_bucket", sa.DateTime(timezone=True), nullable=False),
        sa.Column("value", postgresql.JSONB(), nullable=False),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_analytics_metric_type", "analytics_snapshots", ["metric_type"])
    op.create_index("ix_analytics_time_bucket", "analytics_snapshots", ["time_bucket"])

    # ─── Notifications ──────────────────────────────────────────
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("channel", notification_channel, nullable=False),
        sa.Column("recipient", sa.String(255), nullable=False),
        sa.Column("severity", notification_severity, nullable=False, server_default="info"),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("feedback_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("acknowledged", sa.Boolean(), server_default="false"),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_notifications_channel", "notifications", ["channel"])
    op.create_index("ix_notifications_feedback_id", "notifications", ["feedback_id"])

    # ─── Audit Logs ─────────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("actor", sa.String(255), nullable=False),
        sa.Column("action", sa.String(255), nullable=False),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("details", postgresql.JSONB(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"])
    op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("notifications")
    op.drop_table("analytics_snapshots")
    op.drop_table("tickets")
    op.drop_table("workflow_executions")
    op.drop_table("workflows")
    op.drop_table("feedback_cluster_members")
    op.drop_table("feedback_clusters")
    op.drop_table("feedback")
    op.drop_table("users")
    op.drop_table("teams")

    # Drop enums
    for enum_name in [
        "notification_severity", "notification_channel", "metric_type",
        "ticket_status", "external_system", "workflow_execution_status",
        "action_type", "customer_tier", "feedback_status", "feedback_priority",
        "feedback_category", "source_channel", "user_role",
    ]:
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
