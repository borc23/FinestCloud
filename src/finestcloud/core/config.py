"""Application configuration using Pydantic settings."""

from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Read from environment variables or .env (names are case-insensitive)."""

    # Unknown .env keys are ignored so removed settings can't break startup
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Off unless explicitly enabled, so a missing variable never weakens production
    debug: bool = False
    allowed_hosts: list[str] = ["*"]
    models_dir: str = "/tmp/models"

    # Secrets: set via environment or .env, never hardcode
    google_maps_api_key: SecretStr  # Solar API and Maps Static API
    nrel_api_key: SecretStr  # PVWatts; free key at https://developer.nlr.gov/signup/
    hugging_face_token: SecretStr | None = None  # private model repo on HF Hub
    # Shared with the Next.js server, the only client allowed to call /api/*
    backend_api_token: SecretStr


@lru_cache
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()
