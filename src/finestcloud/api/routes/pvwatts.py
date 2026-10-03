"""PVWatts calculation API routes."""

import logging

import httpx
from fastapi import APIRouter, HTTPException

from finestcloud.api.models import PVWattsRequest, PVWattsResponse
from finestcloud.core.config import get_settings
from finestcloud.services.pvwatts_service import get_monthly_production

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/calculate", response_model=PVWattsResponse)
async def calculate_solar_production(request: PVWattsRequest) -> PVWattsResponse:
    """Monthly and annual production for the panels, from NREL's PVWatts model."""
    system_capacity_kw = request.panel_count * request.panel_wattage / 1000
    try:
        result = await get_monthly_production(
            get_settings().nrel_api_key.get_secret_value(),
            request.latitude,
            request.longitude,
            system_capacity_kw,
            request.tilt,
            request.azimuth,
        )
    except (httpx.HTTPError, ValueError) as e:
        # Rate limits (e.g. DEMO_KEY) and bad inputs show up here in the logs
        logger.error(f"PVWatts request failed: {e}")
        raise HTTPException(502, "Solar production calculation failed") from None
    return PVWattsResponse(**result, system_capacity_kw=system_capacity_kw)
