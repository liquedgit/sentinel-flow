---
sidebar_position: 1
---

# Introduction

**Sentinel Flow** is an open-source, real-time **Broken Access Control (BAC)** platform aligned with OWASP thinking: it learns from real HTTP traffic instead of relying on stale RBAC spreadsheets, then surfaces when access looks wrong. The system distinguishes two violation families: **vertical** issues—where a role hits an endpoint outside the statistically learned role-to-route mapping (labeled `vertical_idor` in code and APIs)—and **horizontal IDOR**, where access crosses **resource ownership** boundaries (same role, wrong user or object). Together, those cover privilege escalation-style misuse and cross-user object access, not only “wrong page for your role.”

## What You'll Find Here

- **[Project Overview](/docs/project-overview)** — Architecture and core value propositions
- **[Purpose](/docs/purpose)** — Why Sentinel Flow exists and the problems it solves
- **[Dashboard](/docs/dashboard)** — Control plane: agents, findings, learn-mapping, Kafka orchestration
- **[Agent](/docs/agent)** — The Go-based reverse proxy that intercepts and forwards traffic
- **[Detection Engine](/docs/detection-engine)** — Backend service that learns patterns and detects violations
- **[Tools](/docs/tools)** — Docker, Kafka, and PostgreSQL used in the stack

## Quick Facts

- **Zero-config rule generation** through traffic-based learning
- **Self-hosted and open-source** with simple Docker deployment
- **Low friction adoption** via lightweight agent architecture

## Getting started

1. **Clone** this repository.
2. **Start the stack** with `docker compose up -d` (see repository `docker-compose.yml` and [Tools](/docs/tools) for dependencies such as the external `web` network).
3. **Point traffic at the agent** — the bundled Compose file maps the Go agent to **host port 9000** (`9000:9000`).
4. **Open the Dashboard** — the Remix/Node dashboard listens on **3000** inside its container; expose that port in Compose or your reverse proxy when you need browser access. Use **[Project overview](/docs/project-overview)** for how components fit together and **[Tools](/docs/tools)** for Kafka topics and database defaults.
