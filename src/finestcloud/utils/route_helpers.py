"""
Route helper utilities for common route operations.

This module provides utility functions and decorators to reduce code duplication
and improve consistency across route handlers.
"""

import logging
from functools import wraps
from typing import Any

from flask import Response, jsonify
from marshmallow import Schema

from finestcloud.services.cache_service import CacheManager
from finestcloud.services.session_service import SessionService
from finestcloud.utils.request_context import add_request_context, track_request
from finestcloud.utils.validation import RequestValidator

logger = logging.getLogger(__name__)


def create_json_response(data: dict[str, Any], status_code: int = 200) -> Response:
    """
    Create a standardized JSON response with request context.

    Args:
        data: Response data
        status_code: HTTP status code

    Returns:
        JSON response with added context
    """
    response_data = add_request_context(data)
    return jsonify(response_data), status_code


def validate_and_process(
    schema_class: type[Schema] | None = None, require_panels: bool = False
):
    """
    Decorator for common route processing including validation and session checks.

    Args:
        schema_class: Optional schema class for request validation
        require_panels: Whether to validate that panels exist in session

    Returns:
        Decorator function
    """

    def decorator(f):
        @wraps(f)
        @track_request
        def decorated_function(*args, **kwargs):
            # Validate request data if schema provided
            validated_data = None
            if schema_class:
                validated_data = RequestValidator.validate_json_request(schema_class)

            # Check session requirements
            session_id = SessionService.ensure_initialized()

            if require_panels:
                SessionService.validate_panels_exist()

            # Call the original function with validated data
            if validated_data:
                return f(validated_data, session_id, *args, **kwargs)
            else:
                return f(session_id, *args, **kwargs)

        return decorated_function

    return decorator


class RouteHelper:
    """Helper class for common route operations."""

    @staticmethod
    def get_cache_manager() -> CacheManager:
        """Get cache manager for current session."""
        from flask import current_app

        session_id = SessionService.ensure_initialized()
        return CacheManager(current_app.cache, session_id)

    @staticmethod
    def success_response(data: dict[str, Any], message: str | None = None) -> Response:
        """Create a success response."""
        response_data = {"success": True, **data}
        if message:
            response_data["message"] = message
        return create_json_response(response_data)

    @staticmethod
    def error_response(
        error: str, details: dict[str, Any] | None = None, status_code: int = 400
    ) -> Response:
        """Create an error response."""
        response_data = {"success": False, "error": error}
        if details:
            response_data["details"] = details
        return create_json_response(response_data, status_code)

    @staticmethod
    def log_operation(
        operation: str, session_id: str, details: dict[str, Any] | None = None
    ):
        """Log a route operation."""
        log_msg = f"{operation} for session {session_id}"
        if details:
            log_msg += f" - {details}"
        logger.info(log_msg)
