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

## Version 0.6

Version 0.6 adds the persistent **Governed Customer Support** operating system while preserving all capabilities delivered in versions 0.1 through 0.5.

### Customer Support

- Isolated support workspaces, customer references, products, tickets, and append-only events
- Versioned candidate, approved, rejected, and retired policies
- Versioned troubleshooting playbooks with expected signals and escalation paths
- Deterministic classification, priority, frustration, legal, security, privacy, and safety triage
- Policy-version attachment to tickets
- Approved-playbook troubleshooting plans
- Human handoffs and escalation queues
- Strict approval gates for refunds, account changes, policy exceptions, and legal responses
- Record-only external completion with idempotency keys, evidence, and external references
- Evidence-required ticket resolution
- Deterministic support-quality scoring
- Repeated-failure clustering for product investigation
- PostgreSQL persistence
- Governed support state compiled into Customer Support missions

J.A.R.V.I.S v0.6 does not send customer messages, issue refunds, alter customer accounts, waive policy, make legal admissions, or hold help-desk credentials. Privileged actions require an approved policy and explicit human authorization. Completion by an authorized person or external system is recorded only with evidence.

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
SUPPORT_STORAGE_DRIVER=postgres
PKM_SEMANTIC_INDEX=qdrant
```

Apply all schemas and start J.A.R.V.I.S:

```bash
npm run migrate
npm run dev
```

### Customer Support example

Create a governed support workspace:

```bash
curl -X POST http://localhost:3000/v1/support/workspaces \
  -H 'content-type: application/json' \
  -d '{
    "id":"jarvis-support",
    "name":"J.A.R.V.I.S Support",
    "owner":"Charles Castillo",
    "defaultSlaMinutes":60,
    "escalationTeams":["senior-support","security-escalation"]
  }'
```

Create a candidate policy, then have an authorized reviewer approve it before operational use:

```bash
curl -X POST http://localhost:3000/v1/support/policies \
  -H 'content-type: application/json' \
  -d '{
    "id":"refund-policy-v1",
    "workspaceId":"jarvis-support",
    "name":"Refund policy",
    "category":"refund",
    "version":1,
    "body":"Verified duplicate charges may be refunded after human approval.",
    "sourceRef":"policy-manual:refund:1",
    "effectiveFrom":"2026-01-01T00:00:00.000Z",
    "requiresHumanApproval":true,
    "approvedActionKinds":["refund"]
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

POST /v1/support/workspaces
POST /v1/support/customers
POST /v1/support/products
POST /v1/support/policies
POST /v1/support/policies/:id/review
GET  /v1/support/policies
POST /v1/support/playbooks
POST /v1/support/playbooks/:id/review
POST /v1/support/tickets
GET  /v1/support/tickets
POST /v1/support/tickets/:id/messages
POST /v1/support/tickets/:id/triage
POST /v1/support/tickets/:id/attach-policies
POST /v1/support/tickets/:id/troubleshooting-plan
POST /v1/support/tickets/:id/handoffs
POST /v1/support/handoffs/:id/accept
POST /v1/support/actions
POST /v1/support/actions/:id/approve
POST /v1/support/actions/:id/reject
POST /v1/support/actions/:id/record-completion
POST /v1/support/tickets/:id/resolve
POST /v1/support/quality-reviews
POST /v1/support/failure-clusters/rebuild
GET  /v1/support/context
GET  /v1/support/events
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
- [`docs/CUSTOMER-SUPPORT.md`](docs/CUSTOMER-SUPPORT.md)
- [`docs/DOMAIN-BOUNDARIES.md`](docs/DOMAIN-BOUNDARIES.md)
- [`docs/MEASUREMENT.md`](docs/MEASUREMENT.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`SECURITY.md`](SECURITY.md)

## License

Copyright (c) Charles Castillo. All rights reserved until a license is explicitly selected.
