import logging

from app.services.detection_service import DetectionService
from app.services.image_service import ImageService
from app.services.panel_service import PanelService
from app.utils.model_loader import initialize_models

logger = logging.getLogger(__name__)


class ServiceFactory:
    _detection_service = None
    _image_service = None

    @classmethod
    def get_detection_service(cls):
        if cls._detection_service is None:
            # Use the centralized model initialization logic
            try:
                model_path_to_use = initialize_models()
                logger.info(
                    f"Initializing DetectionService with model path: {model_path_to_use}"
                )
                cls._detection_service = DetectionService(model_path_to_use)
            except Exception as e:
                logger.error(f"Failed to initialize detection service: {e}")
                raise
        return cls._detection_service

    @classmethod
    def get_image_service(cls):
        if cls._image_service is None:
            cls._image_service = ImageService()
        return cls._image_service

    @classmethod
    def get_panel_service(cls, map_bounds=None, resolution=None):
        return PanelService(map_bounds, resolution)
