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

## Version 0.3

Version 0.3 adds the second durable domain system: **Infrastructure Administration**.

Implemented foundation:

- Governed mission compiler, capability graph, verification, audit, and telemetry
- Seven isolated domain policy manifests
- Persistent Personal Knowledge workspaces with reviewed retrieval and exact-state resumption
- Fleet inventory for nodes, services, capacities, labels, and capabilities
- Token-gated node registration and heartbeat ingestion
- CPU, memory, disk, load, temperature, network, process, and service-health records
- Configurable health thresholds and deduplicated alerts
- Resource-aware workload placement across eligible nodes
- Incident records and append-only operational timelines
- Backup registry and explicit verification records
- Propose → approve/reject → execute action lifecycle with idempotency keys
- PostgreSQL persistence for fleet state
- Shell-free local node collector using Node.js operating-system APIs
- Live fleet state compiled into infrastructure-administration mission context

The default executor does **not** run arbitrary shell commands. Service restarts and log rotation remain refused until a narrowly scoped privileged node adapter is installed. Drain and resume operations affect J.A.R.V.I.S scheduling state only.

J.A.R.V.I.S does not yet claim production authentication, encrypted agent identity, remote command execution, automatic container discovery, vulnerability scanning, distributed mission queues, cloud-provider adapters, or autonomous production administration.

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

Each approved worker machine points `INFRA_CONTROL_URL` at the J.A.R.V.I.S control layer and uses the same configured `INFRA_AGENT_TOKEN`. Do not expose this bootstrap token scheme to an untrusted network.

### Persistent Personal Knowledge

Create a workspace:

```bash
curl -X POST http://localhost:3000/v1/pkm/workspaces \
  -H 'content-type: application/json' \
  -d '{"name":"J.A.R.V.I.S","description":"Persistent project memory"}'
```

Ingest exact user-authored knowledge:

```bash
curl -X POST http://localhost:3000/v1/pkm/workspaces/WORKSPACE_ID/sources \
  -H 'content-type: application/json' \
  -d '{
    "title":"Architecture notes",
    "kind":"note",
    "authorship":"user",
    "content":"Decision: Build one governed core.\nCorrection: Agent count is not a performance metric.\nNext action: Add persistent storage."
  }'
```

Extracted records remain candidates until explicitly approved.

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
GET  /v1/pkm/workspaces/:id/sources
GET  /v1/pkm/workspaces/:id/sources/:sourceId/content
POST /v1/pkm/workspaces/:id/items
GET  /v1/pkm/workspaces/:id/items
POST /v1/pkm/workspaces/:id/items/:itemId/approve
POST /v1/pkm/workspaces/:id/items/:itemId/reject
GET  /v1/pkm/workspaces/:id/search
GET  /v1/pkm/workspaces/:id/resume
GET  /v1/pkm/workspaces/:id/timeline

POST /v1/infrastructure/nodes
POST /v1/infrastructure/nodes/:id/heartbeat
GET  /v1/infrastructure/nodes
GET  /v1/infrastructure/nodes/:id
GET  /v1/infrastructure/nodes/:id/metrics
GET  /v1/infrastructure/fleet
POST /v1/infrastructure/schedule
POST /v1/infrastructure/actions
GET  /v1/infrastructure/actions
POST /v1/infrastructure/actions/:id/approve
POST /v1/infrastructure/actions/:id/reject
POST /v1/infrastructure/actions/:id/execute
GET  /v1/infrastructure/alerts
POST /v1/infrastructure/alerts/:id/resolve
POST /v1/infrastructure/incidents
GET  /v1/infrastructure/incidents
GET  /v1/infrastructure/incidents/:id
PATCH /v1/infrastructure/incidents/:id
POST /v1/infrastructure/backups
GET  /v1/infrastructure/backups
POST /v1/infrastructure/backups/:id/verifications
GET  /v1/infrastructure/backups/:id/verifications
GET  /v1/infrastructure/events
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
- [`docs/DOMAIN-BOUNDARIES.md`](docs/DOMAIN-BOUNDARIES.md)
- [`docs/MEASUREMENT.md`](docs/MEASUREMENT.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`SECURITY.md`](SECURITY.md)

## License

Copyright (c) Charles Castillo. All rights reserved until a license is explicitly selected.
