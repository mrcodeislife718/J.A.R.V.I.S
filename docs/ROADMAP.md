# J.A.R.V.I.S Roadmap

The roadmap expands one governed core rather than creating seven unrelated stacks.

## Phase 1 — Governed core foundation

Status: implemented in version 0.1 bootstrap.

- Mission contracts and compiler
- Domain and capability registries
- Risk assessment
- Human authorization gate
- Context compilation contract
- Ollama adapter and model routing
- Serial scheduler
- Verification plane
- Governed memory candidates
- Tool gateway contract
- Audit and telemetry
- API, tests, container, and documentation

Exit requirement: CI passes and every domain can submit a bounded mission through the same lifecycle.

## Phase 2 — Personal Knowledge Management

- PostgreSQL persistence
- Original-document storage
- Conversation and archive ingestion
- User-versus-assistant authorship attribution
- Project timelines and decision records
- Contradiction, correction, supersession, and memory decay rules
- Project-scoped hybrid retrieval
- Exact-state resumption
- Daily and weekly review jobs

Exit requirement: a project can be resumed from approved state with traceable decisions and no cross-project contamination.

## Phase 3 — Infrastructure Administration

- Node enrollment and capability inventory
- CPU, RAM, GPU, swap, disk, temperature, model, and service metrics
- Queue leases and backpressure
- Workload routing across machines
- Model residency and unload policies
- Safe read-only diagnostics
- Backup verification
- Approval-bound recovery playbooks
- Rollback and postcondition verification

Exit requirement: the control layer can schedule and observe work across nodes and safely recover from a failed worker.

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
