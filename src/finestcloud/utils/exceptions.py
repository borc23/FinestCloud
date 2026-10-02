import logging

logger = logging.getLogger(__name__)


class SessionDataError(Exception):
    """Raised when required session data is missing or invalid"""


class APIRequestError(Exception):
    """Raised when an external API request fails"""


class CacheDataError(Exception):
    """Exception raised when required cache data is missing."""
