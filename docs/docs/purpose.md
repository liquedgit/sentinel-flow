---
sidebar_position: 3
sidebar_label: Problem
---

# Problem

Broken Access Control consistently ranks as a top security vulnerability (OWASP Top 10). Sentinel Flow addresses the challenges organizations face in securing their applications.

## The Problem

Organizations struggle to:

- **Detect unauthorized access attempts in real-time** — Traditional logging and auditing often lag behind or require manual analysis
- **Maintain accurate documentation** — Knowing which roles should access which endpoints is difficult to document and keep up to date
- **Identify misconfigurations** — RBAC implementation bugs can go unnoticed until exploited

Current solutions are either too complex, too expensive, or require extensive manual configuration of access rules.

## Sentinel Flow's Approach

Sentinel Flow takes a **learning-based approach**:

- Instead of requiring manual rule configuration, it observes actual traffic patterns
- It statistically determines which roles legitimately access each endpoint
- When a request deviates significantly from learned patterns, it flags the access as a potential violation

This reduces operational overhead while providing real-time visibility into access control anomalies.
