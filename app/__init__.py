"""
Solar Panel Application.

A Flask application for detecting and positioning solar panels on rooftops.
"""

import logging
import os
import secrets
from datetime import timedelta
from typing import Any, Dict, Optional

from flask import Flask, session
from flask_caching import Cache

from .utils.model_loader import initialize_models

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

cache = Cache()

# Define a basic CSP allowing common sources used in the app
# This might need further refinement based on browser console errors
csp = {
    "default-src": [
        "'self'",
        "*.googleapis.com",  # Google Fonts, Google Maps
        "*.gstatic.com",  # Google Fonts, Google Maps
        "kit.fontawesome.com",  # Font Awesome
        "cdn.jsdelivr.net",  # Potentially for other libraries if added
    ],
    "script-src": [
        "'self'",
        "*.googleapis.com",  # Google Maps
        "kit.fontawesome.com",  # Font Awesome JS
        "cdn.jsdelivr.net",
        "html2canvas.hertzen.com",  # Allow html2canvas script
        "'unsafe-inline'",  # Needed if there are inline scripts (check templates)
        # Add hash/nonce for inline scripts for better security if possible
    ],
    "style-src": [
        "'self'",
        "*.googleapis.com",  # Google Fonts
        "kit.fontawesome.com",  # Font Awesome CSS (if loaded from kit)
        "cdnjs.cloudflare.com",  # Font Awesome CSS (if loaded from cdnjs)
        "cdn.jsdelivr.net",
        "'unsafe-inline'",  # Needed for inline styles (check templates/JS)
    ],
    # Add font-src directive
    "font-src": [
        "'self'",
        "*.gstatic.com",  # Google Fonts
        "kit.fontawesome.com",  # Font Awesome fonts
        "cdnjs.cloudflare.com",  # Font Awesome fonts (from cdnjs)
    ],
    "img-src": [
        "'self'",
        "blob:",  # Allow blob URLs for uploaded images
        "data:",  # Allow data URIs (e.g., for embedded images)
        "*.googleapis.com",  # Google Maps images/tiles
        "*.gstatic.com",  # Google Maps images/tiles
    ],
    "connect-src": [
        "'self'",
        "*.googleapis.com",  # Google Maps API, Google Solar API
        "kit.fontawesome.com",  # Font Awesome
    ],
}


def create_app(config: Optional[Dict[str, Any]] = None) -> Flask:
    """
    Create and configure the Flask application.

    Args:
        config: Optional configuration dictionary to override defaults

    Returns:
        Flask application instance
    """
    app = Flask(__name__)

    app_config = {
        "SECRET_KEY": os.getenv("SECRET_KEY", secrets.token_hex(16)),
        "PERMANENT_SESSION_LIFETIME": timedelta(hours=1),
        "SESSION_COOKIE_SECURE": True,
        "SESSION_COOKIE_HTTPONLY": True,
        "SESSION_COOKIE_SAMESITE": "Lax",
        "CACHE_TYPE": os.getenv("CACHE_TYPE", "SimpleCache"),
        "CACHE_DEFAULT_TIMEOUT": int(os.getenv("CACHE_TIMEOUT", "3600")),
        "DEBUG": os.getenv("FLASK_DEBUG", "0") == "1",
        "UPLOAD_FOLDER": os.getenv("UPLOAD_FOLDER", "/tmp/uploads"),
        "MODELS_DIR": os.getenv("MODELS_DIR", "/tmp/models"),
        "MAX_CONTENT_LENGTH": 16 * 1024 * 1024,  # 16MB max upload
        "GOOGLE_MAPS_API_KEY": os.getenv(
            "GOOGLE_MAPS_API_KEY", "AIzaSyDIQk97vo58fJ8xGE0ozHJKkv-nqoB1YU4"
        ),
    }

    # Override with any passed configuration
    if config:
        app_config.update(config)

    app.config.update(app_config)

    # Add a check to ensure the API key is set
    if not app.config.get("GOOGLE_MAPS_API_KEY"):
        raise EnvironmentError(
            "GOOGLE_MAPS_API_KEY environment variable is not set or loaded into app config"
        )

    # Ensure upload folder exists
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # Initialize extensions
    cache.init_app(app)
    app.cache = cache  # Make cache accessible via app.cache

    # Talisman(
    #     app,
    #     force_https=os.getenv('FLASK_ENV') == 'production',  # Enforce HTTPS only in production
    #     content_security_policy=csp,
    #     # Remove nonce generation to allow 'unsafe-inline' for event handlers
    #     # content_security_policy_nonce_in=['script-src']  # Helps with inline scripts if needed
    # )

    # Register blueprints
    from app.routes import main

    app.register_blueprint(main)

    # Register before request handlers
    @app.before_request
    def make_session_permanent() -> None:
        """Ensure session is permanent."""
        session.permanent = True
        initialize_models()

    return app
