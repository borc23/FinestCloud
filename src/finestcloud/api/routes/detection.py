"""Detection API routes."""

from fastapi import APIRouter

from finestcloud.api.models import DetectionResponse, DetectRequest
from finestcloud.services.detection_service import get_detection_service
from finestcloud.services.image_service import load_static_map

router = APIRouter()


@router.post("/detect", response_model=DetectionResponse)
def detect(request: DetectRequest) -> DetectionResponse:
    """Detect roofs in the satellite image of the captured map view."""
    roofs = get_detection_service().detect_roofs(
        load_static_map(**request.view.model_dump()),
        request.bounds.model_dump(),
        conf=request.conf,
        epsilon=request.epsilon,
    )
    return DetectionResponse(roofs=roofs)
