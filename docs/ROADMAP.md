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

Current exit result: the control layer can register, observe, compare, and select worker nodes, retain incidents and backups, and prevent operational actions from executing without scoped approval.

## Phase 4 — Governed Analytics

Status: persistent governed foundation implemented in version 0.4.

Implemented:

- Governed data-source registry
- Versioned schema snapshots
- Conservative read-only SQL generation and validation
- Reviewed metric-definition registry
- Deterministic metric calculation
- Data-quality checks and dataset profiles
- Reproducible lineage
- Forecast evaluation and baseline comparison
- Reviewed reports
- PostgreSQL persistence and restart validation

Current exit result: governed calculations preserve their definitions, inputs, transformations, evidence, and lineage. Live production connectors remain separate work.

## Phase 5 — Business Operations and Content Production

Status: persistent governed foundations implemented in version 0.5.

Business Operations implemented:

- Project, milestone, owner, dependency, bottleneck, success-criterion, and deadline records
- Recommendation, decision, authorization, execution, and verification stages
- Financial scenario engine
- SOP management
- Risk and meeting records
- Weekly operating reports

Content Production implemented:

- Source and research evidence packages
- Voice and brand profiles
- Platform constraint validators
- Brief, draft, fact-check, approval, publication-plan, and record-only completion workflows
- Performance feedback without causal overclaiming

Current exit result: both domains create persistent, measurable operating records while remaining isolated from confidential domains.

## Phase 6 — Governed Customer Support

Status: persistent governed foundation implemented in version 0.6.

Implemented:

- Workspaces, customer references, products, policies, playbooks, tickets, and event histories
- Policy-version and effective-date governance
- Deterministic classification, frustration, risk, priority, and queue assignment
- Human escalation and handoffs
- Approval-gated refunds, account changes, policy exceptions, and legal responses
- Record-only external completion
- Evidence-required resolution
- Quality scoring and repeated-failure clustering
- PostgreSQL persistence and mission context

Current exit result: J.A.R.V.I.S can govern support reasoning and privileged-action records without silently mutating customer systems.

## Phase 7 — Governed Biomedical Research and Development

Status: persistent governed foundation implemented in version 0.7.

Implemented:

- BIO-GENE-style workspaces, portfolios, and research programs
- Permanent eight-node research maps
- Evidence provenance, retraction, quality, bias, controls, replication, limitations, and confidence records
- Review-gated claims, contradictions, hypotheses, and development plans
- Biomedical knowledge and evidence graphs
- External laboratory qualification
- NDA, RFI, RFQ, SOW, contract, authorization, professional-execution, raw-data-return, verification, and closure records
- Regulatory pathway maps
- IP portfolios and invention disclosures
- Grant and government-contract opportunity records
- Manufacturing-readiness plans
- Licensing, co-development, research-tool, diagnostic, service, data, software, government, product, acquisition, and spinout commercialization plans
- Recommendation, owner or principal-investigator decision, and verification gates
- PostgreSQL persistence, mission context, integration tests, and restart-persistence tests

Current exit result: the system separates evidence, inference, hypothesis, contradiction, recommendation, decision, professional external execution, returned evidence, and verification while supporting a full scientific and commercial development workforce.

Remaining biomedical production work:

- Primary-source literature, patent, trial, grant, regulatory, laboratory, CRO, CDMO, and market connectors
- Secure source-document, raw-data, contract, and report storage
- LIMS, ELN, QMS, sample-registry, chain-of-custody, and manufacturing integrations
- Formal scientific, IP, legal, regulatory, biosafety, ethics, and quality review procedures
- Qualified-partner identity, approved communications, document workflow, and electronic signatures
- Disease-specific evaluation suites and graph partitions
- Reproducibility and translational-readiness benchmarking

## Phase 8 — Production identity, connectors, and approved artifact bridges

Planned next foundation:

- Organizations, users, roles, service identities, and capability tokens
- Encrypted secrets and document storage
- Approved connector registry and MCP invocation
- Cross-domain approved-artifact transfers
- Redis-backed mission queues and durable workers
- Production observability, evaluation gates, backup, restore, and disaster recovery
- Deployment profiles for trusted local networks, private clusters, and regulated partner environments

Exit requirement: every external connection and cross-domain transfer is authenticated, scoped, auditable, revocable, and independently testable.

## Cross-cutting production work

- PostgreSQL, Qdrant, Redis, and object-storage hardening
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

A phase foundation is merged only when its code, migration path, tests, domain evaluation coverage, documentation, and explicit boundaries pass CI. Production certification additionally requires deployment-specific controls, operational runbooks, independent review, and measurable exit validation. A persuasive interface or agent demonstration is not sufficient.
