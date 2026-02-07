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

## 7. Database Schema (Draft)

```sql
-- Request logs (high volume, time-partitioned)
CREATE TABLE request_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    user_id VARCHAR(255),
    role VARCHAR(100),
    source_ip INET,
    response_status INTEGER,
    trace_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learned endpoint mappings
CREATE TABLE endpoint_mappings (
    id SERIAL PRIMARY KEY,
    endpoint VARCHAR(500) UNIQUE NOT NULL,
    allowed_roles JSONB NOT NULL DEFAULT '[]',
    total_requests BIGINT DEFAULT 0,
    learning_status VARCHAR(20) DEFAULT 'learning',
    auto_generated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detected violations
CREATE TABLE violations (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    user_id VARCHAR(255),
    role VARCHAR(100),
    expected_roles JSONB,
    status VARCHAR(20) DEFAULT 'new',
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMPTZ,
    request_log_id BIGINT REFERENCES request_logs(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System configuration
CREATE TABLE configurations (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(255)
);

-- Audit log
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    user_id VARCHAR(255),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. API Endpoints (Draft)

### Violations
- `GET /api/violations` - List violations with filtering/pagination
- `GET /api/violations/:id` - Get violation details
- `POST /api/violations/:id/false-positive` - Mark as false positive
- `POST /api/violations/:id/dismiss` - Dismiss without adding role

### Endpoint Mappings
- `GET /api/mappings` - List all endpoint mappings
- `GET /api/mappings/:endpoint` - Get mapping details
- `PUT /api/mappings/:endpoint/roles` - Update allowed roles
- `DELETE /api/mappings/:endpoint/roles/:role` - Remove role from mapping

### Statistics
- `GET /api/stats/overview` - Dashboard statistics
- `GET /api/stats/endpoints/:endpoint` - Endpoint-specific statistics

### Configuration
- `GET /api/config` - Get current configuration
- `PUT /api/config` - Update configuration

---

## 9. User Stories

**US-1:** As a security engineer, I want to see all potential RBAC violations in one dashboard so I can quickly identify unauthorized access attempts.

**US-2:** As an application owner, I want the system to automatically learn which roles access which endpoints so I don't have to manually configure rules.

**US-3:** As a security engineer, I want to mark false positives so the system learns and doesn't alert on legitimate access patterns.

**US-4:** As a DevOps engineer, I want to deploy the entire system with a single Docker Compose command so I can quickly evaluate the solution.

**US-5:** As an application owner, I want to configure the violation threshold so I can tune sensitivity based on my application's needs.

**US-6:** As a security engineer, I want to see the historical access pattern for any endpoint so I can understand why a violation was flagged.

---

## 10. Out of Scope (v1.0)

- External alerting integrations (Slack, Email, PagerDuty)
- Multi-tenant support
- API authentication/authorization for the portal
- Request blocking/enforcement mode
- Custom rule definition beyond threshold-based learning
- High availability / clustering documentation
- Compliance certifications (SOC2, etc.)

---

## 11. Success Metrics

| Metric | Target |
|--------|--------|
| False positive rate after 30 days | < 10% |
| Mean time to detect violation | < 30 seconds |
| Endpoint coverage after learning period | > 90% of active endpoints |
| User effort for initial setup | < 1 hour |

---

## 12. Open Questions

1. What backend language/framework is preferred? (Go recommended for consistency with agent)
2. What frontend framework for portal? (React recommended for ecosystem)
3. Should the agent support multiple Nginx instances reporting to same Kafka?
4. Is there a preference for Kafka alternative (e.g., Redis Streams) for simpler deployment?
5. Should we support endpoint pattern matching (e.g., `/users/:id` grouped together)?

---

## 13. Milestones (Proposed)

| Phase | Scope | Duration |
|-------|-------|----------|
| Phase 1 | Go Agent + Kafka + Basic Backend | 4 weeks |
| Phase 2 | Learning Algorithm + Detection Logic | 3 weeks |
| Phase 3 | Portal MVP (Violations + Mappings) | 4 weeks |
| Phase 4 | Configuration UI + Polish | 2 weeks |
| Phase 5 | Documentation + Docker Compose | 1 week |

**Total Estimated Duration:** 14 weeks

---

## 14. Appendix

### A. Example Violation Detection Flow

```
1. Request arrives: GET /admin/users (role: "viewer")
2. Agent extracts metadata, publishes to Kafka
3. Backend consumes event, stores in request_logs
4. Backend checks endpoint_mappings for /admin/users
   - Found: allowed_roles = ["admin", "superadmin"]
   - "viewer" not in allowed_roles
5. Backend creates violation record
6. Portal displays new violation
7. Security engineer reviews, marks as false positive
8. Backend adds "viewer" to allowed_roles for /admin/users
9. Future "viewer" requests to /admin/users are not flagged
```

### B. Example Docker Compose Structure

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: sentinel_flow
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:latest
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092

  agent:
    image: sentinelflow/agent:latest
    environment:
      KAFKA_BROKERS: kafka:9092
      NGINX_UPSTREAM: ${NGINX_HOST}

  backend:
    image: sentinelflow/backend:latest
    depends_on:
      - postgres
      - kafka
    environment:
      DATABASE_URL: postgres://postgres:${DB_PASSWORD}@postgres:5432/sentinel_flow
      KAFKA_BROKERS: kafka:9092

  portal:
    image: sentinelflow/portal:latest
    ports:
      - "3000:3000"
    environment:
      API_URL: http://backend:8080

volumes:
  postgres_data:
```

---

*End of Document*