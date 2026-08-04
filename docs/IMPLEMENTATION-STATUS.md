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

## Implemented in 0.6 — Governed Customer Support

- Isolated support workspaces, customer references, products, tickets, and append-only events
- Versioned candidate, approved, rejected, and retired policies
- Policy effective-date and exact-version selection
- Versioned candidate and reviewed troubleshooting playbooks
- Deterministic category, priority, frustration, legal, security, privacy, and safety triage
- Explainable triage reasons and escalation queues
- Policy-version attachment to tickets
- Approved-playbook troubleshooting plans with expected signals and failure escalation
- Human handoff requests and acceptance records
- Approved-policy requirement for refunds, account changes, policy exceptions, and legal responses
- Explicit human authorization before privileged action completion
- Idempotent, record-only external completion with evidence and external references
- Evidence-required ticket resolution
- Deterministic support-quality scoring
- Repeated-failure clustering with stable signatures and ticket lineage
- PostgreSQL persistence and restart-persistence validation
- Governed Customer Support state supplied to Customer Support missions

## Implemented in 0.7 — Governed Biomedical Research and Development

- BIO-GENE-style biomedical workspaces and research programs
- Permanent eight-node maps for Input, Process, Output, Feedback, Incentives, Bottlenecks, Dependencies, and Failure Points
- Program-level scientific impact, commercial thesis, success criteria, termination criteria, next actions, and uncertainty records
- Evidence-source provenance hashes
- Study-design classification, retraction status, sample/model information, endpoints, findings, limitations, conflicts, controls, bias, and replication records
- Deterministic evidence-quality scores and confidence labels
- Review-gated scientific claims linked only to approved evidence
- Contradiction ledgers, plausible explanations, resolution requirements, and resolution states
- Disease, subtype, gene, protein, cell, tissue, pathway, mechanism, biomarker, target, intervention, delivery, manufacturing, regulatory, and market graph records
- Falsifiable hypotheses with assumptions, uncertainties, supporting and contradicting claims, translational potential, and commercial potential
- Review-gated computational, assay, preclinical, analytical, manufacturing-development, and translational development plans
- Explicit controls, endpoints, success criteria, failure criteria, required capabilities, quality systems, budgets, timelines, and risks
- University, HBCU, CRO, CDMO, core-facility, testing-laboratory, biobank, and consultancy partner records
- Laboratory capability, equipment, quality-system, biosafety, certification, data-return, IP-term, confidentiality, availability, pricing, and risk qualification
- Governed capability-review, NDA, RFI, RFQ, SOW, contract, authorization, professional-execution, result-receipt, verification, and closure lifecycle
- External-laboratory deliverables, raw-data requirements, chain of custody, budget ceiling, timeline, contract references, authorization scope, result references, and verification evidence
- Regulatory pathway, intended-use, agency, evidence, quality-system, ethics, risk, and milestone records
- Invention, inventorship, ownership, prior-art, differentiator, enablement-gap, disclosure, filing, licensing, and abandonment records
- Grant and government-contract opportunity, eligibility, strategic fit, partner, award, deadline, owner, and next-action records
- Manufacturing-readiness records for critical quality attributes, raw materials, analytical methods, process development, stability, packaging, technology transfer, cost assumptions, and scale-up risks
- Commercialization records for licensing, co-development, research tools, diagnostics, services, data, software, government contracts, product sales, acquisition, and spinout paths
- Separated recommendation, owner or principal-investigator decision, and verification gates
- Narrow hard stops for self-administration, actionable human dosing of untested interventions, oversight evasion, pathogen enhancement, fabricated evidence, autonomous wet-lab execution, and unauthorized laboratory commitments
- Normal professional research concepts, external synthesis planning, formulation, gene editing, nanoparticles, animal models, toxicology, manufacturing, and clinical translation are not categorically blocked
- In-memory and PostgreSQL persistence with append-only biomedical events
- Biomedical mission context containing approved evidence, claims, contradictions, hypotheses, external engagements, funding, IP, manufacturing, and commercialization state
- Integration and PostgreSQL restart-persistence tests

## Production work still required

- Authentication, organizations, roles, and capability tokens
- Per-node cryptographic identity, TLS, enrollment approval, and secret rotation
- Qdrant hybrid dense/sparse retrieval and learned reranking
- Encrypted object storage for original artifacts, raw scientific data, contracts, and laboratory reports
- Redis queue, leases, transactional capacity reservations, and distributed scheduling
- Model residency, warm-cache, load, unload, and spillover policies
- Live MCP server discovery and governed invocation
- Sandboxed code, SQL, and privileged infrastructure execution
- Platform-specific service, container, GPU, temperature, swap, and network collectors
- Automated rollback and postcondition verification
- Real backup restore adapters
- Governed business connectors for accounting, CRM, calendar, contracts, grants, and procurement
- Governed content connectors for research, asset storage, platform analytics, and approved publishing
- Governed customer-support connectors for help desks, CRM, identity, billing, and product telemetry
- Approved message-delivery and customer-account mutation adapters
- PII encryption, field-level access control, retention enforcement, and deletion workflows
- Literature, patent, clinical-trial, regulatory, grant, laboratory, CRO, CDMO, market, LIMS, ELN, QMS, sample-registry, and manufacturing connectors
- Encrypted chain-of-custody and scientific-asset management
- Contract-document review, approved outbound communications, and electronic-signature integrations
- Independent scientific, legal, regulatory, biosafety, ethics, quality, security, and IP review procedures
- Domain-specific production evaluation suites
- Cross-domain approved-artifact bridge
- High availability, worker failover, and disaster recovery

## Explicitly unsupported in the current release

- Self-administration or self-experimentation workflows for untested biomedical interventions
- Actionable human dosing schedules for untested interventions
- Evasion of required regulatory, ethics, biosafety, quality, or institutional oversight
- Pathogen enhancement or increased virulence/transmissibility work
- Fabricated scientific sources, results, raw data, certificates, quotations, metrics, financial representations, or customer evidence
- Autonomous wet-lab execution by J.A.R.V.I.S
- Laboratory contracts, financial commitments, or external execution without proper authority
- Arbitrary shell execution
- Autonomous destructive infrastructure changes
- Unauthorized spending, contract acceptance, or ownership transfer
- Direct customer-account or refund mutations
- Automated customer communication, legal admissions, or policy waivers
- Automated publication or paid promotion
- Claims of production security, regulatory compliance, clinical authorization, or benchmark superiority without independent evidence
