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
│   ├── proxy/           # Reverse proxy logic
│   ├── events/          # Event schema
│   └── sink/            # Event sink logic
│   └── identity/        # Identity fetcher
├── docker-compose.yml   # Local Kafka + Zookeeper
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

## Start Kafka (Local Development)

Kafka runs **inside Docker**.
The SentinelFlow Agent runs **on the host**.

From the project root:

```bash
docker compose up -d
```

This starts:

- Zookeeper
- Kafka broker (exposed on `localhost:9092`)
- A one-time init container that creates Kafka topics

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

The agent runs on the **host machine**.

From the project root (where `go.mod` exists):

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

## Kafka Connection Details

The agent connects to Kafka using:

```
localhost:9092
```

Kafka is configured to advertise `localhost`, allowing host-based clients
to connect without Docker networking.

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

## Stop Kafka

Stop all services:

```bash
docker compose down
```

Stop and remove all Kafka data:

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
