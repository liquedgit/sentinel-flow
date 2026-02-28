# Sentinel Flow

**Real-time Broken Access Control (BAC) detection through traffic-based learning.**

Sentinel Flow is an open-source system that monitors HTTP traffic to identify potential RBAC violations. Instead of manually configuring access rules, it observes actual traffic patterns, learns which roles legitimately access each endpoint, and flags requests that deviate from those patterns.

[**📚 Documentation**](https://sentinel-flow-docs.pages.dev/docs/intro/) · [GitHub](https://github.com/)

---

## Why Sentinel Flow?

[Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/) consistently ranks in the OWASP Top 10. Teams often struggle to:

- Detect unauthorized access in **real time**
- Keep endpoint–role expectations accurate and up to date
- Catch RBAC misconfigurations before they are exploited

Sentinel Flow addresses this by **learning from real traffic**: no upfront rule authoring, minimal configuration, and alerts when access patterns look suspicious.

---

## How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Agent     │────▶│ Application │
└─────────────┘     │ (reverse    │     └─────────────┘
                    │  proxy)     │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Kafka    │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  Detection │────▶│ PostgreSQL  │
                    │   Engine   │     └─────────────┘
                    └─────────────┘
```

1. **Agent** — Lightweight Go reverse proxy in front of your app. It forwards requests, resolves user/role (e.g. via `/me` or headers), and publishes access events to Kafka.
2. **Kafka** — Buffers and decouples event flow so the detection engine can consume at its own pace and replay when needed.
3. **Detection Engine** — Consumes events, builds endpoint–role mappings from traffic, and raises violations when a role accesses an endpoint it hasn’t been seen using before (above configurable thresholds).

Traffic is observed over a learning window; only after enough data is collected does the engine start flagging deviations. No manual rule authoring required.

---

## Features

- **Zero-config rule generation** — Endpoint–role expectations are derived from observed traffic.
- **Real-time violation detection** — Configurable sensitivity and thresholds.
- **Self-hosted & open source** — Deploy with Docker; no SaaS lock-in.
- **Low-friction adoption** — Sidecar-style agent; no code changes to your app.
- **Fail-open design** — If the agent or Kafka is down, application traffic is not blocked.

---

## Quick Start

**Prerequisites:** Docker and Docker Compose.

1. **Clone and start the stack** (Agent, Kafka, Detection Engine, PostgreSQL):

   ```bash
   git clone https://github.com/your-org/sentinel-flow.git
   cd sentinel-flow
   docker compose up -d
   ```

2. **Configure agent-checker auth**: Create a `.env` file at the repo root. For OpenCode (default), run `opencode auth login` or set provider API keys (e.g. `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`). See [OpenCode docs](https://opencode.ai/docs/).

   ```
   ANTHROPIC_API_KEY=your-key-here
   ```

3. **Run the example backend** (optional, for end-to-end testing):

   ```bash
   cd example_project
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8081
   ```

4. **Send traffic through the agent** (e.g. `http://localhost:9000`). The agent forwards to your app and publishes events to Kafka; the detection engine learns and evaluates access patterns.

**Agent-checker**: To run code-level security checks on flagged endpoints, place your API project folders under `projects/` and produce messages to the `sf-check-requests` Kafka topic (e.g. from the dashboard or manually). The agent-checker consumes these requests and runs OpenCode CLI against the project codebase.

See the [documentation](https://sentinel-flow-docs.pages.dev/docs/intro/) for architecture details, configuration, and deployment.

---

## Repository Structure

| Path | Description |
|------|-------------|
| `agent/` | Go reverse proxy: intercepts requests, resolves identity, publishes to Kafka |
| `detection-engine/` | Go service: consumes Kafka, learns mappings, detects violations, stores in PostgreSQL |
| `agent-checker/` | Go service: consumes check requests from Kafka, validates project existence, runs OpenCode CLI for code-level security review of flagged endpoints |
| `sentinel-flow-dashboard/` | Web UI for violations and configuration |
| `example_project/` | Minimal Python app with `/me` for testing the agent |
| `docs/` | Docusaurus site (source for the published docs) |
| `projects/` | Project folders for agent-checker (mount point; add API projects for code review) |
| `sql/` | PostgreSQL schema and init scripts |

---

## Documentation

Full docs (overview, agent, detection engine, tools, and deployment):

**[→ Sentinel Flow Documentation](https://sentinel-flow-docs.pages.dev/docs/intro/)**

---

## License

MIT © 2026 Justine Winata and Michael Bryan. See [LICENSE](LICENSE) for details.
