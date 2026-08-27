"""
EngageAI Backend — Global Exception Handlers
Consistent error envelope: {"error": {"code", "message", "details"}}
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.core.logging import get_logger

logger = get_logger(__name__)


def error_response(
    status_code: int,
    code: str,
    message: str,
    details: Any = None,
) -> JSONResponse:
    """Create a standardized error response."""
    body: dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
        }
    }
    if details is not None:
        body["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=body)


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle FastAPI HTTPExceptions with consistent error envelope."""
    logger.warning(
        "http_error",
        status_code=exc.status_code,
        detail=exc.detail,
        path=str(request.url),
    )
    return error_response(
        status_code=exc.status_code,
        code=f"HTTP_{exc.status_code}",
        message=str(exc.detail),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle Pydantic validation errors with detailed field-level messages."""
    errors = []
    for error in exc.errors():
        loc = " → ".join(str(l) for l in error.get("loc", []))
        errors.append({
            "field": loc,
            "message": error.get("msg", ""),
            "type": error.get("type", ""),
        })

    logger.warning(
        "validation_error",
        path=str(request.url),
        error_count=len(errors),
    )
    return error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        code="VALIDATION_ERROR",
        message="Request validation failed",
        details=errors,
    )


async def pydantic_validation_handler(
    request: Request, exc: ValidationError
) -> JSONResponse:
    """Handle raw Pydantic ValidationErrors."""
    errors = [
        {
            "field": " → ".join(str(l) for l in err.get("loc", [])),
            "message": err.get("msg", ""),
            "type": err.get("type", ""),
        }
        for err in exc.errors()
    ]
    return error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        code="VALIDATION_ERROR",
        message="Data validation failed",
        details=errors,
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler for unhandled exceptions."""
    logger.error(
        "unhandled_exception",
        exc_type=type(exc).__name__,
        exc_message=str(exc),
        path=str(request.url),
        exc_info=True,
    )
    return error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="INTERNAL_ERROR",
        message="An internal server error occurred",
        details=str(exc) if not request.app.state.is_production else None,
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the FastAPI app."""
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(ValidationError, pydantic_validation_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
