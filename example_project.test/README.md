# SentinelFlow Test Utilities

Test generator and mock client for exercising the SentinelFlow agent.

## Setup

```bash
pip install -r requirements.txt
```

## Mock Client

Send a single request to the agent:

```bash
python -m example_project.mock_client --agent http://localhost:9000 --user alice --path /api/ping
```

With custom role:

```bash
python -m example_project.mock_client --agent http://localhost:9000 --user bob --role user --path /
```

Run requests from the generator (runs indefinitely, cycling through user+path combinations with 0.1–0.5s delay between requests; Ctrl+C to stop):

```bash
python -m example_project.mock_client --from-generator
```

## Generator

Use programmatically:

```python
from example_project.generator import generate_requests_simple

for spec in generate_requests_simple():
    print(spec)  # {"method": "GET", "path": "/", "headers": {...}}
```

## Docker (no local Python required)

```bash
# Run mock client with generator (default: agent at host.docker.internal:9000)
docker compose -f example-project-test.yml run --rm example-project-test

# Single request
docker compose -f example-project-test.yml run --rm example-project-test --path /api/ping --user alice

# With full SentinelFlow stack (agent in Docker)
AGENT_URL=http://agent:9000 docker compose -f docker-compose.yml -f example-project-test.yml run --rm example-project-test
```

## Prerequisites

- Agent running on `:9000`
- Backend (example_project) running on `:8081`
