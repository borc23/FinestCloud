"""Application configuration using Pydantic settings."""

import os
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # API Configuration
    debug: bool = Field(default=True, description="Debug mode")
    secret_key: str = Field(default_factory=lambda: os.urandom(32).hex())

    # Server Configuration
    allowed_hosts: List[str] = Field(default=["*"])
    cors_origins: List[str] = Field(default=["*"])

    # Cache Configuration
    cache_type: str = Field(default="memory")
    cache_timeout: int = Field(default=3600)
    cache_size: int = Field(default=100)

    # File Upload Configuration
    upload_folder: str = Field(default="/tmp/uploads")
    models_dir: str = Field(default="/tmp/models")
    max_content_length: int = Field(default=16 * 1024 * 1024)  # 16MB

    # External API Keys
    google_maps_api_key: str = Field(
        default="AIzaSyDIQk97vo58fJ8xGE0ozHJKkv-nqoB1YU4",
        description="Google Maps API key",
    )
    nrel_api_key: str = Field(
        default="A6hfJTMkiTt8U5jrmXbbKGqnRj5meT6TQrD5ROgu",
        description="NREL API key for PVWatts (Get free key at https://developer.nrel.gov/signup/)",
    )

    # ML Model Configuration
    enable_gpu: bool = Field(default=True, description="Enable GPU acceleration")
    detection_cache_size: int = Field(
        default=100, description="Detection model cache size"
    )

    # Session Configuration
    session_timeout: int = Field(default=3600, description="Session timeout in seconds")

    class Config:
        env_file = ".env"
        env_prefix = ""
        case_sensitive = False
        protected_namespaces = ("settings_",)


@lru_cache()
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()
