"""Pydantic models for request/response validation."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# Base models
class BaseResponse(BaseModel):
    """Base response model."""

    success: bool = Field(default=True)


class ErrorResponse(BaseResponse):
    """Error response model."""

    success: bool = Field(default=False)
    error: str
    details: Optional[str] = None


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
    bounds: Optional[BoundsModel] = Field(None, description="Geographic bounds")
    conf: float = Field(default=0.5, ge=0.0, le=1.0, description="Confidence threshold")
    epsilon: float = Field(
        default=0.0075, ge=0.0, description="Polygon simplification epsilon"
    )


class DetectImageRequest(DetectRequest):
    """Request model for image-based detection."""

    pass


class CoordinateModel(BaseModel):
    """Coordinate model."""

    lat: Optional[float] = None
    lng: Optional[float] = None
    x: Optional[float] = None
    y: Optional[float] = None


class RoofModel(BaseModel):
    """Roof polygon model."""

    coords: List[CoordinateModel]


class DetectionResponse(BaseResponse):
    """Detection response model."""

    roofs: List[RoofModel]
    objects: List[RoofModel] = Field(default_factory=list)


# Panel generation models
class GeneratePanelsRequest(BaseModel):
    """Request model for panel generation."""

    roofs: List[RoofModel] = Field(..., description="Roof polygons")
    mapBounds: BoundsModel = Field(..., description="Map bounds")
    resolution: float = Field(..., gt=0, description="Image resolution")
    module: Optional[str] = Field(None, description="Panel module type")
    spacing: float = Field(default=0.5, ge=0.0, description="Panel spacing")
    max_panels: Optional[int] = Field(None, ge=0, description="Maximum panels per roof")


class PanelModel(BaseModel):
    """Solar panel model."""

    coords: List[CoordinateModel]
    roof_id: Optional[int] = None
    panel_id: Optional[int] = None


class PanelGenerationResponse(BaseResponse):
    """Panel generation response model."""

    results: List[List[PanelModel]]


# Panel count update models
class UpdatePanelCountRequest(BaseModel):
    """Request model for updating panel count."""

    panel_count: int = Field(..., ge=0, description="Target panel count")
    mapBounds: BoundsModel = Field(..., description="Map bounds")
    resolution: Optional[float] = Field(None, gt=0, description="Image resolution")


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
    efficiency: Optional[float] = Field(
        None, ge=0, le=1, description="Module efficiency"
    )


class CustomModuleRequest(BaseModel):
    """Request model for custom module creation."""

    specs: ModuleSpecsModel = Field(..., description="Module specifications")


class ModuleModel(BaseModel):
    """Panel module model."""

    name: str
    value: Dict[str, Any]


class ModulesResponse(BaseResponse):
    """Modules response model."""

    modules: Dict[str, Dict[str, Any]]


class CustomModuleResponse(BaseResponse):
    """Custom module response model."""

    module: Dict[str, Any]


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

    validation_errors: List[ValidationErrorModel]
