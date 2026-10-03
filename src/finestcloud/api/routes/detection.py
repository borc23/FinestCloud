"""Detection API routes."""

import numpy as np
from fastapi import APIRouter

from finestcloud.api.models import DetectImageRequest, DetectionResponse, DetectRequest
from finestcloud.services.detection_service import get_detection_service
from finestcloud.services.image_service import (
    load_image_from_base64,
    load_image_from_url,
)

router = APIRouter()


def _detect(image: np.ndarray, request: DetectRequest) -> DetectionResponse:
    roofs = get_detection_service().detect_roofs(
        image, request.bounds.model_dump(), conf=request.conf, epsilon=request.epsilon
    )
    return DetectionResponse(roofs=roofs)


@router.post("/detect", response_model=DetectionResponse)
def detect(request: DetectRequest) -> DetectionResponse:
    """Detect roofs in an image URL (the frontend sends a Static Maps URL)."""
    return _detect(load_image_from_url(request.image), request)


@router.post("/detect_image", response_model=DetectionResponse)
def detect_image(request: DetectImageRequest) -> DetectionResponse:
    """Detect roofs in a base64-encoded image."""
    return _detect(load_image_from_base64(request.image), request)
