"""Mock client script to send requests to the SentinelFlow agent."""

import argparse
import itertools
import random
import sys
import time

import requests

# Add parent dir for imports when running as script
try:
    from .generator import generate_requests_simple
except ImportError:
    from generator import generate_requests_simple


def send_request(
    agent_url: str,
    method: str,
    path: str,
    headers: dict[str, str] | None = None,
    timeout: float = 10.0,
) -> requests.Response:
    """Send a single request to the agent."""
    url = agent_url.rstrip("/") + path
    headers = headers or {}
    return requests.request(method, url, headers=headers, timeout=timeout)


def run_from_generator(agent_url: str) -> int:
    """Run requests from the generator indefinitely. Ctrl+C to stop."""
    specs = list(generate_requests_simple())
    try:
        for spec in itertools.cycle(specs):
            resp = send_request(
                agent_url,
                spec["method"],
                spec["path"],
                spec.get("headers"),
            )
            status = "OK" if 200 <= resp.status_code < 300 else "FAIL"
            print(f"[{status}] {spec['method']} {spec['path']} -> {resp.status_code}")
            time.sleep(random.uniform(0.01, 0.1))
    except KeyboardInterrupt:
        return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Send mock requests to SentinelFlow agent")
    parser.add_argument(
        "--agent",
        default="http://localhost:9000",
        help="Agent base URL (default: http://localhost:9000)",
    )
    parser.add_argument(
        "--user",
        default="alice",
        help="User ID for X-User-Id header (default: alice)",
    )
    parser.add_argument(
        "--role",
        default="admin",
        help="Role for X-Role header (default: admin)",
    )
    parser.add_argument(
        "--path",
        default="/api/ping",
        help="Path to request (default: /api/ping)",
    )
    parser.add_argument(
        "--method",
        default="GET",
        help="HTTP method (default: GET)",
    )
    parser.add_argument(
        "--from-generator",
        action="store_true",
        help="Use generator to produce requests instead of single --path",
    )

    args = parser.parse_args()

    if args.from_generator:
        return run_from_generator(args.agent)

    # Single request mode
    headers = {
        "X-User-Id": args.user,
        "X-Role": args.role,
        "Authorization": f"Bearer {args.user}-token",
    }
    resp = send_request(args.agent, args.method, args.path, headers)
    status = "OK" if 200 <= resp.status_code < 300 else "FAIL"
    print(f"[{status}] {args.method} {args.path} -> {resp.status_code}")
    return 0 if resp.status_code < 400 else 1


if __name__ == "__main__":
    sys.exit(main())
