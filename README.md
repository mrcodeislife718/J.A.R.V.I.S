# J.A.R.V.I.S

**Just A Regular Virtual Intelligence System**

J.A.R.V.I.S is a governed, local-first AI operating core that compiles objectives into bounded missions, activates only the capabilities required, routes work to models and tools, verifies results, and writes only reviewed knowledge to long-term memory.

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

## Version 0.2

Version 0.2 adds the first durable domain system: **Persistent Personal Knowledge Management**.

Implemented foundation:

- Mission compiler and dynamic capability graph
- Seven isolated domain policy manifests
- Risk rejection and human authorization pauses
- Local Ollama model routing and constrained inference scheduling
- Deterministic verification, retries, audits, and telemetry
- Isolated Personal Knowledge workspaces
- Content-addressed storage of original source text
- Explicit user, assistant, external, system, and mixed authorship
- Candidate, approved, rejected, and superseded knowledge states
- Decisions, corrections, standing rules, unresolved questions, next actions, evidence, assumptions, contradictions, and project state
- PostgreSQL persistence and migration
- PostgreSQL full-text retrieval
- Optional Ollama embeddings and Qdrant semantic retrieval
- Reciprocal-rank fusion of lexical and semantic results
- Project timelines and exact-state resume packets
- Integration tests covering review-gated retrieval and authorship preservation

It deliberately does **not** claim that authentication, live MCP servers, background queues, every file parser, production multi-node scheduling, customer-account mutation, infrastructure mutation, automated publishing, or laboratory execution already exist.

## Quick start

Requirements:

- Node.js 20.20.2 or newer
- npm
- Ollama at `http://127.0.0.1:11434` for live mission execution

```bash
cp .env.example .env
npm install
npm run dev
```

### Persistent Personal Knowledge

Start the storage services:

```bash
docker compose up -d postgres qdrant
```

Set these values in `.env`:

```text
PKM_STORAGE_DRIVER=postgres
PKM_SEMANTIC_INDEX=qdrant
```

Apply the schema and start J.A.R.V.I.S:

```bash
npm run migrate
npm run dev
```

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
```

## Development commands

```bash
npm run dev
npm run migrate
npm run typecheck
npm test
npm run build
npm start
```

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/PERSONAL-KNOWLEDGE.md`](docs/PERSONAL-KNOWLEDGE.md)
- [`docs/DOMAIN-BOUNDARIES.md`](docs/DOMAIN-BOUNDARIES.md)
- [`docs/MEASUREMENT.md`](docs/MEASUREMENT.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`SECURITY.md`](SECURITY.md)

## License

Copyright (c) Charles Castillo. All rights reserved until a license is explicitly selected.
