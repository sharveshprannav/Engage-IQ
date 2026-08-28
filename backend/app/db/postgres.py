"""
EngageAI Backend — PostgreSQL Async Engine & Session
SQLAlchemy 2.0 async engine with connection pool configuration.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

# Determine engine kwargs based on database dialect
is_sqlite = "sqlite" in settings.DATABASE_URL

engine_kwargs = {
    "echo": settings.DEBUG and settings.APP_ENV == "development",
}

if not is_sqlite:
    engine_kwargs.update({
        "pool_size": settings.DATABASE_POOL_SIZE,
        "max_overflow": settings.DATABASE_MAX_OVERFLOW,
        "pool_pre_ping": True,
        "pool_recycle": 3600,
    })

# Create the async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    **engine_kwargs
)

# Session factory
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that provides an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database connection (called during app startup)."""
    from sqlalchemy import text
    from app.db.base import Base
    from app.models import User, Team, Feedback, Workflow, Notification, AuditLog, MLInferenceLog  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Ensure user_id column exists in ml_inference_logs for user isolation and remove obsolete check constraints
        try:
            if is_sqlite:
                schema_res = await conn.execute(text("SELECT sql FROM sqlite_master WHERE type='table' AND name='ml_inference_logs';"))
                schema_row = schema_res.fetchone()
                if schema_row and schema_row[0] and "NUMERICAL" in schema_row[0]:
                    # Table has outdated constraint that blocks CSV and EXCEL; rebuild table cleanly
                    await conn.execute(text("ALTER TABLE ml_inference_logs RENAME TO ml_inference_logs_old;"))
                    await conn.run_sync(Base.metadata.create_all)
                    await conn.execute(text("""
                        INSERT INTO ml_inference_logs (
                            id, user_id, request_id, input_type, input_hash, model_used,
                            latency_total_ms, latency_validation_ms, latency_preprocessing_ms,
                            latency_model_ms, latency_postprocessing_ms, overall_confidence,
                            status, ambiguity_detected, category_name, primary_label,
                            input_summary, output_summary, details_json, user_corrected,
                            corrected_label, correction_note, created_at
                        )
                        SELECT 
                            id, user_id, request_id, input_type, input_hash, model_used,
                            latency_total_ms, latency_validation_ms, latency_preprocessing_ms,
                            latency_model_ms, latency_postprocessing_ms, overall_confidence,
                            status, ambiguity_detected, category_name, primary_label,
                            input_summary, output_summary, details_json, user_corrected,
                            corrected_label, correction_note, created_at
                        FROM ml_inference_logs_old;
                    """))
                    await conn.execute(text("DROP TABLE ml_inference_logs_old;"))

                res = await conn.execute(text("PRAGMA table_info(ml_inference_logs);"))
                columns = [row[1] for row in res.fetchall()]
                if columns and "user_id" not in columns:
                    await conn.execute(text("ALTER TABLE ml_inference_logs ADD COLUMN user_id VARCHAR(36) REFERENCES users(id);"))
                    await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_ml_inference_logs_user_id ON ml_inference_logs(user_id);"))
            else:
                await conn.execute(text(
                    "ALTER TABLE ml_inference_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;"
                ))
                await conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS ix_ml_inference_logs_user_id ON ml_inference_logs(user_id);"
                ))

            # Backfill existing unassigned logs to primary admin user if available
            admin_res = await conn.execute(text("SELECT id FROM users WHERE email = 'admin@engageai.io' LIMIT 1;"))
            admin_row = admin_res.fetchone()
            if admin_row:
                admin_id = str(admin_row[0])
                await conn.execute(text(f"UPDATE ml_inference_logs SET user_id = '{admin_id}' WHERE user_id IS NULL;"))
        except Exception:
            pass


async def close_db() -> None:
    """Close database connections (called during app shutdown)."""
    await engine.dispose()
