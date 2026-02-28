"""Auth dependencies for RBAC enforcement."""

from fastapi import Depends, Header, HTTPException

from .identity import resolve_identity


def require_admin(
    authorization: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    x_role: str | None = Header(default=None, alias="X-Role"),
) -> tuple[str, str]:
    """
    Dependency that requires admin role.

    - No identity -> 401 Unauthorized
    - role != admin -> 403 Forbidden (prohibited)
    - admin -> yields (user_id, role)
    """
    identity = resolve_identity(
        authorization=authorization,
        x_user_id=x_user_id,
        x_role=x_role,
    )
    if identity is None:
        raise HTTPException(status_code=401, detail="missing or invalid identity")
    user_id, role = identity
    if role != "admin":
        raise HTTPException(status_code=403, detail="admin role required")
    return (user_id, role)
