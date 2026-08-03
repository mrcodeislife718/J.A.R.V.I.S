# J.A.R.V.I.S Roadmap

The roadmap expands one governed core rather than creating seven unrelated stacks.

## Phase 1 — Governed core foundation

Status: implemented in version 0.1.

- Mission contracts and compiler
- Domain and capability registries
- Risk assessment
- Human authorization gate
- Context compilation contract
- Ollama adapter and model routing
- Constrained scheduler
- Verification plane
- Governed memory candidates
- Tool gateway contract
- Audit and telemetry
- API, tests, container, and documentation

Exit result: every domain can submit a bounded mission through the same governed lifecycle.

## Phase 2 — Personal Knowledge Management

Status: durable foundation implemented in version 0.2.

Implemented:

- PostgreSQL persistence
- Content-addressed original-text storage
- Explicit user, assistant, external, system, and mixed authorship
- Project timelines and decision records
- Candidate, approved, rejected, and superseded review states
- Project-scoped PostgreSQL retrieval
- Optional Qdrant semantic retrieval
- Exact-state resumption
- Approved workspace state compiled into missions

Remaining production work:

- Automatic PDF, DOCX, email, and archive parsing
- Encrypted object storage
- Background ingestion queues
- Learned reranking
- Cross-workspace transfer approval
- Daily and weekly scheduled review jobs
- Regulated-data certification where applicable

Exit result achieved for the current foundation: a project can be resumed from approved state with traceable decisions and no automatic cross-project contamination.

## Phase 3 — Infrastructure Administration

Status: governed control-plane foundation implemented in version 0.3.

Implemented:

- Token-gated node enrollment
- Node roles, labels, capability inventory, and capacity records
- CPU, memory, swap, disk, load, temperature, network, process, and service telemetry contracts
- Shell-free local host collector and heartbeat agent
- Configurable health thresholds and deduplicated alerts
- Persistent PostgreSQL fleet repository
- Resource-aware workload placement decisions
- Safe read-only control-plane diagnostics
- Incident records and operational timelines
- Backup registry and verification records
- Approval-bound action lifecycle with idempotency
- Record-only default executor that refuses unsupported privileged changes
- Infrastructure state compiled into missions

Remaining production work:

- Per-node cryptographic identity, TLS, token rotation, and replay protection
- Platform-specific collectors for systemd, launchd, Windows services, containers, GPUs, temperatures, swap, and network counters
- Redis-backed queues, leases, capacity reservations, and backpressure
- Model residency, load, unload, and warm-cache policies
- Sandboxed privileged executors with command allow-lists
- Automated rollback and postcondition verification
- Real backup restore adapters
- High availability and disaster recovery

Current exit result: the control layer can register, observe, compare, and select worker nodes, retain incidents and backups, and prevent operational actions from executing without scoped approval. Full failed-worker recovery remains a later production layer.

## Phase 4 — Analytics

- Governed data-source registry
- Schema discovery
- Read-only SQL generation and validation
- Metric-definition registry
- Data-quality checks
- Reproducible transformation lineage
- Forecast evaluation and backtesting
- Recurring reports

Exit requirement: every reported metric can be recalculated from its source and transformation history.

## Phase 5 — Business Operations and Content Production

Business Operations:

- Project, milestone, owner, dependency, and deadline records
- Decision and authorization workflows
- Financial scenario engine
- SOP management
- Weekly operating reports

Content Production:

- Research evidence packages
- Voice and brand profiles
- Platform constraint validators
- Draft, fact-check, approval, and scheduling workflows
- Performance feedback without causal overclaiming

Exit requirement: both domains create measurable value while remaining separated from confidential domains.

## Phase 6 — Customer Support

- Product and policy knowledge ingestion
- Ticket and customer connectors
- Classification and escalation models
- Verified troubleshooting playbooks
- Account-mutation authorization
- Anonymized issue-pattern transfer to analytics
- Support quality evaluation

Exit requirement: verified resolution quality exceeds the manual baseline without unauthorized customer changes.

## Phase 7 — Biomedical Research hardening

- Primary-source literature connectors
- Retraction and study-quality services
- Cancer-subtype, HIV, and nanotechnology graph partitions
- Claim-evidence entailment
- Assay and statistical analysis adapters
- IP and regulatory research adapters
- Qualified-expert review workflow
- Biological-risk classifier
- Reproducibility and translational-readiness scoring

Exit requirement: the system reliably separates evidence, inference, hypothesis, contradiction, and missing information while enforcing research-only boundaries.

## Cross-cutting production work

- PostgreSQL, Qdrant, Redis, and object-storage adapters
- Authentication, organizations, roles, and capability tokens
- Encryption and secret management
- MCP client and server registry
- Sandboxed code and tool execution
- Queue recovery and idempotency
- OpenTelemetry traces and dashboards
- Evaluation datasets and regression gates
- Backup, restore, migration, and disaster recovery
- Threat modeling and independent security review

## Release rule

A phase is complete only when its code, migration path, tests, domain evaluation suite, operational runbook, security review, and measurable exit requirement are complete. A persuasive interface or agent demonstration is not a production release.
