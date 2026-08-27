"""
EngageAI Backend — FastAPI Application Entry Point
Configures the app with lifespan, middleware, router registration, and WebSocket.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging, get_logger, set_correlation_id
from app.core.rate_limit import limiter
from app.db.postgres import init_db, close_db
from app.db.chroma import chroma_client

import uuid

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan context manager.
    Handles startup and shutdown events (replaces deprecated @app.on_event).
    """
    # ─── Startup ────────────────────────────────────────────────
    setup_logging()
    logger.info("starting_engageai", env=settings.APP_ENV)

    # Validate production config
    settings.validate_production_config()

    # Initialize database connections
    await init_db()
    logger.info("postgres_connected")

    # Initialize ChromaDB
    await chroma_client.initialize()
    logger.info("chromadb_initialized")

    # Store production flag in app state for exception handler
    app.state.is_production = settings.is_production

    logger.info("engageai_ready", port=settings.BACKEND_PORT)

    yield

    # ─── Shutdown ───────────────────────────────────────────────
    logger.info("shutting_down_engageai")
    await close_db()
    await chroma_client.close()
    logger.info("engageai_shutdown_complete")


# ─── Create FastAPI App ─────────────────────────────────────────
app = FastAPI(
    title="EngageAI API",
    description="AI-Powered Customer Feedback Intelligence Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ─── Middleware ──────────────────────────────────────────────────

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Correlation ID middleware
@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    """Inject correlation ID into every request for log tracing."""
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4())[:8])
    set_correlation_id(correlation_id)
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = correlation_id
    return response


# ─── Register Exception Handlers ────────────────────────────────
register_exception_handlers(app)

# ─── Register API Routers ───────────────────────────────────────
from app.api.v1.router import api_v1_router  # noqa: E402

app.include_router(api_v1_router, prefix="/api/v1")

# ─── WebSocket Routes ───────────────────────────────────────────
from app.api.v1.websocket import websocket_router  # noqa: E402

app.include_router(websocket_router)


# ─── Health Check ───────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for load balancers and monitoring."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "env": settings.APP_ENV,
    }


# ─── App Init ───────────────────────────────────────────────────
app_init = app  # For __init__.py reference
