# J.A.R.V.I.S

**Just A Regular Virtual Intelligence System**

J.A.R.V.I.S is a governed, local-first AI operating core that compiles objectives into bounded missions, activates only the capabilities required, routes work to models and tools, verifies results, and writes only approved knowledge to long-term memory.

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
- Important claims retain evidence, provenance, confidence, and uncertainty.
- Irreversible or high-risk actions require explicit human approval.
- Biomedical operation is research-support only: no autonomous ordering, synthesis, dosing, clinical use, or human experimentation.
- Agent count is not a performance metric. Verified mission success is.

## Version 0.1 foundation

The bootstrap implementation includes:

- Mission compiler and capability graph
- Seven domain policy manifests
- Risk assessment, hard policy rejection, and authorization pauses
- Same-domain approved-memory context compilation
- Local Ollama adapter and model routing
- Serial scheduler for constrained local hardware
- Deterministic verification checks
- Candidate, approved, and rejected memory states
- Least-privilege MCP/API tool gateway contract
- Audit events and token/latency/reliability telemetry
- Fastify API and integration tests

It deliberately does **not** claim that production persistence, live MCP servers, Qdrant retrieval, customer-account mutation, infrastructure mutation, automated publishing, or laboratory execution already exist.

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

Create a mission:

```bash
curl -X POST http://localhost:3000/v1/missions \
  -H 'content-type: application/json' \
  -d '{
    "domain": "personal-knowledge",
    "objective": "Turn these project notes into decisions, unresolved questions, and next actions",
    "requestedCapabilities": ["knowledge.extract", "knowledge.connect"],
    "inputs": {"notes": "Decision: build one governed core."},
    "rememberOutput": true
  }'
```

Useful endpoints:

```text
GET  /health
GET  /v1/domains
GET  /v1/capabilities?domain=personal-knowledge
GET  /v1/metrics
POST /v1/missions
GET  /v1/missions
GET  /v1/missions/:id
POST /v1/missions/:id/authorize
GET  /v1/missions/:id/audit
GET  /v1/memory?status=candidate
POST /v1/memory/:id/approve
POST /v1/memory/:id/reject
```

Start local persistence services for later adapters:

```bash
docker compose up -d postgres qdrant redis
```

## Development commands

```bash
npm run dev
npm run typecheck
npm test
npm run build
npm start
```

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/DOMAIN-BOUNDARIES.md`](docs/DOMAIN-BOUNDARIES.md)
- [`docs/MEASUREMENT.md`](docs/MEASUREMENT.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`SECURITY.md`](SECURITY.md)

## License

Copyright (c) Charles Castillo. All rights reserved until a license is explicitly selected.
