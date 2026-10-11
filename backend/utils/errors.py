"""Typed application errors that map cleanly to HTTP responses."""
from __future__ import annotations


class AppError(Exception):
    status_code = 500
    code = "internal_error"

    def __init__(self, message: str, *, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class ValidationError(AppError):
    status_code = 400
    code = "validation_error"


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class InsufficientDataError(AppError):
    status_code = 422
    code = "insufficient_data"


class UpstreamError(AppError):
    """A data provider (Yahoo Finance, a news API) failed or timed out."""

    status_code = 502
    code = "upstream_unavailable"


class RateLimitError(UpstreamError):
    status_code = 429
    code = "rate_limited"


class ModelError(AppError):
    status_code = 500
    code = "model_error"
