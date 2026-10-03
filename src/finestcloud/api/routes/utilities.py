"""Utility API routes."""

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException

from finestcloud.core.config import get_settings

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
            "key": settings.google_maps_api_key.get_secret_value(),
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
