"""FastAPI dependency providers."""

import logging

from cachelib import SimpleCache
from fastapi import Request

from finestcloud.core.config import get_settings
from finestcloud.services.cache_service import CacheManager
from finestcloud.services.session_service import SessionService

logger = logging.getLogger(__name__)

# Global cache instance (replacing Flask-Caching)
_cache_instance: SimpleCache | None = None


def get_cache():
    """Get or create cache instance."""
    global _cache_instance
    if _cache_instance is None:
        settings = get_settings()
        _cache_instance = SimpleCache(default_timeout=settings.cache_timeout)
    return _cache_instance


def get_session_id_from_request(request: Request) -> str:
    """Extract or generate session ID from request."""
    # FastAPI doesn't have built-in sessions like Flask
    # We can use cookies, headers, or implement custom session management
    session_id = request.cookies.get("session_id")
    if not session_id:
        # Generate a new session ID if none exists
        import uuid

        session_id = str(uuid.uuid4())
        # Note: You'll need to set this cookie in the response
        # This is a simplified implementation
    return session_id


def get_session_service(request: Request) -> SessionService:
    """Get SessionService instance."""
    session_id = get_session_id_from_request(request)
    return SessionService(session_id=session_id)


def get_cache_manager(request: Request) -> CacheManager:
    """Get CacheManager instance for the current session."""
    cache = get_cache()
    session_id = get_session_id_from_request(request)
    return CacheManager(cache, session_id)
