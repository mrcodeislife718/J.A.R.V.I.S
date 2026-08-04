# Implementation Status

## Implemented in 0.1 — Governed core

- One shared governed mission lifecycle
- Seven isolated domain manifests
- Capability allow-lists
- Domain risk assessment and non-overridable rejection
- Human authorization pause and scoped authorization record
- Same-domain approved-memory context compilation
- Local Ollama generation adapter
- Adaptive default/strong model routing
- Global generation backpressure
- Bounded retry and dependency failure stop
- Deterministic verification checks
- Human-reviewed memory promotion
- Governed tool gateway contract
- Append-only audit events
- Mission, token, latency, and reliability telemetry
- Repeatable evaluation harness contract
- HTTP API and integration tests

## Implemented in 0.2 — Persistent Personal Knowledge

- Isolated project workspaces
- Content-addressed original-text blobs
- Explicit authorship separation
- Candidate, approved, rejected, and superseded knowledge states
- Decisions, corrections, standing rules, open questions, next actions, evidence, assumptions, contradictions, and project state
- PostgreSQL persistence and migrations
- PostgreSQL full-text retrieval
- Optional Ollama embeddings and Qdrant semantic index
- Reciprocal-rank fusion
- Timelines and exact-state resume packets
- Approved workspace context supplied to Personal Knowledge missions
- Restart-persistence and review-gating tests

## Implemented in 0.3 — Infrastructure Administration foundation

- Machine and service inventory
- Token-gated node registration and heartbeats
- CPU, load, memory, swap, disk, temperature, network, process, and service-health records
- Configurable health thresholds and deduplicated alerts
- Stale-node detection and resource-aware node selection
- PostgreSQL fleet persistence
- Incident records and timelines
- Backup registry and verification records
- Scoped, idempotent infrastructure action proposals
- Record-only default executor that refuses unsupported privileged changes
- Fleet state supplied as evidence to Infrastructure Administration missions

## Implemented in 0.4 — Governed Analytics

- Persistent data-source registry with sensitivity and access requirements
- Opaque credential references
- Versioned schema snapshots and fingerprints
- Conservative read-only SQL validation
- Refusing default query executor
- Reviewed metric definitions and deterministic calculations
- Data-quality checks and dataset profiles
- Forecast backtesting against an explicit baseline
- Source-to-result lineage
- Reviewed report definitions and snapshots
- Analytics mission context
- PostgreSQL restart-persistence tests

## Implemented in 0.5 — Business Operations and Content Production

### Business Operations

- Organizations with explicit owner authority
- Projects, milestones, dependencies, bottlenecks, success criteria, and completion evidence
- Enforced recommendation, decision, authorization, execution, and verification stages
- Candidate and reviewed SOPs
- Deterministic financial scenarios with preserved assumptions
- Risk scoring, triggers, mitigations, and contingencies
- Meeting records and assigned actions
- Reproducible weekly operating reports
- PostgreSQL persistence and append-only business events
- Governed business state supplied to Business Operations missions

### Content Production

- Brand voice, prohibited claims, required disclosures, and approved platforms
- Candidate and reviewed sources with credibility, rights, locators, and supported claims
- Reviewed briefs and claim-level draft evidence checks
- Character-limit, required-message, disclosure, and prohibited-language enforcement
- Human draft and publication approval gates
- Record-only external publication completion
- Deterministic content performance calculations
- Evidence-backed content experiments
- PostgreSQL persistence and append-only content events
- Governed content state supplied to Content Production missions

## Production work still required

- Authentication, organizations, roles, and capability tokens
- Per-node cryptographic identity, TLS, enrollment approval, and secret rotation
- Qdrant hybrid dense/sparse retrieval and learned reranking
- Encrypted object storage for original artifacts
- Redis queue, leases, transactional capacity reservations, and distributed scheduling
- Model residency, warm-cache, load, unload, and spillover policies
- Live MCP server discovery and governed invocation
- Sandboxed code, SQL, and privileged infrastructure execution
- Platform-specific service, container, GPU, temperature, swap, and network collectors
- Automated rollback and postcondition verification
- Real backup restore adapters
- Governed business connectors for accounting, CRM, calendar, contracts, and grants
- Governed content connectors for research, asset storage, platform analytics, and approved publishing
- Source connectors for literature, patents, policies, tickets, and customer systems
- Domain-specific production evaluation suites
- Cross-domain approved-artifact bridge
- High availability, worker failover, and disaster recovery

## Explicitly unsupported

- Autonomous clinical or laboratory activity
- Actionable human dosing
- Autonomous biological ordering or synthesis
- Arbitrary shell execution
- Autonomous destructive infrastructure changes
- Unauthorized spending, contract acceptance, or ownership transfer
- Customer-account or refund mutations
- Automated publication or paid promotion
- Fabricated sources, quotations, metrics, or financial representations
- Claims of production security, regulatory compliance, or benchmark superiority without independent evidence
