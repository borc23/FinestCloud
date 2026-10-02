"""
Configuration management service for handling application configuration.

This module provides centralized access to application configuration
with proper validation and error handling.
"""

from typing import Any

from flask import current_app

from finestcloud.utils.exceptions import APIRequestError


class ConfigService:
    """Service for handling application configuration."""

    @staticmethod
    def get_google_maps_api_key() -> str:
        """
        Get Google Maps API key with validation.

        Returns:
            Google Maps API key

        Raises:
            APIRequestError: If API key is not configured
        """
        api_key = current_app.config.get("GOOGLE_MAPS_API_KEY")
        if not api_key:
            raise APIRequestError(
                "Server configuration error: Missing Google Maps API Key"
            )
        return api_key

    @staticmethod
    def get_config_value(key: str, default=None) -> Any:
        """
        Get configuration value with optional default.

        Args:
            key: Configuration key name
            default: Default value if key not found

        Returns:
            Configuration value or default
        """
        return current_app.config.get(key, default)

    @staticmethod
    def is_debug_mode() -> bool:
        """Check if application is running in debug mode."""
        return current_app.config.get("DEBUG", False)

    @staticmethod
    def get_environment() -> str:
        """Get current application environment."""
        return current_app.config.get("ENV", "production")
