"""Pydantic models for request/response validation."""

from typing import Any

from pydantic import BaseModel, Field


# Base models
class BaseResponse(BaseModel):
    """Base response model."""

    success: bool = Field(default=True)


class ErrorResponse(BaseResponse):
    """Error response model."""

    success: bool = Field(default=False)
    error: str
    details: str | None = None


# Detection models
class BoundsModel(BaseModel):
    """Geographic bounds model."""

    north: float = Field(..., description="Northern latitude boundary")
    south: float = Field(..., description="Southern latitude boundary")
    east: float = Field(..., description="Eastern longitude boundary")
    west: float = Field(..., description="Western longitude boundary")


class DetectRequest(BaseModel):
    """Request model for roof detection."""

    image: str = Field(..., description="Image URL or base64 encoded image data")
    bounds: BoundsModel | None = Field(None, description="Geographic bounds")
    conf: float = Field(default=0.5, ge=0.0, le=1.0, description="Confidence threshold")
    epsilon: float = Field(
        default=0.0075, ge=0.0, description="Polygon simplification epsilon"
    )


class DetectImageRequest(DetectRequest):
    """Request model for image-based detection."""


class CoordinateModel(BaseModel):
    """Coordinate model."""

    lat: float | None = None
    lng: float | None = None


class RoofModel(BaseModel):
    """Roof polygon model."""

    coords: list[CoordinateModel]
    pitch: float | None = None
    azimuth: float | None = None


class DetectionResponse(BaseResponse):
    """Detection response model."""

    roofs: list[RoofModel]
    objects: list[RoofModel] = Field(default_factory=list)


# Panel generation models
class MapDimensionsModel(BaseModel):
    """Map dimensions model."""

    width: int = Field(..., gt=0, description="Map width in pixels")
    height: int = Field(..., gt=0, description="Map height in pixels")


class PanelSpecsModel(BaseModel):
    """Panel specifications model."""

    width: float = Field(..., description="Panel width in meters")
    height: float = Field(..., description="Panel height in meters")
    power: float = Field(..., description="Panel power in watts")
    efficiency: float = Field(..., description="Panel efficiency in percentage")


class GeneratePanelsRequest(BaseModel):
    """Request model for panel generation."""

    roofs: list[RoofModel] = Field(..., description="Roof polygons")
    objects: list[RoofModel] = Field(
        default_factory=list, description="Obstacle polygons"
    )
    mapBounds: BoundsModel = Field(..., description="Map bounds")
    module: str | None = Field(None, description="Panel module type")
    spacing: float = Field(default=0.5, ge=0.0, description="Panel spacing in cm")
    max_panels: int | None = Field(None, ge=0, description="Maximum panels per roof")
    padding: float | None = Field(default=20, ge=0.0, description="Edge padding in cm")
    panelOrientation: str | None = Field(
        default="best",
        description="Panel orientation: 'vertical', 'horizontal', or 'best'",
    )
    panel_specs: PanelSpecsModel | None = Field(
        None, description="Custom panel specifications"
    )


class PanelModel(BaseModel):
    """Solar panel model."""

    coords: list[CoordinateModel]
    roof_id: int | None = None
    panel_id: int | None = None


class RoofPanelsModel(BaseModel):
    """Model for panels on a single roof."""

    roof_id: int
    panels: list[PanelModel]
    panel_count: int
    module_type: str
    module_specs: dict[str, Any]
    coords: list[CoordinateModel]
    pitch: float
    azimuth: float


class PanelGenerationResponse(BaseResponse):
    """Panel generation response model."""

    roofs: list[RoofPanelsModel]
    max_panels: int
    module: str
    electrical_system: dict[str, Any] | None = None


# Panel count update models
class UpdatePanelCountRequest(BaseModel):
    """Request model for updating panel count."""

    panel_count: int = Field(..., ge=0, description="Target panel count")
    mapBounds: BoundsModel = Field(..., description="Map bounds")


class UpdateMaxPanelCountRequest(BaseModel):
    """Request model for updating max panel count."""

    max_panel_count: int = Field(..., ge=0, description="Maximum panel count")


class MaxPanelCountResponse(BaseResponse):
    """Max panel count response model."""

    max_panels: int


# Module models
class ModuleSpecsModel(BaseModel):
    """Custom module specifications."""

    name: str = Field(..., description="Module name")
    width: float = Field(..., gt=0, description="Module width in meters")
    height: float = Field(..., gt=0, description="Module height in meters")
    power: float = Field(..., gt=0, description="Module power in watts")
    efficiency: float | None = Field(None, ge=0, le=1, description="Module efficiency")


class CustomModuleRequest(BaseModel):
    """Request model for custom module creation."""

    specs: ModuleSpecsModel = Field(..., description="Module specifications")


class ModuleModel(BaseModel):
    """Panel module model."""

    name: str
    value: dict[str, Any]


class ModulesResponse(BaseResponse):
    """Modules response model."""

    modules: dict[str, dict[str, Any]]


class CustomModuleResponse(BaseResponse):
    """Custom module response model."""

    module: dict[str, Any]


# Solar API models
class SolarApiRequest(BaseModel):
    """Request model for Solar API proxy."""

    latitude: float = Field(..., ge=-90, le=90, description="Latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude")


# Session models
class ResetResponse(BaseResponse):
    """Session reset response model."""

    message: str = Field(default="Session reset successfully.")


# Error handling models
class ValidationErrorModel(BaseModel):
    """Validation error model."""

    field: str
    message: str
    value: Any


class ValidationErrorResponse(ErrorResponse):
    """Validation error response model."""

    validation_errors: list[ValidationErrorModel]
