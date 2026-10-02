"""Detection API routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException

from finestcloud.api.dependencies import get_cache_manager
from finestcloud.api.models import DetectImageRequest, DetectionResponse, DetectRequest
from finestcloud.services.cache_service import CacheKeys, CacheManager
from finestcloud.utils.detection import process_detection

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/detect", response_model=DetectionResponse)
async def detect(
    request: DetectRequest, cache_manager: CacheManager = Depends(get_cache_manager)
) -> DetectionResponse:
    """
    Detect roofs from image URL.

    Processes an image from URL to detect rooftops and objects.
    """
    try:
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

    except Exception as e:
        logger.exception("Detection failed")
        raise HTTPException(status_code=500, detail=f"Detection failed: {e!s}")


@router.post("/detect_image", response_model=DetectionResponse)
async def detect_image(
    request: DetectImageRequest,
    cache_manager: CacheManager = Depends(get_cache_manager),
) -> DetectionResponse:
    """
    Detect roofs from base64 encoded image.

    Processes a base64 encoded image to detect rooftops and objects.
    """
    try:
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

    except Exception as e:
        logger.exception("Image detection failed")
        raise HTTPException(status_code=500, detail=f"Image detection failed: {e!s}")
