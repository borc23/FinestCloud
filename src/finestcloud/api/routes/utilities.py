"""Utility API routes."""

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request

from finestcloud.api.dependencies import get_cache_manager, get_session_service
from finestcloud.api.models import ResetResponse
from finestcloud.core.config import get_settings
from finestcloud.services.cache_service import CacheManager
from finestcloud.services.session_service import SessionService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/solar_api_proxy")
async def solar_api_proxy(
    latitude: float, longitude: float, settings=Depends(get_settings)
):
    """
    Proxy requests to Google Solar API.

    Forwards requests to Google's Solar API to avoid CORS issues.
    """
    try:
        api_url = "https://solar.googleapis.com/v1/buildingInsights:findClosest"
        params = {
            "location.latitude": latitude,
            "location.longitude": longitude,
            "requiredQuality": "MEDIUM",
            "key": settings.google_maps_api_key,
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(api_url, params=params, timeout=10.0)
            response.raise_for_status()
            return response.json()

    except httpx.RequestError as e:
        logger.error(f"Google Solar API request failed: {e!s}")
        raise HTTPException(
            status_code=502, detail=f"Failed to fetch solar data: {e!s}"
        )
    except httpx.HTTPStatusError as e:
        logger.error(f"Google Solar API returned error: {e.response.status_code}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Solar API error: {e.response.text}",
        )
    except Exception:
        logger.exception("Unexpected error in solar API proxy")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/reset_session", response_model=ResetResponse)
async def reset_session(
    request: Request,
    cache_manager: CacheManager = Depends(get_cache_manager),
    session_service: SessionService = Depends(get_session_service),
) -> ResetResponse:
    """
    Reset the current session.

    Clears all session data and cache entries.
    """
    try:
        # Clear session data from cache
        cache_manager.clear_all()

        # Reset session service
        session_service.reset()

        logger.info("Session reset successfully")

        return ResetResponse(message="Session reset successfully.")

    except Exception as e:
        logger.exception("Session reset failed")
        raise HTTPException(status_code=500, detail=f"Session reset failed: {e!s}")
