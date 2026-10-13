"""Authentication between the Next.js server and this API."""

import secrets

from fastapi import Header, HTTPException

from finestcloud.core.config import get_settings


def require_backend_token(x_backend_token: str | None = Header(None)) -> None:
    """
    Reject requests that don't carry the shared backend token.

    The API is publicly reachable (Render), but every /api route spends quota on
    paid Google APIs, so only the Next.js server, which checks the user's session
    and daily quota first, may call it.
    """
    expected = get_settings().backend_api_token.get_secret_value()
    # Constant-time comparison so the token can't be guessed byte by byte
    if x_backend_token is None or not secrets.compare_digest(
        x_backend_token.encode(), expected.encode()
    ):
        raise HTTPException(status_code=401, detail="Unauthorized")
