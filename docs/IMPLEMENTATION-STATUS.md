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
- Node roles, labels, capabilities, and capacity records
- Token-gated node registration and heartbeats
- Shell-free local host collector
- CPU, load, memory, swap, disk, temperature, network, process, and service-health telemetry contracts
- Configurable health thresholds and deduplicated alerts
- Stale-node detection
- Resource-aware node selection
- PostgreSQL fleet persistence
- Incident records and timelines
- Backup registry and verification records
- Proposed, approved, rejected, executing, succeeded, and failed action states
- Scoped approvals and idempotency keys
- Record-only default executor that refuses unsupported privileged changes
- Fleet state supplied as evidence to Infrastructure Administration missions
- API, in-memory integration tests, and PostgreSQL restart-persistence tests

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
- Source connectors for literature, patents, policies, tickets, business data, and content performance
- Domain-specific production evaluation suites
- Cross-domain approved-artifact bridge
- High availability, worker failover, and disaster recovery

## Explicitly unsupported

- Autonomous clinical or laboratory activity
- Actionable human dosing
- Autonomous biological ordering or synthesis
- Arbitrary shell execution
- Autonomous destructive infrastructure changes
- Customer-account or refund mutations
- Automated publication
- Claims of production security, regulatory compliance, or benchmark superiority without independent evidence
