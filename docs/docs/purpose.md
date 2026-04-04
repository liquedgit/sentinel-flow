---
sidebar_position: 3
sidebar_label: Problem
---

# Problem

Broken Access Control consistently ranks among the top application risks (OWASP Top 10). Sentinel Flow targets the gap between **documented** access rules and **observed** behavior—including **IDOR** and broader **privilege** failures, not only “RBAC documentation drift.”

## The Problem

Organizations struggle to:

- **Detect unauthorized access in real time** — Logs and audits often lag, lack context, or need heavy manual triage
- **Keep access models accurate** — Which roles may call which endpoints is hard to document, version, and keep aligned with production
- **Catch IDOR and horizontal abuse** — Same-role users accessing each other’s resources routinely bypass coarse RBAC checks
- **Spot privilege bugs early** — Miswired authorization, missing checks, or inconsistent enforcement surface only after exploitation or expensive reviews

Many tools are costly, invasive, or demand exhaustive upfront policy authoring that teams cannot maintain.

## Sentinel Flow's Approach

Sentinel Flow uses **behavior-based learning**:

- It observes legitimate traffic and infers which roles typically use which endpoints (**vertical** / role-to-route expectations, reflected as `vertical_idor` when violated)
- It supports detecting **horizontal** patterns where access should be scoped to a user or resource and crosses that boundary (**horizontal IDOR**)
- When a request is inconsistent with learned norms, it is flagged for review with less manual rule curation

That yields continuous BAC signal with lower operational overhead than hand-maintained rule sets alone.
