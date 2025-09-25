"""
Request context utilities for tracking and managing request lifecycle.

This module provides utilities for request tracking, logging, and context management
to improve debugging and monitoring capabilities.
"""

import logging
import time
import uuid
from functools import wraps
from typing import Any, Dict, Optional

from flask import g, request

logger = logging.getLogger(__name__)


class RequestContext:
    """Context manager for request tracking and lifecycle management."""

    def __init__(self, request_id: Optional[str] = None):
        self.request_id = request_id or str(uuid.uuid4())
        self.start_time = time.time()
        self.endpoint = None
        self.method = None

    def __enter__(self):
        g.request_id = self.request_id
        g.request_start_time = self.start_time

        if hasattr(request, "endpoint"):
            self.endpoint = request.endpoint
        if hasattr(request, "method"):
            self.method = request.method

        logger.debug(
            f"Request {self.request_id} started: {self.method} {self.endpoint}"
        )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time

        if exc_type:
            logger.error(
                f"Request {self.request_id} failed after {duration:.3f}s: {exc_type.__name__}: {exc_val}"
            )
        else:
            logger.debug(f"Request {self.request_id} completed in {duration:.3f}s")

        # Clean up context
        if hasattr(g, "request_id"):
            delattr(g, "request_id")
        if hasattr(g, "request_start_time"):
            delattr(g, "request_start_time")


def track_request(f):
    """
    Decorator to automatically track request lifecycle.

    Args:
        f: Function to decorate

    Returns:
        Decorated function with request tracking
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

        with RequestContext(request_id):
            return f(*args, **kwargs)

    return decorated_function


def get_request_id() -> Optional[str]:
    """Get the current request ID from context."""
    return getattr(g, "request_id", None)


def get_request_duration() -> Optional[float]:
    """Get the current request duration in seconds."""
    start_time = getattr(g, "request_start_time", None)
    if start_time:
        return time.time() - start_time
    return None


def add_request_context(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Add request context information to response data.

    Args:
        data: Response data dictionary

    Returns:
        Data with added request context
    """
    context = {}

    request_id = get_request_id()
    if request_id:
        context["request_id"] = request_id

    duration = get_request_duration()
    if duration:
        context["duration_ms"] = round(duration * 1000, 2)

    if context:
        data["_meta"] = context

    return data
