"""Detection API routes."""

from fastapi import APIRouter

from finestcloud.api.models import DetectionResponse, DetectRequest
from finestcloud.services.detection_service import get_detection_service
from finestcloud.services.image_service import load_image_from_url

router = APIRouter()


@router.post("/detect", response_model=DetectionResponse)
def detect(request: DetectRequest) -> DetectionResponse:
    """Detect roofs in an image URL (the frontend sends a Static Maps URL)."""
    roofs = get_detection_service().detect_roofs(
        load_image_from_url(request.image),
        request.bounds.model_dump(),
        conf=request.conf,
        epsilon=request.epsilon,
    )
    return DetectionResponse(roofs=roofs)
