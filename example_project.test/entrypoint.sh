#!/bin/sh
set -e
exec python -m example_project.mock_client --agent "${AGENT_URL:-http://host.docker.internal:9000}" "$@"
