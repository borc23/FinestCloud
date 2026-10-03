"""FastAPI app for rooftop solar panel detection and layout."""

import logging
from contextlib import asynccontextmanager
from importlib.metadata import version

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from finestcloud.api.routes import detection, panels, pvwatts, utilities
from finestcloud.core.config import get_settings
from finestcloud.services.detection_service import get_detection_service

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

VERSION = version("finestcloud")


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_detection_service()  # Load YOLO now so the first request isn't slow
    logger.info("Model loaded, API ready")
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Solar Panel Detection API",
        version=VERSION,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        lifespan=lifespan,
    )

    # No CORS: only the Next.js server calls this API (server-side proxy)
    if not settings.debug:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)

    app.include_router(detection.router, prefix="/api", tags=["detection"])
    app.include_router(panels.router, prefix="/api", tags=["panels"])
    app.include_router(pvwatts.router, prefix="/api/pvwatts", tags=["pvwatts"])
    app.include_router(utilities.router, prefix="/api", tags=["utilities"])

    # Starlette re-raises after this, so uvicorn still logs the traceback;
    # the client only gets a generic message, never internals
    @app.exception_handler(Exception)
    async def unhandled_error(_: Request, __: Exception):
        return JSONResponse(
            status_code=500, content={"detail": "Internal server error"}
        )

    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "version": VERSION}

    @app.get("/")
    async def root():
        return {
            "message": "Solar Panel Detection API",
            "version": VERSION,
            "docs": "/api/docs",
            "health": "/health",
        }

    return app


app = create_app()


def main():
    """Run the development server."""
    uvicorn.run(
        "finestcloud.main:app",
        host="127.0.0.1",
        port=8000,
        reload=get_settings().debug,
        log_level="info",
    )


if __name__ == "__main__":
    main()
