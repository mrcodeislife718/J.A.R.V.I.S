# J.A.R.V.I.S

**Just A Regular Virtual Intelligence System**

J.A.R.V.I.S is a governed, local-first AI operating core that compiles objectives into bounded missions, activates only the required capabilities, routes work to models and tools, verifies results, and writes only reviewed knowledge to long-term memory.

It is one shared platform with seven isolated domain systems:

1. Biomedical Research
2. Business Operations
3. Personal Knowledge Management
4. Customer Support
5. Analytics
6. Infrastructure Administration
7. Content Production

## Mission lifecycle

```text
Objective
  -> Mission compiler
  -> Risk, permission, and resource assessment
  -> Dynamic capability graph
  -> Context and evidence compiler
  -> Model and tool router
  -> Execution scheduler
  -> Verification plane
  -> Approved output
  -> Governed memory-write gate
```

## Core rules

- Minimum necessary context, capabilities, permissions, and compute.
- No domain receives unrestricted access to another domain's memory or tools.
- Recommendations, decisions, authorizations, executions, and verifications are distinct records.
- Important claims retain evidence, provenance, confidence, authorship, and uncertainty.
- Irreversible or high-risk actions require explicit human approval.
- Biomedical operation is research-support only: no autonomous ordering, synthesis, dosing, clinical use, or human experimentation.
- Agent count is not a performance metric. Verified mission success is.

## Version 0.4

Version 0.4 adds the third durable domain system: **Governed Analytics**.

Implemented foundation:

- Governed mission compiler, capability graph, verification, audit, and telemetry
- Seven isolated domain policy manifests
- Persistent Personal Knowledge workspaces with reviewed retrieval and exact-state resumption
- Infrastructure fleet inventory, telemetry, alerts, workload routing, incidents, backups, and approval-gated actions
- Persistent analytics data-source registry with sensitivity and access controls
- Versioned schema snapshots with fingerprints
- Conservative read-only SQL validation
- Pluggable query-executor contract with a refusing default
- Candidate, approved, rejected, and deprecated metric definitions
- Deterministic metric calculations with hashed inputs
- Dataset profiling and deterministic data-quality rules
- Forecast evaluation against an explicit baseline
- Source-to-result lineage across schemas, queries, metrics, quality checks, forecasts, and reports
- Candidate and approved report definitions with missing-metric disclosure
- PostgreSQL persistence for analytics state
- Approved analytics state compiled into analytics mission context

The default analytics executor does **not** connect to external databases or run SQL. A deployment must inject a separately governed, read-only connector. Credential references remain opaque and are not placed into model context.

J.A.R.V.I.S does not yet claim production authentication, regulated-data certification, automatic schema crawling, built-in warehouse connectors, causal-inference automation, scheduled report delivery, remote privileged infrastructure execution, or autonomous laboratory activity.

## Quick start

Requirements:

- Node.js 20.20.2 or newer
- npm
- Optional: Ollama at `http://127.0.0.1:11434` for live model execution
- Optional: Docker for PostgreSQL, Qdrant, and Redis

```bash
cp .env.example .env
npm install
npm run dev
```

### Durable storage

Start local services:

```bash
docker compose up -d postgres qdrant redis
```

Set the desired adapters in `.env`:

```text
PKM_STORAGE_DRIVER=postgres
INFRA_STORAGE_DRIVER=postgres
ANALYTICS_STORAGE_DRIVER=postgres
PKM_SEMANTIC_INDEX=qdrant
```

Apply all schemas and start J.A.R.V.I.S:

```bash
npm run migrate
npm run dev
```

### Register the local machine

Replace the development token in `.env`, then run:

```bash
npm run infra:agent:once
```

To keep sending heartbeats:

```bash
npm run infra:agent
```

Each approved worker machine points `INFRA_CONTROL_URL` at the J.A.R.V.I.S control layer and uses the configured `INFRA_AGENT_TOKEN`. Do not expose this bootstrap shared-token scheme to an untrusted network.

### Persistent Personal Knowledge

Create a workspace:

```bash
curl -X POST http://localhost:3000/v1/pkm/workspaces \
  -H 'content-type: application/json' \
  -d '{"name":"J.A.R.V.I.S","description":"Persistent project memory"}'
```

### Governed Analytics

Register a source without exposing its credentials:

```bash
curl -X POST http://localhost:3000/v1/analytics/sources \
  -H 'content-type: application/json' \
  -d '{
    "id":"company-analytics",
    "name":"Company analytics",
    "kind":"postgres",
    "sensitivity":"confidential",
    "requiresApproval":true,
    "endpointLabel":"read-only reporting replica",
    "credentialRef":"env:COMPANY_ANALYTICS_READONLY_URL",
    "owner":"Charles Castillo"
  }'
```

Validate a query without executing it:

```bash
curl -X POST http://localhost:3000/v1/analytics/sql/validate \
  -H 'content-type: application/json' \
  -d '{"sql":"SELECT customer_id, revenue FROM sales ORDER BY revenue DESC LIMIT 100"}'
```

Live query execution remains disabled until an approved read-only executor is installed.

## API groups

```text
GET  /health
GET  /v1/domains
GET  /v1/capabilities
GET  /v1/metrics

POST /v1/missions
GET  /v1/missions
GET  /v1/missions/:id
POST /v1/missions/:id/authorize
GET  /v1/missions/:id/audit

POST /v1/pkm/workspaces
GET  /v1/pkm/workspaces
GET  /v1/pkm/workspaces/:id
POST /v1/pkm/workspaces/:id/sources
GET  /v1/pkm/workspaces/:id/search
GET  /v1/pkm/workspaces/:id/resume
GET  /v1/pkm/workspaces/:id/timeline

POST /v1/infrastructure/nodes
POST /v1/infrastructure/nodes/:id/heartbeat
GET  /v1/infrastructure/nodes
GET  /v1/infrastructure/fleet
POST /v1/infrastructure/schedule
POST /v1/infrastructure/actions
POST /v1/infrastructure/actions/:id/approve
POST /v1/infrastructure/actions/:id/execute
GET  /v1/infrastructure/alerts
POST /v1/infrastructure/incidents
POST /v1/infrastructure/backups
POST /v1/infrastructure/backups/:id/verifications
GET  /v1/infrastructure/events

POST /v1/analytics/sources
GET  /v1/analytics/sources
POST /v1/analytics/sources/:id/schemas
GET  /v1/analytics/sources/:id/schema
POST /v1/analytics/sql/validate
POST /v1/analytics/queries
GET  /v1/analytics/queries
POST /v1/analytics/metrics
POST /v1/analytics/metrics/:id/approve
POST /v1/analytics/metrics/:id/calculate
GET  /v1/analytics/metrics/:id/observations
POST /v1/analytics/quality/rules
POST /v1/analytics/quality/runs
POST /v1/analytics/profiles
POST /v1/analytics/forecasts/evaluate
POST /v1/analytics/reports
POST /v1/analytics/reports/:id/approve
GET  /v1/analytics/reports/:id/snapshot
GET  /v1/analytics/lineage
```

## Development commands

```bash
npm run dev
npm run migrate
npm run infra:agent:once
npm run infra:agent
npm run typecheck
npm test
npm run build
npm start
```

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/PERSONAL-KNOWLEDGE.md`](docs/PERSONAL-KNOWLEDGE.md)
- [`docs/INFRASTRUCTURE-ADMINISTRATION.md`](docs/INFRASTRUCTURE-ADMINISTRATION.md)
- [`docs/ANALYTICS.md`](docs/ANALYTICS.md)
- [`docs/DOMAIN-BOUNDARIES.md`](docs/DOMAIN-BOUNDARIES.md)
- [`docs/MEASUREMENT.md`](docs/MEASUREMENT.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`SECURITY.md`](SECURITY.md)

## License

Copyright (c) Charles Castillo. All rights reserved until a license is explicitly selected.
