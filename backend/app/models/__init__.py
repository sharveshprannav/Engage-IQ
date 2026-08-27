"""
EngageAI — Models Package
Imports all models so Alembic can auto-detect them.
"""

from app.models.user import User, Team, UserRole
from app.models.feedback import (
    Feedback,
    FeedbackCluster,
    FeedbackClusterMember,
    SourceChannel,
    FeedbackCategory,
    FeedbackPriority,
    FeedbackStatus,
    CustomerTier,
)
from app.models.workflow import (
    Workflow,
    WorkflowExecution,
    ActionType,
    WorkflowExecutionStatus,
)
from app.models.analytics import (
    AnalyticsSnapshot,
    Notification,
    AuditLog,
    MetricType,
    NotificationChannel,
    NotificationSeverity,
)
from app.models.ml_inference_log import MLInferenceLog, MLInferenceStatus, MLInputType

__all__ = [
    "User",
    "Team",
    "UserRole",
    "Feedback",
    "FeedbackCluster",
    "FeedbackClusterMember",
    "SourceChannel",
    "FeedbackCategory",
    "FeedbackPriority",
    "FeedbackStatus",
    "CustomerTier",
    "Workflow",
    "WorkflowExecution",
    "ActionType",
    "WorkflowExecutionStatus",
    "AnalyticsSnapshot",
    "Notification",
    "AuditLog",
    "MetricType",
    "NotificationChannel",
    "NotificationSeverity",
    "MLInferenceLog",
    "MLInferenceStatus",
    "MLInputType",
]
