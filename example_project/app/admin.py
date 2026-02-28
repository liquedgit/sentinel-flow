"""Admin API with RBAC: GET open, POST admin-only."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from .auth import require_admin

router = APIRouter()


class CreateAdminRequest(BaseModel):
    name: str
    email: str


# In-memory mock storage for admins (seeded with one for demo)
ADMINS: list[dict] = [
    {"id": "1", "name": "alice", "email": "alice@example.com"},
]


@router.get("", response_model=list[dict])
def list_admins():
    """
    List all admins.
    """
    return ADMINS


@router.post("", status_code=201, response_model=dict)
def create_admin(
    body: CreateAdminRequest,
    identity: tuple[str, str] = Depends(require_admin),
):
    """
    Create a new admin.
    """
    name = body.name
    email = body.email
    new_id = str(len(ADMINS) + 1)
    admin = {"id": new_id, "name": name, "email": email}
    ADMINS.append(admin)
    return admin
