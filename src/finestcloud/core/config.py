"""Application configuration using Pydantic settings."""

from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Read from environment variables or .env (names are case-insensitive)."""

    # Unknown .env keys are ignored so removed settings can't break startup
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    debug: bool = True
    allowed_hosts: list[str] = ["*"]
    models_dir: str = "/tmp/models"

    # Secrets: set via environment or .env, never hardcode
    google_maps_api_key: SecretStr  # Solar API and Maps Static API
    nrel_api_key: SecretStr  # PVWatts; free key at https://developer.nrel.gov/signup/
    hugging_face_token: SecretStr | None = None  # private model repo on HF Hub


@lru_cache
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()
