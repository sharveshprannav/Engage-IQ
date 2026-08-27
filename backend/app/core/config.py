"""
EngageAI Backend — Core Configuration
Pydantic v2 Settings with environment-driven configuration.
Fails fast with clear errors if required variables are missing in production.
"""

from __future__ import annotations

from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─── Application ────────────────────────────────────────────
    APP_ENV: str = "development"
    APP_NAME: str = "EngageAI"
    DEBUG: bool = True
    LOG_LEVEL: str = "info"
    SECRET_KEY: str = "change-me-to-a-random-64-char-string"

    # ─── Database ───────────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./engageai.db"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10

    # ─── Redis ──────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ─── ChromaDB ───────────────────────────────────────────────
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001

    # ─── JWT Authentication ─────────────────────────────────────
    JWT_SECRET_KEY: str = "change-me-jwt-secret-key-64-chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ─── Server ─────────────────────────────────────────────────
    BACKEND_PORT: int = 8000
    UVICORN_WORKERS: int = 2

    # ─── AI / LLM ──────────────────────────────────────────────
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.6-flash"
    AI_PROVIDER: str = "gemini"
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    AI_USE_LLM: bool = True
    AI_FALLBACK_ENABLED: bool = True

    # ─── Priority Engine Weights ────────────────────────────────
    PRIORITY_SENTIMENT_WEIGHT: float = 0.30
    PRIORITY_CATEGORY_WEIGHT: float = 0.25
    PRIORITY_TIER_WEIGHT: float = 0.25
    PRIORITY_KEYWORD_WEIGHT: float = 0.20
    PRIORITY_DUPLICATE_THRESHOLD: float = 0.92

    # Priority tier thresholds (composite score → tier mapping)
    PRIORITY_VERY_HIGH_THRESHOLD: float = 0.85
    PRIORITY_HIGH_THRESHOLD: float = 0.65
    PRIORITY_LOW_THRESHOLD: float = 0.40

    # ─── Agentic Engine ─────────────────────────────────────────
    AGENT_MONITOR_INTERVAL_SECONDS: int = 30
    AGENT_ANOMALY_WINDOW_HOURS: int = 24
    AGENT_ANOMALY_ZSCORE_THRESHOLD: float = 2.5
    AGENT_ESCALATION_TIMEOUT_MINUTES: int = 30
    CELERY_CONCURRENCY: int = 4

    # ─── Integrations ───────────────────────────────────────────
    JIRA_ENABLED: bool = False
    JIRA_BASE_URL: str = "https://your-org.atlassian.net"
    JIRA_EMAIL: Optional[str] = None
    JIRA_API_TOKEN: Optional[str] = None
    JIRA_PROJECT_KEY: str = "ENG"

    LINEAR_ENABLED: bool = False
    LINEAR_API_KEY: Optional[str] = None
    LINEAR_TEAM_ID: Optional[str] = None

    SLACK_ENABLED: bool = False
    SLACK_BOT_TOKEN: Optional[str] = None
    SLACK_DEFAULT_CHANNEL: str = "#engageai-alerts"
    SLACK_ESCALATION_CHANNEL: str = "#engageai-incidents"

    EMAIL_ENABLED: bool = False
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: str = "noreply@engageai.io"

    # ─── Rate Limiting ──────────────────────────────────────────
    RATE_LIMIT_DEFAULT: str = "100/minute"
    RATE_LIMIT_INGESTION: str = "50/minute"
    RATE_LIMIT_AUTH: str = "20/minute"

    # ─── CORS ───────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Fail fast if using default secret key in production."""
        # Validated at runtime via validate_production_config()
        return v

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        return v

    def validate_production_config(self) -> None:
        """
        Call during app startup to ensure production-critical settings are configured.
        Raises ValueError with clear messages if required vars are missing.
        """
        if not self.is_production:
            return

        errors: list[str] = []

        if self.SECRET_KEY == "change-me-to-a-random-64-char-string":
            errors.append("SECRET_KEY must be set to a unique random string in production")

        if self.JWT_SECRET_KEY == "change-me-jwt-secret-key-64-chars":
            errors.append("JWT_SECRET_KEY must be set to a unique random string in production")

        if "engageai_secret" in self.DATABASE_URL:
            errors.append("DATABASE_URL contains default password — change in production")

        if errors:
            error_msg = "\n".join(f"  ❌ {e}" for e in errors)
            raise ValueError(
                f"\n\n🚨 Production configuration errors:\n{error_msg}\n\n"
                "Fix these in your .env file before running in production mode.\n"
            )


# Singleton settings instance
settings = Settings()
