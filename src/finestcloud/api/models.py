"""Pydantic models for request/response validation."""

from typing import Any, Literal

from pydantic import BaseModel, Field


class BaseResponse(BaseModel):
    success: bool = True


class BoundsModel(BaseModel):
    north: float = Field(..., description="Northern latitude boundary")
    south: float = Field(..., description="Southern latitude boundary")
    east: float = Field(..., description="Eastern longitude boundary")
    west: float = Field(..., description="Western longitude boundary")


class CoordinateModel(BaseModel):
    lat: float
    lng: float


class RoofModel(BaseModel):
    coords: list[CoordinateModel]
    pitch: float | None = None
    azimuth: float | None = None


# Detection
class DetectRequest(BaseModel):
    image: str = Field(..., description="URL of the image to detect roofs in")
    bounds: BoundsModel = Field(..., description="Geographic bounds of the image")
    conf: float = Field(default=0.5, ge=0.0, le=1.0, description="Confidence threshold")
    epsilon: float = Field(
        default=0.0075, ge=0.0, description="Polygon simplification epsilon"
    )


class DetectionResponse(BaseResponse):
    roofs: list[RoofModel]
    objects: list[RoofModel] = Field(default_factory=list)


# Panel generation
class PanelSpecsModel(BaseModel):
    width: float = Field(..., gt=0, description="Panel width in meters")
    height: float = Field(..., gt=0, description="Panel height in meters")
    power: float = Field(..., gt=0, description="Panel power in watts")
    efficiency: float = Field(..., description="Panel efficiency in percentage")


class GeneratePanelsRequest(BaseModel):
    roofs: list[RoofModel] = Field(..., description="Roof polygons")
    objects: list[RoofModel] = Field(
        default_factory=list, description="Obstacle polygons"
    )
    mapBounds: BoundsModel = Field(..., description="Map bounds")
    spacing: float = Field(default=0.5, ge=0.0, description="Panel spacing in cm")
    padding: float = Field(default=20, ge=0.0, description="Edge padding in cm")
    panelOrientation: Literal["best", "vertical", "horizontal"] = "best"
    panel_specs: PanelSpecsModel


class PanelModel(BaseModel):
    coords: list[CoordinateModel]
    roof_id: int
    panel_id: int


class RoofPanelsModel(BaseModel):
    roof_id: int
    panels: list[PanelModel]
    panel_count: int
    module_type: str
    module_specs: dict[str, Any]
    coords: list[CoordinateModel]
    pitch: float
    azimuth: float


class PanelGenerationResponse(BaseResponse):
    roofs: list[RoofPanelsModel]
    max_panels: int
    module: str


# PVWatts
class PVWattsRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    panel_count: int = Field(..., gt=0)
    panel_wattage: float = Field(..., gt=0, description="Panel wattage in watts")
    tilt: float = Field(default=20, ge=0, le=90, description="Array tilt in degrees")
    azimuth: float = Field(
        default=180, ge=0, le=360, description="Array azimuth in degrees (180=south)"
    )


class PVWattsResponse(BaseModel):
    monthly_production: list[float] = Field(..., description="Monthly AC energy (kWh)")
    annual_production: float = Field(..., description="Annual AC energy (kWh)")
    capacity_factor: float
    annual_solar_radiation: float = Field(..., description="kWh/m2/day")
    system_capacity_kw: float
    station_info: dict
