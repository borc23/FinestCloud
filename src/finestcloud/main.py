"""
FastAPI Solar Panel Detection and Configuration API.

A modern, high-performance API for detecting and positioning solar panels on rooftops.
"""

import logging
import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from finestcloud.api.routes import detection, panels, pvwatts, utilities
from finestcloud.core.config import get_settings
from finestcloud.utils.model_loader import initialize_models

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

_PACKAGE_DIR = os.path.dirname(os.path.abspath(__file__))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan event handler."""
    # Startup
    logger.info("Starting FastAPI Solar Panel API...")
    initialize_models()
    logger.info("Models initialized successfully")

    yield

    # Shutdown
    logger.info("Shutting down FastAPI Solar Panel API...")


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Returns:
        FastAPI application instance
    """
    settings = get_settings()

    app = FastAPI(
        title="Solar Panel Detection API",
        description="High-performance API for solar panel detection and configuration",
        version="2.0.0",
        docs_url="/api/docs",  # Always enable docs for development
        redoc_url="/api/redoc",
        lifespan=lifespan,
    )

    # Add CORS middleware - more permissive for development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins for development
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Add security middleware only in production
    if not settings.debug:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)

    # Include API routers
    app.include_router(detection.router, prefix="/api", tags=["detection"])
    app.include_router(panels.router, prefix="/api", tags=["panels"])
    app.include_router(pvwatts.router, prefix="/api/pvwatts", tags=["pvwatts"])
    app.include_router(utilities.router, prefix="/api", tags=["utilities"])

    # Add a simple health check endpoint
    @app.get("/health")
    async def health_check():
        """Health check endpoint."""
        return {"status": "healthy", "version": "2.0.0"}

    # Serve static files and templates (if they exist)
    if os.path.exists(os.path.join(_PACKAGE_DIR, "templates")) and os.path.exists(
        os.path.join(_PACKAGE_DIR, "static")
    ):

        @app.get("/")
        async def root():
            """API root endpoint."""
            return {
                "message": "Solar Panel Detection API",
                "version": "2.0.0",
                "docs": "/api/docs",
                "health": "/health",
            }

    else:

        @app.get("/")
        async def root():
            """API root endpoint."""
            return {
                "message": "Solar Panel Detection API",
                "version": "2.0.0",
                "docs": "/api/docs",
                "health": "/health",
            }

    return app


# Create the app instance
app = create_app()


def main():
    """Run the development server."""
    settings = get_settings()
    uvicorn.run(
        "finestcloud.main:app",
        host="127.0.0.1",
        port=8000,
        reload=settings.debug,
        log_level="info",
    )


if __name__ == "__main__":
    main()
