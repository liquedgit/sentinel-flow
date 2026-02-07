"""FastAPI backend with /me identity endpoint for SentinelFlow agent."""

from fastapi import FastAPI, Header, HTTPException

from .identity import resolve_identity

app = FastAPI(title="Example Project", description="Backend for SentinelFlow agent testing")


@app.get("/")
def root():
    """Root endpoint."""
    return {"message": "Example project backend", "status": "ok"}


@app.get("/api/ping")
def ping():
    """Health check endpoint."""
    return {"pong": True}


@app.get("/me")
def me(
    authorization: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    x_role: str | None = Header(default=None, alias="X-Role"),
):
    """
    Identity endpoint for SentinelFlow agent.

    Returns user_id and role based on auth headers.
    Expects either X-User-Id (and optionally X-Role) or Authorization: Bearer <token>.
    """
    identity = resolve_identity(
        authorization=authorization,
        x_user_id=x_user_id,
        x_role=x_role,
    )
    if identity is None:
        raise HTTPException(status_code=401, detail="missing or invalid identity")
    user_id, role = identity
    return {"user_id": user_id, "role": role}
