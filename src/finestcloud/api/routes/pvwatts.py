"""PVWatts calculation API routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from finestcloud.core.config import get_settings
from finestcloud.services.pvwatts_service import PVWattsService

logger = logging.getLogger(__name__)
router = APIRouter()


class PVWattsRequest(BaseModel):
    """Request model for PVWatts calculations."""

    latitude: float = Field(..., description="Site latitude in decimal degrees")
    longitude: float = Field(..., description="Site longitude in decimal degrees")
    panel_count: int = Field(..., gt=0, description="Number of solar panels")
    panel_wattage: float = Field(..., gt=0, description="Panel wattage in watts")
    tilt: float = Field(
        default=20, ge=0, le=90, description="Array tilt angle in degrees"
    )
    azimuth: float = Field(
        default=180, ge=0, le=360, description="Array azimuth in degrees (180=south)"
    )


class PVWattsResponse(BaseModel):
    """Response model for PVWatts calculations."""

    monthly_production: list[float] = Field(
        ..., description="Monthly energy production in kWh"
    )
    annual_production: float = Field(..., description="Annual energy production in kWh")
    capacity_factor: float = Field(..., description="System capacity factor")
    annual_solar_radiation: float = Field(
        ..., description="Annual solar radiation in kWh/m2/day"
    )
    system_capacity_kw: float = Field(..., description="System capacity in kW")
    station_info: dict = Field(..., description="Weather station information")


class SystemCapacityRequest(BaseModel):
    """Request model for system capacity calculations."""

    latitude: float = Field(..., description="Site latitude")
    longitude: float = Field(..., description="Site longitude")
    system_capacity: float = Field(..., gt=0, description="System capacity in kW")
    tilt: float = Field(default=20, ge=0, le=90, description="Array tilt")
    azimuth: float = Field(default=180, ge=0, le=360, description="Array azimuth")


def get_pvwatts_service() -> PVWattsService:
    """Dependency to get PVWatts service instance."""
    settings = get_settings()
    return PVWattsService(api_key=settings.nrel_api_key)


@router.post("/calculate", response_model=PVWattsResponse)
async def calculate_solar_production(
    request: PVWattsRequest,
    pvwatts_service: PVWattsService = Depends(get_pvwatts_service),
) -> PVWattsResponse:
    """
    Calculate solar production using PVWatts API based on panel count.

    This endpoint calculates accurate monthly and annual energy production
    using NREL's PVWatts model.
    """
    try:
        result = pvwatts_service.calculate_for_panels(
            latitude=request.latitude,
            longitude=request.longitude,
            panel_count=request.panel_count,
            panel_wattage=request.panel_wattage,
            tilt=request.tilt,
            azimuth=request.azimuth,
        )

        if not result:
            # Try to provide more specific error message
            error_detail = (
                "Failed to calculate solar production. "
                "Possible causes: "
                "(1) Using DEMO_KEY with rate limits exceeded - get free key at https://developer.nrel.gov/signup/, "
                "(2) Invalid coordinates, "
                "(3) API service unavailable. "
                "Check backend logs for details."
            )
            raise HTTPException(
                status_code=500,
                detail=error_detail,
            )

        # Calculate system capacity
        system_capacity_kw = (request.panel_count * request.panel_wattage) / 1000

        return PVWattsResponse(
            monthly_production=result["monthly_production"],
            annual_production=result["annual_production"],
            capacity_factor=result["capacity_factor"],
            annual_solar_radiation=result["annual_solar_radiation"],
            system_capacity_kw=system_capacity_kw,
            station_info=result["station_info"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("PVWatts calculation failed")
        raise HTTPException(
            status_code=500, detail=f"Solar production calculation failed: {e!s}"
        )


@router.post("/calculate_system", response_model=PVWattsResponse)
async def calculate_by_system_capacity(
    request: SystemCapacityRequest,
    pvwatts_service: PVWattsService = Depends(get_pvwatts_service),
) -> PVWattsResponse:
    """
    Calculate solar production by system capacity in kW.

    Useful when you know the total system size but not the panel count.
    """
    try:
        result = pvwatts_service.get_monthly_production(
            latitude=request.latitude,
            longitude=request.longitude,
            system_capacity=request.system_capacity,
            tilt=request.tilt,
            azimuth=request.azimuth,
        )

        if not result:
            raise HTTPException(
                status_code=500,
                detail="Failed to calculate solar production. Please check your inputs.",
            )

        return PVWattsResponse(
            monthly_production=result["monthly_production"],
            annual_production=result["annual_production"],
            capacity_factor=result["capacity_factor"],
            annual_solar_radiation=result["annual_solar_radiation"],
            system_capacity_kw=request.system_capacity,
            station_info=result["station_info"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("PVWatts system calculation failed")
        raise HTTPException(
            status_code=500, detail=f"Solar production calculation failed: {e!s}"
        )
