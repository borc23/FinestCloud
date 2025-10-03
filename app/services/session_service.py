"""
Session management service for handling user sessions and state validation.

This module provides centralized session management functionality including
session initialization, validation, and cleanup operations.
"""

from typing import Optional

from app.utils.exceptions import SessionDataError


class SessionService:
    """Service for managing session state and validation."""

    def __init__(self, session_id: str):
        """Initialize SessionService with a session ID."""
        self.session_id = session_id
        # In-memory storage for session flags (in production, use Redis or database)
        # This is a simple implementation; consider using cache_manager instead
        if not hasattr(SessionService, "_session_storage"):
            SessionService._session_storage = {}

    def ensure_initialized(self) -> str:
        """Ensure session is initialized and return session ID."""
        return self.session_id

    def get_session_id(self) -> Optional[str]:
        """Get current session ID if it exists."""
        return self.session_id

    def validate_panels_exist(self) -> None:
        """Validate that panels exist in the current session."""
        if not self.session_id:
            raise SessionDataError("No active session. Please generate panels first")

        if not self._get_session_flag("has_panels"):
            raise SessionDataError("No panels generated. Please generate panels first")

    def reset(self) -> None:
        """Reset session state."""
        self._set_session_flag("has_panels", False)

    def mark_panels_generated(self) -> None:
        """Mark that panels have been generated for this session."""
        self._set_session_flag("has_panels", True)

    def _get_session_flag(self, key: str) -> bool:
        """Get a boolean flag from session storage."""
        return SessionService._session_storage.get(f"{self.session_id}:{key}", False)

    def _set_session_flag(self, key: str, value: bool) -> None:
        """Set a boolean flag in session storage."""
        SessionService._session_storage[f"{self.session_id}:{key}"] = value
