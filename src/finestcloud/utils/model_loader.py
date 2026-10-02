import logging
import os
import shutil

import torch
from huggingface_hub import hf_hub_download, login

logger = logging.getLogger(__name__)

MODEL_FILENAME = "v3.pt"
_PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..")
)
LOCAL_MODEL_PATH = os.path.join(_PROJECT_ROOT, "models", MODEL_FILENAME)

_initialized_model_path: str | None = None


def is_valid_pytorch_model(file_path):
    """Check if a file is a valid PyTorch model"""
    try:
        if not os.path.exists(file_path):
            logger.warning(f"Model file not found: {file_path}")
            return False

        if os.path.getsize(file_path) < 100:
            logger.warning(f"Model file too small (likely LFS pointer): {file_path}")
            return False

        torch.load(file_path, map_location="cpu", weights_only=False)
        logger.info(f"Successfully verified PyTorch model at: {file_path}")
        return True
    except Exception as e:  # noqa: BLE001 - any load failure means invalid
        logger.warning(f"Invalid PyTorch model file ({file_path}): {e}")
        return False


def _determine_model_path_logic():
    """
    Internal logic to find and validate the model path.
    This contains the original logic of get_model_path.
    """
    if os.path.exists(LOCAL_MODEL_PATH) and is_valid_pytorch_model(LOCAL_MODEL_PATH):
        logger.info(f"Using bundled model from: {LOCAL_MODEL_PATH}")
        return LOCAL_MODEL_PATH

    models_dir = os.getenv("MODELS_DIR", "/tmp/models")
    os.makedirs(models_dir, exist_ok=True)
    models_dir_path = os.path.join(models_dir, MODEL_FILENAME)

    if os.path.exists(models_dir_path) and is_valid_pytorch_model(models_dir_path):
        logger.info(f"Using model from MODELS_DIR: {models_dir_path}")
        return models_dir_path

    logger.info("Local model not found or invalid, attempting download...")
    downloaded_path = download_model_if_needed()
    if (
        downloaded_path
        and os.path.exists(downloaded_path)
        and is_valid_pytorch_model(downloaded_path)
    ):
        logger.info(f"Using downloaded model from: {downloaded_path}")
        return downloaded_path

    error_msg = (
        "No valid model found locally or via download. Model operations will fail."
    )
    logger.error(error_msg)
    raise FileNotFoundError(error_msg)


def download_model_if_needed():
    """Downloads model from HuggingFace Hub if needed"""
    models_dir = os.getenv("MODELS_DIR", "/tmp/models")
    os.makedirs(models_dir, exist_ok=True)
    destination_path = os.path.join(models_dir, MODEL_FILENAME)

    try:
        if "HUGGING_FACE_TOKEN" in os.environ:
            login(token=os.environ["HUGGING_FACE_TOKEN"])
            logger.info("Authenticated with Hugging Face Hub")
        else:
            logger.warning(
                "No HUGGING_FACE_TOKEN found - model download may fail if repo is private"
            )

        repo_id = "Borc23/finestcloud-models"

        logger.info(f"Downloading {MODEL_FILENAME} from {repo_id} to cache...")

        custom_cache_dir = "/tmp/huggingface_cache"
        os.makedirs(custom_cache_dir, exist_ok=True)

        cache_path = os.path.join(
            custom_cache_dir, f"models--{repo_id.replace('/', '--')}"
        )
        if (
            os.path.exists(cache_path)
            and os.environ.get("FORCE_MODEL_DOWNLOAD", "false").lower() == "true"
        ):
            logger.info(
                f"Forcing model re-download, removing existing cache: {cache_path}"
            )
            shutil.rmtree(cache_path, ignore_errors=True)

        downloaded_hf_path = hf_hub_download(
            repo_id=repo_id,
            filename=MODEL_FILENAME,
            cache_dir=custom_cache_dir,
            token=os.environ.get("HUGGING_FACE_TOKEN"),
            force_download=os.environ.get("FORCE_MODEL_DOWNLOAD", "false").lower()
            == "true",
        )

        logger.info(f"Model downloaded via HuggingFace to: {downloaded_hf_path}")

        if downloaded_hf_path != destination_path:
            shutil.copy2(downloaded_hf_path, destination_path)
            logger.info(f"Model copied from HuggingFace cache to {destination_path}")

        return destination_path

    except Exception as e:  # noqa: BLE001 - download failure returns None
        logger.error(f"Failed to download model: {e}")
        return None


def initialize_models():
    """
    Initializes models by ensuring a valid model path is determined and cached.
    This function is idempotent: expensive checks run only on the first call.
    """
    global _initialized_model_path
    if _initialized_model_path is None:
        logger.info("Model path not cached. Attempting to determine model path...")
        try:
            path = _determine_model_path_logic()
            _initialized_model_path = path
            logger.info(
                f"Model path successfully determined and cached: {_initialized_model_path}"
            )
        except Exception as e:
            logger.error(f"Failed to determine model path during initialization: {e!s}")
            raise

    if _initialized_model_path is None:
        raise RuntimeError("Model path could not be initialized.")

    return _initialized_model_path
