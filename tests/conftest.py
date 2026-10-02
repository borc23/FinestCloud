import os

# Settings requires these; tests never call the real APIs, so dummy values suffice
os.environ.setdefault("GOOGLE_MAPS_API_KEY", "test-google-key")
os.environ.setdefault("NREL_API_KEY", "test-nrel-key")
