"""Detection API routes."""

from fastapi import APIRouter, Depends

from finestcloud.api.dependencies import get_cache_manager
from finestcloud.api.models import DetectImageRequest, DetectionResponse, DetectRequest
from finestcloud.services.cache_service import CacheKeys, CacheManager
from finestcloud.utils.detection import process_detection

router = APIRouter()


@router.post("/detect", response_model=DetectionResponse)
def detect(
    request: DetectRequest, cache_manager: CacheManager = Depends(get_cache_manager)
) -> DetectionResponse:
    """
    Detect roofs from image URL.

    Processes an image from URL to detect rooftops and objects.
    """
    (roofs, objects), _ = process_detection(
        image_data=request.image,
        is_url=True,
        bounds=request.bounds.dict() if request.bounds else None,
        conf=request.conf,
        epsilon=request.epsilon,
    )

    # Clear image shape cache for URL-based detection
    cache_manager.delete(CacheKeys.IMAGE_SHAPE)

    return DetectionResponse(roofs=roofs, objects=objects)


@router.post("/detect_image", response_model=DetectionResponse)
def detect_image(
    request: DetectImageRequest,
    cache_manager: CacheManager = Depends(get_cache_manager),
) -> DetectionResponse:
    """
    Detect roofs from base64 encoded image.

    Processes a base64 encoded image to detect rooftops and objects.
    """
    (roofs, objects), image_shape = process_detection(
        image_data=request.image,
        is_url=False,
        bounds=request.bounds.dict() if request.bounds else None,
        conf=request.conf,
        epsilon=request.epsilon,
    )

    # Cache image shape for image-based detection
    cache_manager.set(CacheKeys.IMAGE_SHAPE, image_shape)

    return DetectionResponse(roofs=roofs, objects=objects)
