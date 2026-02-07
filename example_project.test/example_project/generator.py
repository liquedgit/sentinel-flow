"""Test case generator for SentinelFlow agent requests."""

from collections.abc import Iterator
from typing import Any

# Default users for testing
DEFAULT_USERS = [
    {"user_id": "alice", "role": "admin", "token": "alice-token"},
    {"user_id": "bob", "role": "user", "token": "bob-token"},
    {"user_id": "carol", "role": "viewer", "token": "carol-token"},
]

# Default paths for testing
DEFAULT_PATHS = ["/", "/api/ping", "/me"]


def generate_requests(
    users: list[dict[str, Any]] | None = None,
    paths: list[str] | None = None,
    methods: list[str] | None = None,
) -> Iterator[dict[str, Any]]:
    """
    Yield request specs for agent testing.

    Each spec includes method, path, headers (with auth for /me resolution).
    """
    users = users or DEFAULT_USERS
    paths = paths or DEFAULT_PATHS
    methods = methods or ["GET"]

    for user in users:
        for path in paths:
            for method in methods:
                yield {
                    "method": method.upper(),
                    "path": path,
                    "headers": {
                        "Authorization": f"Bearer {user.get('token', '')}",
                        "X-User-Id": user.get("user_id", ""),
                        "X-Role": user.get("role", ""),
                    },
                }


def generate_requests_simple(
    users: list[dict[str, Any]] | None = None,
    paths: list[str] | None = None,
) -> Iterator[dict[str, Any]]:
    """Simplified generator: GET only, yields one spec per user+path."""
    users = users or DEFAULT_USERS
    paths = paths or DEFAULT_PATHS

    for user in users:
        for path in paths:
            yield {
                "method": "GET",
                "path": path,
                "headers": {
                    "Authorization": f"Bearer {user.get('token', '')}",
                    "X-User-Id": user.get("user_id", ""),
                    "X-Role": user.get("role", ""),
                },
            }
