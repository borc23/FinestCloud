import logging
import os

from app.services.detection_service import DetectionService
from app.services.image_service import ImageService
from app.services.panel_service import PanelService

logger = logging.getLogger(__name__)

MODEL_FILENAME = "v3.pt"
_APP_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LOCAL_MODEL_PATH = os.path.join(_APP_ROOT, "models", MODEL_FILENAME)


class ServiceFactory:
    _detection_service = None
    _image_service = None

    @classmethod
    def get_detection_service(cls):
        if cls._detection_service is None:
            model_path_to_use = ""
            if os.path.exists(LOCAL_MODEL_PATH):
                logger.info(f"Using local model from: {LOCAL_MODEL_PATH}")
                model_path_to_use = LOCAL_MODEL_PATH
            else:
                # Fallback to Hugging Face Hub ID if local file not found
                # This part might be removed if you exclusively want to use the bundled model
                logger.warning(
                    f"Local model not found at {LOCAL_MODEL_PATH}. Attempting to use Hugging Face Hub ID Borc23/finestcloud-models/v3.pt."
                )
                model_path_to_use = "Borc23/finestcloud-models/v3.pt"  # Or "Borc23/finestcloud-models" if YOLO handles it

            logger.info(
                f"Initializing DetectionService with model path: {model_path_to_use}"
            )
            cls._detection_service = DetectionService(model_path_to_use)
        return cls._detection_service

    @classmethod
    def get_image_service(cls):
        if cls._image_service is None:
            cls._image_service = ImageService()
        return cls._image_service

    @classmethod
    def get_panel_service(cls, map_bounds=None, resolution=None):
        return PanelService(map_bounds, resolution)
