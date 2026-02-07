"""Identity resolution from auth headers for /me endpoint."""

from typing import Optional

# Simple token -> (user_id, role) mapping for local testing
TOKEN_MAP: dict[str, tuple[str, str]] = {
    "alice-token": ("alice", "admin"),
    "bob-token": ("bob", "user"),
    "carol-token": ("carol", "viewer"),
}


def resolve_identity(
    authorization: Optional[str] = None,
    x_user_id: Optional[str] = None,
    x_role: Optional[str] = None,
) -> tuple[str, str] | None:
    """
    Resolve user_id and role from request headers.

    Prefers X-User-Id + X-Role if present; otherwise falls back to
    Authorization: Bearer <token> lookup in TOKEN_MAP.
    """
    if x_user_id:
        return (x_user_id, x_role or "user")

    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        return TOKEN_MAP.get(token)

    return None
