import logging
from pathlib import Path

from huggingface_hub import hf_hub_download

from finestcloud.core.config import get_settings

logger = logging.getLogger(__name__)

MODEL_FILENAME = "v3.pt"
REPO_ID = "Borc23/finestcloud-models"
# Optional local copy at <project root>/models (gitignored) for development
_BUNDLED_MODEL = Path(__file__).resolve().parents[3] / "models" / MODEL_FILENAME


def get_model_path() -> str:
    """Bundled model if present, else MODELS_DIR, downloading it there on first run."""
    settings = get_settings()
    for path in (_BUNDLED_MODEL, Path(settings.models_dir) / MODEL_FILENAME):
        if path.exists():
            return str(path)

    logger.info(f"Downloading {MODEL_FILENAME} from {REPO_ID}...")
    token = settings.hugging_face_token
    return hf_hub_download(
        repo_id=REPO_ID,
        filename=MODEL_FILENAME,
        local_dir=settings.models_dir,
        token=token.get_secret_value() if token else None,
    )
