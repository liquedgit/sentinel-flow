# SentinelFlow Agent

SentinelFlow is a **behavior-based security telemetry system** focused on detecting
access-control vulnerabilities such as **Broken Access Control, IDOR, and RBAC bypasses**
by observing how APIs are actually used in real environments.

This repository contains a **Go-based reverse proxy agent** and a **Kafka-backed event pipeline**
used to collect, store, and later analyze access behavior.

---

## High-Level Architecture

```
Client
  │
  ▼
SentinelFlow Agent (Reverse Proxy)
  │
  ├─ forwards request to backend
  └─ emits access event → Kafka
                          │
                          ▼
                   Detection / ML / Alerting
```

Kafka is used as a **durable event log**, allowing SentinelFlow to:

- Observe behavior over time
- Replay historical traffic
- Decouple data collection from detection logic

---

## Why Kafka?

SentinelFlow is **behavior-driven**, not signature-based.

Kafka provides:

- Ordered event history per actor (user or anonymous client)
- Horizontal scalability via partitions
- Replayable security telemetry
- Strong decoupling between agent and analysis pipeline

---

## Repository Structure

```
.
├── cmd/
│   └── agent/           # Agent entrypoint (main.go)
├── internal/
│   ├── config/          # Configuration from env
│   ├── proxy/           # Reverse proxy logic
│   ├── events/          # Event schema
│   ├── sink/            # Event sink logic
│   └── identity/        # Identity fetcher
├── .env.example         # Example environment variables
├── Dockerfile
├── go.mod
└── README.md
```

---

## Prerequisites

You need the following installed:

- Docker
- Docker Compose
- Go (1.22+ recommended)

Verify Docker:

```bash
docker ps
```

Verify Go:

```bash
go version
```

---

## Start Services (Docker Compose)

From the **repository root**:

```bash
docker compose up -d
```

This starts:

- Zookeeper
- Kafka broker (single listener at `kafka:9092`)
- SentinelFlow Agent (port 9000)
- Detection engine, Postgres

The agent runs in Docker and connects to Kafka via `kafka:9092`. It forwards requests to the backend at `host.docker.internal:8081` (run `example_project` on the host).

---

## Kafka Topics

Topics are created automatically on startup.

Current topics:

- `sf-events-access` — raw access telemetry for detection purposes
- `sf-agent-health` — Agent Health

Verify topics:

```bash
docker exec -it kafka kafka-topics \
  --bootstrap-server localhost:9092 \
  --list
```

---

## Run the SentinelFlow Agent

**Recommended: via Docker Compose**

```bash
docker compose up -d
```

The agent is included in `docker-compose.yml` and listens on port 9000.

**Alternative: run on host**

From the agent directory:

```bash
go run ./cmd/agent
```

Or build it:

```bash
go build -o agent ./cmd/agent
./agent
```

The agent will:

- Act as a reverse proxy
- Forward requests to the backend
- Emit structured access events to Kafka

---

## Configuration

The agent reads configuration from environment variables. Copy `.env.example` to `.env`
and adjust as needed:

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_URL` | `http://localhost:8081` | Backend to proxy requests to |
| `LISTEN_ADDR` | `:9000` | Address to listen on |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka brokers (comma-separated) |
| `KAFKA_TOPIC` | `sf-events-access` | Kafka topic for access events |
| `ME_ENDPOINT` | `http://localhost:8081/me` | Identity endpoint for /me resolution |

Use `kafka:9092` when running the agent in Docker (set via docker-compose). Use
`localhost:9092` when running on the host; note that Kafka advertises `kafka:9092`,
so host-based agents work best when Kafka exposes a host-reachable address.

---

## Inspect Events (Optional)

To inspect raw events:

```bash
docker exec -it kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic sf-events-access \
  --from-beginning
```

---

## Stop Services

Stop all services (from repository root):

```bash
docker compose down
```

Stop and remove all data (including Kafka, Postgres):

```bash
docker compose down -v
```

---

## Notes

- Kafka data is persisted using Docker volumes
- Topics are created explicitly to avoid accidental misconfiguration
- The agent never auto-creates Kafka topics
- This setup is intended for local development and testing

---

## Security Philosophy

SentinelFlow focuses on **how systems behave**, not just how they break.

Instead of relying on static rules, SentinelFlow learns normal access patterns
and flags deviations that indicate privilege abuse or access control failures.
