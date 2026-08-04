# J.A.R.V.I.S

**Just A Regular Virtual Intelligence System**

J.A.R.V.I.S is a governed, local-first AI operating core that compiles objectives into bounded missions, activates only the required capabilities, routes work to models and tools, verifies results, and writes only reviewed knowledge to long-term memory.

It is one shared platform with seven isolated domain systems:

1. Biomedical Research and Development
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
- Important claims retain evidence, provenance, confidence, authorship, contradiction, and uncertainty.
- Irreversible or high-risk actions require explicit human approval.
- Independent scientists and companies may use the Biomedical domain to plan legitimate research, qualify partners, coordinate professional laboratories, preserve returned evidence, build IP, pursue funding, develop manufacturing strategy, and commercialize validated assets.
- Physical laboratory execution remains attached to qualified professionals, facilities, contracts, quality systems, biosafety controls, ethics review, and applicable regulatory requirements.
- Agent count is not a performance metric. Verified mission success is.

## Version 0.7

Version 0.7 adds the persistent **Governed Biomedical Research and Development** workforce while preserving every capability delivered in versions 0.1 through 0.6.

### Biomedical Research and Development

- BIO-GENE-style research workspaces and portfolios
- Disease, subtype, platform, target, pathway, mechanism, biomarker, intervention, delivery, manufacturing, regulatory, and market records
- Permanent eight-node program maps: Input, Process, Output, Feedback, Incentives, Bottlenecks, Dependencies, and Failure Points
- Source provenance hashes, retraction status, study-quality scoring, bias, controls, replication, limitations, and confidence
- Review-gated scientific claims and falsifiable hypotheses
- Contradiction ledgers and evidence requirements for resolution
- Review-gated computational, assay, preclinical, analytical, manufacturing, and translational development plans
- Qualification of universities, HBCUs, CROs, CDMOs, core facilities, testing laboratories, biobanks, and scientific consultancies
- Governed external-laboratory lifecycle covering capability review, NDA, RFI, RFQ, SOW, contract, authorization, professional execution status, raw-data return, verification, and closure
- Regulatory pathway records
- Invention disclosures and IP portfolio records
- Grant and government-contract opportunity records
- Manufacturing-readiness plans
- Licensing, co-development, research-tool, diagnostic, service, data, software, government, product, acquisition, and spinout commercialization strategies
- Recommendation, owner or principal-investigator decision, and evidence-verification gates
- PostgreSQL persistence and append-only biomedical events
- Approved biomedical state compiled into Biomedical Research missions

The Biomedical domain does not reject ordinary professional scientific concepts merely because they involve formulation, synthesis, gene editing, nanoparticles, dosing evidence, animal models, toxicology, manufacturing, or clinical translation.

Narrow non-overridable boundaries remain for self-administration workflows, actionable human dosing schedules for untested interventions, oversight evasion, pathogen enhancement, fabricated evidence, autonomous wet-lab execution, and external laboratory commitments without proper authority.

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
BIOMEDICAL_STORAGE_DRIVER=postgres
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

### Biomedical workforce example

Create a governed biomedical workspace:

```bash
curl -X POST http://localhost:3000/v1/biomedical/workspaces \
  -H 'content-type: application/json' \
  -d '{
    "id":"bio-gene-rd",
    "name":"BIO-GENE Research and Development",
    "owner":"Charles Castillo",
    "researchAreas":["oncology","regenerative-medicine","nanotechnology"],
    "objectives":["Create validated biomedical assets","Coordinate qualified laboratories"],
    "revenueTargets":["Licensing","Research tools","Government contracts"]
  }'
```

Create a program with the permanent eight-node system map:

```bash
curl -X POST http://localhost:3000/v1/biomedical/programs \
  -H 'content-type: application/json' \
  -d '{
    "id":"program-1",
    "workspaceId":"bio-gene-rd",
    "name":"Subtype-specific research platform",
    "researchArea":"oncology",
    "diseaseOrPlatform":"Subtype-specific therapeutic platform",
    "problemStatement":"Develop an evidence-linked intervention strategy and validate it through qualified professional partners.",
    "intendedImpact":"Create a translational and licensable biomedical asset.",
    "commercialThesis":"Build protected technology with licensing, co-development, and research-tool revenue paths.",
    "owner":"Charles Castillo",
    "eightNodeMap":{
      "input":["literature","patents","data"],
      "process":["evidence review","design","external validation"],
      "output":["validated claims","IP","development package"],
      "feedback":["laboratory results","expert review"],
      "incentives":["patient need","commercial value"],
      "bottlenecks":["delivery","manufacturing","funding"],
      "dependencies":["qualified laboratories","data rights"],
      "failurePoints":["invalid mechanism","poor reproducibility","blocked IP"]
    },
    "successCriteria":["Reproducible evidence","Qualified validation","Defensible IP"],
    "terminationCriteria":["Mechanism falsified","Unacceptable development risk"]
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

POST /v1/biomedical/workspaces
POST /v1/biomedical/programs
POST /v1/biomedical/evidence
POST /v1/biomedical/evidence/:id/review
POST /v1/biomedical/claims
POST /v1/biomedical/claims/:id/review
POST /v1/biomedical/contradictions
POST /v1/biomedical/contradictions/:id/resolve
POST /v1/biomedical/graph/nodes
POST /v1/biomedical/graph/nodes/:id/review
POST /v1/biomedical/graph/edges
POST /v1/biomedical/graph/edges/:id/review
POST /v1/biomedical/hypotheses
POST /v1/biomedical/hypotheses/:id/review
POST /v1/biomedical/development-plans
POST /v1/biomedical/development-plans/:id/review
POST /v1/biomedical/laboratories
POST /v1/biomedical/laboratories/:id/qualify
POST /v1/biomedical/laboratory-engagements
POST /v1/biomedical/laboratory-engagements/:id/transitions
POST /v1/biomedical/regulatory-pathways
POST /v1/biomedical/regulatory-pathways/:id/review
POST /v1/biomedical/ip-assets
POST /v1/biomedical/ip-assets/:id/status
POST /v1/biomedical/funding-opportunities
POST /v1/biomedical/manufacturing-plans
POST /v1/biomedical/commercialization-plans
POST /v1/biomedical/decision-gates
POST /v1/biomedical/decision-gates/:id/decide
POST /v1/biomedical/decision-gates/:id/verify
GET  /v1/biomedical/entities
GET  /v1/biomedical/context
GET  /v1/biomedical/events

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
- [`docs/BIOMEDICAL-RESEARCH.md`](docs/BIOMEDICAL-RESEARCH.md)
- [`docs/BIOMEDICAL-API.md`](docs/BIOMEDICAL-API.md)
- [`docs/PERSONAL-KNOWLEDGE.md`](docs/PERSONAL-KNOWLEDGE.md)
- [`docs/INFRASTRUCTURE-ADMINISTRATION.md`](docs/INFRASTRUCTURE-ADMINISTRATION.md)
- [`docs/ANALYTICS.md`](docs/ANALYTICS.md)
- [`docs/BUSINESS-OPERATIONS.md`](docs/BUSINESS-OPERATIONS.md)
- [`docs/CONTENT-PRODUCTION.md`](docs/CONTENT-PRODUCTION.md)
- [`docs/CUSTOMER-SUPPORT.md`](docs/CUSTOMER-SUPPORT.md)
- [`docs/DOMAIN-BOUNDARIES.md`](docs/DOMAIN-BOUNDARIES.md)
- [`docs/IMPLEMENTATION-STATUS.md`](docs/IMPLEMENTATION-STATUS.md)
- [`docs/MEASUREMENT.md`](docs/MEASUREMENT.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`SECURITY.md`](SECURITY.md)

## License

Copyright (c) Charles Castillo. All rights reserved until a license is explicitly selected.
