---
sidebar_position: 1
---

# Introduction

Sentinel Flow is an open-source, real-time **Broken Access Control (BAC)** detection system that monitors HTTP traffic to identify potential RBAC violations.

Instead of manually configuring access rules, Sentinel Flow observes actual traffic patterns and statistically determines which roles legitimately access each endpoint. When a request deviates significantly from learned patterns, it flags the access as a potential violation.

## What You'll Find Here

- **[Project Overview](/docs/project-overview)** — Architecture and core value propositions
- **[Purpose](/docs/purpose)** — Why Sentinel Flow exists and the problems it solves
- **[Agent](/docs/agent)** — The Go-based reverse proxy that intercepts and forwards traffic
- **[Detection Engine](/docs/detection-engine)** — Backend service that learns patterns and detects violations
- **[Tools](/docs/tools)** — Docker, Kafka, and PostgreSQL used in the stack

## Quick Facts

- **Zero-config rule generation** through traffic-based learning
- **Self-hosted and open-source** with simple Docker deployment
- **Low friction adoption** via lightweight agent architecture
