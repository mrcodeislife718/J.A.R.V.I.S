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

## Version 0.5

Version 0.5 adds two persistent domain operating systems: **Business Operations** and **Content Production**.

### Business Operations

- Organizations with explicit owner authority
- Projects, milestones, dependencies, bottlenecks, success criteria, and completion evidence
- Enforced recommendation → decision → authorization → execution → verification lifecycle
- Candidate and human-reviewed SOPs
- Deterministic financial scenarios with preserved assumptions
- Risk scoring, triggers, mitigations, and contingencies
- Meeting records and assigned actions
- Reproducible weekly operating reports
- PostgreSQL persistence and append-only events
- Approved operating state compiled into Business Operations missions

### Content Production

- Brand voice, prohibited claims, required disclosures, and approved platforms
- Candidate, approved, and rejected sources with credibility, rights, and locators
- Reviewed briefs and claim-level draft evidence checks
- Character-limit, required-message, disclosure, and prohibited-language enforcement
- Human draft and publication approval gates
- Record-only external publication completion; no automated publishing
- Deterministic click-through, engagement, conversion, and cost-per-conversion calculations
- Evidence-backed content experiments
- PostgreSQL persistence and append-only events
- Approved content state compiled into Content Production missions

J.A.R.V.I.S v0.5 does not sign contracts, transfer money, hire or terminate staff, publish to social platforms, hold social-account credentials, purchase advertising, or approve unsupported claims.

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
BUSINESS_STORAGE_DRIVER=postgres
CONTENT_STORAGE_DRIVER=postgres
PKM_SEMANTIC_INDEX=qdrant
```

Apply all schemas and start J.A.R.V.I.S:

```bash
npm run migrate
npm run dev
```

### Business Operations example

```bash
curl -X POST http://localhost:3000/v1/business/organizations \
  -H 'content-type: application/json' \
  -d '{
    "id":"bio-gene",
    "name":"Bio-Gene Inc",
    "owner":"Charles Castillo",
    "currency":"USD",
    "timezone":"America/New_York"
  }'
```

### Content Production example

```bash
curl -X POST http://localhost:3000/v1/content/brands \
  -H 'content-type: application/json' \
  -d '{
    "id":"charles-brand",
    "name":"Charles Castillo",
    "owner":"Charles Castillo",
    "voicePrinciples":["clear","systems-oriented","evidence-backed"],
    "approvedPlatforms":["LinkedIn"]
  }'
```

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
POST /v1/pkm/workspaces/:id/sources
GET  /v1/pkm/workspaces/:id/search
GET  /v1/pkm/workspaces/:id/resume
GET  /v1/pkm/workspaces/:id/timeline

POST /v1/infrastructure/nodes
POST /v1/infrastructure/nodes/:id/heartbeat
GET  /v1/infrastructure/fleet
POST /v1/infrastructure/schedule
POST /v1/infrastructure/actions
POST /v1/infrastructure/actions/:id/approve
POST /v1/infrastructure/actions/:id/execute
GET  /v1/infrastructure/events

POST /v1/analytics/sources
POST /v1/analytics/sql/validate
POST /v1/analytics/queries
POST /v1/analytics/metrics
POST /v1/analytics/metrics/:id/approve
POST /v1/analytics/metrics/:id/calculate
POST /v1/analytics/quality/runs
POST /v1/analytics/forecasts/evaluate
POST /v1/analytics/reports
GET  /v1/analytics/lineage

POST /v1/business/organizations
POST /v1/business/projects
PATCH /v1/business/projects/:id/status
PATCH /v1/business/projects/:id/milestones/:milestoneId
POST /v1/business/decisions
POST /v1/business/decisions/:id/transitions
POST /v1/business/sops
POST /v1/business/sops/:id/review
POST /v1/business/financial-scenarios
POST /v1/business/risks
POST /v1/business/meetings
POST /v1/business/reports/weekly
GET  /v1/business/context
GET  /v1/business/events

POST /v1/content/brands
POST /v1/content/sources
POST /v1/content/sources/:id/review
POST /v1/content/briefs
POST /v1/content/briefs/:id/review
POST /v1/content/drafts
POST /v1/content/drafts/:id/review
POST /v1/content/publication-plans
POST /v1/content/publication-plans/:id/approve
POST /v1/content/publication-plans/:id/record-publication
POST /v1/content/performance
POST /v1/content/experiments
POST /v1/content/experiments/:id/complete
GET  /v1/content/context
GET  /v1/content/events
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
- [`docs/BUSINESS-OPERATIONS.md`](docs/BUSINESS-OPERATIONS.md)
- [`docs/CONTENT-PRODUCTION.md`](docs/CONTENT-PRODUCTION.md)
- [`docs/DOMAIN-BOUNDARIES.md`](docs/DOMAIN-BOUNDARIES.md)
- [`docs/MEASUREMENT.md`](docs/MEASUREMENT.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`SECURITY.md`](SECURITY.md)

## License

Copyright (c) Charles Castillo. All rights reserved until a license is explicitly selected.
