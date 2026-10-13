import os

import pytest
from fastapi.testclient import TestClient

# Settings requires these; tests never call the real APIs, so dummy values suffice
os.environ.setdefault("GOOGLE_MAPS_API_KEY", "test-google-key")
os.environ.setdefault("NREL_API_KEY", "test-nrel-key")
os.environ.setdefault("BACKEND_API_TOKEN", "test-backend-token")

# Imported after the env above: the app reads Settings at creation
from finestcloud.main import create_app


@pytest.fixture
def client():
    """API client authenticated like the Next.js server."""
    # No context manager: skips lifespan, so the YOLO model isn't loaded
    return TestClient(
        create_app(), headers={"X-Backend-Token": os.environ["BACKEND_API_TOKEN"]}
    )
