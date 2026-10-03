"""Application configuration using Pydantic settings."""

import os
from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # API Configuration
    debug: bool = Field(default=True, description="Debug mode")
    secret_key: str = Field(default_factory=lambda: os.urandom(32).hex())

    # Server Configuration
    allowed_hosts: list[str] = Field(default=["*"])
    cors_origins: list[str] = Field(default=["*"])

    # File Upload Configuration
    upload_folder: str = Field(default="/tmp/uploads")
    models_dir: str = Field(default="/tmp/models")
    max_content_length: int = Field(default=16 * 1024 * 1024)  # 16MB

    # External API Keys (required, set via environment or .env; never hardcode)
    google_maps_api_key: SecretStr = Field(
        ...,
        description="Google Maps server API key (Solar API, Maps Static API)",
    )
    nrel_api_key: SecretStr = Field(
        ...,
        description="NREL API key for PVWatts (Get free key at https://developer.nrel.gov/signup/)",
    )
    hugging_face_token: SecretStr | None = Field(
        default=None, description="Token for the private model repo on HF Hub"
    )

    class Config:
        env_file = ".env"
        env_prefix = ""
        case_sensitive = False
        protected_namespaces = ("settings_",)


@lru_cache
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()
