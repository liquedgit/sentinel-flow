---
sidebar_position: 7
---

# Dashboard

The **Sentinel Flow Dashboard** is the web app and API surface for operators and contributors: it registers agents, surfaces **findings**, and hosts workflows that turn raw traffic into detection context.

## What you use it for

- **Agents** — Issue tokens, receive heartbeats, and ingest access events at `POST /api/agents/events`. The server forwards eligible events to Kafka for the detection pipeline (see [Agent](/docs/agent)).
- **Findings** — Review what the detection engine reported (IDOR and related issues) with enough context to triage and fix.
- **Learn mapping** — Queue RBAC + IDOR batch learning, upload logs, and **review or confirm** learned resource ownership rows (portal confirmation is for operators only; detection does not depend on it).

## Kafka producers (from the Dashboard)

The Dashboard runs a Kafka producer for orchestration and deep checks:

- **Scan requests** — Published to the configured scan-requests topic (`KAFKA_TOPIC_SCAN_REQUESTS`, default `scan-requests`). Payload shape **`ScanRequestPayload`**:

  | Field                         | Type     | Notes                                      |
  | ----------------------------- | -------- | ------------------------------------------ |
  | `request_id`                  | string   | Idempotency / correlation key              |
  | `learning_window_days`        | number?  | Optional learning window                   |
  | `violation_threshold_percent` | number?  | Optional threshold for violations          |
  | `minimum_sample_size`         | number?  | Optional minimum samples before decisions  |
  | `resource_dominance_percent`  | number?  | Optional IDOR dominant share (%) per resource |

- **AI / check requests** — A separate topic (default **`sf-check-requests`**) carries **`CheckRequestPayload`** for violation-specific checks (e.g. vertical/horizontal IDOR hints with `method`, `endpoint`, roles, and optional resource/user ids). Use this when you need the pipeline to run a targeted check rather than a full scan.

Brokers and topic names are configured with `KAFKA_BROKERS` and the `KAFKA_TOPIC_*` variables on the Dashboard.

For a conference talk or a new contributor: treat the Dashboard as the **control plane** (UI + HTTP API) and Kafka as the **bus** between ingestion, scanning, and the detection engine.
