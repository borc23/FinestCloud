"""
Session management service for handling user sessions and state validation.

This module provides centralized session management functionality including
session initialization, validation, and cleanup operations.
"""

import uuid
from typing import Optional

from flask import session

from app.utils.exceptions import SessionDataError


class SessionService:
    """Service for managing session state and validation."""

    @staticmethod
    def ensure_initialized() -> str:
        """Ensure session is initialized and return session ID."""
        if "session_id" not in session:
            session["session_id"] = str(uuid.uuid4())
        return session["session_id"]

    @staticmethod
    def get_session_id() -> Optional[str]:
        """Get current session ID if it exists."""
        return session.get("session_id")

    @staticmethod
    def validate_panels_exist() -> None:
        """Validate that panels exist in the current session."""
        session_id = SessionService.get_session_id()
        if not session_id:
            raise SessionDataError("No active session. Please generate panels first")

        if not session.get("has_panels", False):
            raise SessionDataError("No panels generated. Please generate panels first")

    @staticmethod
    def reset() -> None:
        """Reset session state."""
        session["session_id"] = str(uuid.uuid4())
        session["has_panels"] = False

    @staticmethod
    def mark_panels_generated() -> None:
        """Mark that panels have been generated for this session."""
        session["has_panels"] = True
