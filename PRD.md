# Sentinel Flow: BAC Checker Validation
## Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** February 1, 2026  
**Status:** Draft

---

## 1. Executive Summary

Sentinel Flow is an open-source, real-time Broken Access Control (BAC) detection system that monitors HTTP traffic to identify potential RBAC violations. The system uses traffic-based learning to automatically build endpoint-to-role mappings and alerts application owners when requests deviate from established access patterns.

The solution is designed for self-hosted deployment via Docker, requiring minimal configuration while providing powerful access control monitoring capabilities.

---

## 2. Problem Statement

Broken Access Control consistently ranks as a top security vulnerability (OWASP Top 10). Organizations struggle to:

- Detect unauthorized access attempts in real-time
- Maintain accurate documentation of which roles should access which endpoints
- Identify misconfigurations in RBAC implementations before they're exploited

Current solutions are either too complex, too expensive, or require extensive manual configuration of access rules.

---

## 3. Solution Overview

Sentinel Flow takes a learning-based approach: instead of requiring manual rule configuration, it observes actual traffic patterns and statistically determines which roles legitimately access each endpoint. When a request deviates significantly from learned patterns, it flags the access as a potential violation.

### Core Value Propositions

- **Zero-config rule generation** through traffic-based learning
- **Real-time violation detection** with configurable sensitivity
- **Self-hosted and open-source** with simple Docker deployment
- **Low friction adoption** via lightweight agent architecture

---

## 4. System Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│    Nginx    │────▶│ Application │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  Go Agent   │
                   │  (Sidecar)  │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │    Kafka    │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐     ┌─────────────┐
                   │   Backend   │────▶│ PostgreSQL  │
                   │   Service   │     └─────────────┘
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   Portal    │
                   │    (UI)     │
                   └─────────────┘
```

### Component Overview

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| Agent | Custom Go | Intercepts requests from Nginx, extracts metadata, forwards to Kafka |
| Message Queue | Kafka | Decouples agent from backend, handles burst traffic |
| Backend Service | TBD (Go/Node/Python) | Consumes Kafka, stores data, runs detection logic, serves API |
| Database | PostgreSQL | Stores request logs, learned mappings, alerts, configuration |
| Portal | TBD (React/Vue) | Displays violations, manages configuration, handles false positives |

---

## 5. Functional Requirements

### 5.1 Go Agent

**FR-1.1: Request Interception**  
The agent receives forwarded request metadata from Nginx without blocking or modifying the original request flow.

**FR-1.2: Role Identification**  
The agent identifies the requesting user's role through one of two methods:
- Extract `X-User-Id` header and fetch role from `/me` endpoint (with caching)
- Extract role directly from application-provided headers

**FR-1.3: Role Caching**  
The agent implements a local cache for user-to-role mappings to minimize latency impact. Cache TTL is configurable (default: 5 minutes).

**FR-1.4: Skip Unknown Users**  
If role identification fails (missing header, `/me` unavailable, user not found), the request is skipped entirely and not logged for analysis.

**FR-1.5: Kafka Publishing**  
The agent publishes request metadata to Kafka with the following schema:

```json
{
  "timestamp": "2026-02-01T10:30:00Z",
  "method": "GET",
  "endpoint": "/admin/dashboard",
  "user_id": "user_12345",
  "role": "admin",
  "source_ip": "192.168.1.100",
  "response_status": 200,
  "trace_id": "abc-123-xyz"
}
```

### 5.2 Backend Service

**FR-2.1: Kafka Consumption**  
The backend consumes request events from Kafka and persists them to PostgreSQL.

**FR-2.2: Learning Algorithm**  
The system generates endpoint-to-role mappings based on traffic patterns:

```
For each endpoint:
  If total_requests >= minimum_sample_size:
    For each role accessing the endpoint:
      If (role_requests / total_requests) >= threshold:
        Mark role as "allowed" for endpoint
      Else:
        Mark role as "violation candidate"
```

**FR-2.3: Configurable Parameters**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `learning_window_days` | 90 | Days of traffic data used for learning |
| `violation_threshold_percent` | 5 | Minimum percentage for a role to be considered legitimate |
| `minimum_sample_size` | 100 | Minimum requests before generating rules for an endpoint |

**FR-2.4: Real-time Violation Detection**  
For each incoming request (after learning data exists):
1. Look up learned mappings for the endpoint
2. Check if requesting role is in allowed list
3. If not allowed and endpoint has learned rules, create violation alert

**FR-2.5: Learning Mode Behavior**  
If an endpoint has not yet reached `minimum_sample_size`, no alerts are generated for that endpoint (learning mode).

### 5.3 Portal

**FR-3.1: Violation Dashboard**  
Display detected violations with:
- Timestamp
- Endpoint accessed
- User ID and role
- Expected roles (from learned mapping)
- Status (New / Reviewed / False Positive)

**FR-3.2: Violation Detail View**  
For each violation, show:
- Full request metadata
- Historical access pattern for the endpoint
- Role distribution chart
- Actions: Mark as False Positive, Dismiss

**FR-3.3: False Positive Handling**  
When a user marks a violation as false positive:
1. Update the endpoint mapping to include the flagged role as "allowed"
2. Dismiss all existing violations for that endpoint + role combination
3. Log the action with user attribution for audit

**FR-3.4: Endpoint Mapping Management**  
Display all learned endpoint mappings:
- Endpoint path
- Allowed roles (learned + manually added)
- Request volume
- Learning status (Learning / Active)
- Last violation timestamp

Allow manual editing of mappings (add/remove roles).

**FR-3.5: Configuration Management**  
UI for adjusting:
- Learning window duration
- Violation threshold percentage
- Minimum sample size
- Role cache TTL
- Data retention periods

**FR-3.6: Statistics Dashboard**  
Overview metrics:
- Total requests processed
- Active endpoints monitored
- Endpoints in learning mode
- Violations detected (24h / 7d / 30d)
- False positive rate

### 5.4 Data Retention

**FR-4.1: Tiered Retention Policy**

| Data Type | Default Retention | Configurable |
|-----------|-------------------|--------------|
| Raw request logs | 30 days | Yes |
| Alerts and violations | Indefinite | Yes |
| Endpoint mappings | Indefinite | No |
| Audit logs | Indefinite | No |

**FR-4.2: Automatic Cleanup**  
Background job runs daily to purge data exceeding retention limits.

---

## 6. Non-Functional Requirements

### 6.1 Performance

**NFR-1.1: Agent Latency**  
Agent processing must add no more than 5ms to request handling (excluding network time to Kafka).

**NFR-1.2: Detection Latency**  
Time from request occurrence to violation appearing in portal should be under 30 seconds under normal load.

**NFR-1.3: Throughput**  
System should handle at minimum 1,000 requests/second with recommended hardware specs (to be determined during development).

### 6.2 Reliability

**NFR-2.1: Agent Failure Isolation**  
If the agent fails or Kafka is unavailable, application traffic must not be impacted (fail-open design).

**NFR-2.2: Data Durability**  
Kafka should be configured with appropriate replication for production deployments (documentation provided).

### 6.3 Deployment

**NFR-3.1: Docker Support**  
All components must be containerized and deployable via Docker Compose for simple setup.

**NFR-3.2: Single-Tenant Architecture**  
Initial release supports single application/tenant per deployment.

**NFR-3.3: Minimal Dependencies**  
Required external dependencies limited to:
- PostgreSQL
- Kafka (with Zookeeper or KRaft)

---

*End of Document*