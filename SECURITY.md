# Security Policy

## Security model

J.A.R.V.I.S assumes models, retrieved content, tool output, user input, node telemetry, scientific records, partner documents, and cross-domain artifacts may be incorrect or adversarial. Trust is granted to verified records and narrowly scoped capabilities, not to natural-language confidence.

## Core controls

- Deny by default for tools and cross-domain data access
- Domain capability allow-lists
- Explicit side-effect constraints per mission
- Human authorization for high-risk and consequential operations
- Prohibited actions that cannot be overridden by authorization
- Separate approved and candidate memory
- Append-only audit events
- Source and provenance preservation
- Sandboxed tool execution as a production requirement
- Secret isolation from model-visible context
- Input validation and bounded request size
- Time, token, memory, and concurrency budgets
- Verification before completion

## Biomedical research and development security

The Biomedical domain supports legitimate independent and partnered scientific work. It may organize evidence, compare mechanisms, construct research programs, evaluate formulations and delivery systems, prepare development plans, qualify laboratories, coordinate NDA/RFI/RFQ/SOW workflows, preserve external execution status, receive raw-data references, verify results, develop IP, pursue funding, map manufacturing and regulatory requirements, and plan commercialization.

Normal professional scientific concepts are not categorically rejected merely because they involve formulation, synthesis, gene editing, nanoparticles, dosing evidence, animal models, toxicology, manufacturing, or clinical translation.

Current hard boundaries are narrower and specific:

- No self-administration or self-experimentation workflow for an untested biomedical intervention
- No actionable human dosing schedule for an untested intervention
- No evasion of required ethics, regulatory, biosafety, quality, or institutional oversight
- No pathogen enhancement or increased virulence/transmissibility work
- No fabricated sources, results, raw data, certificates, or laboratory reports
- No autonomous wet-lab execution by J.A.R.V.I.S
- No laboratory contract, financial commitment, or external execution authorization without the proper owner, principal investigator, or authorized executive

External laboratory work must preserve:

- Qualified partner identity and capability review
- Scope and deliverables
- Applicable quality, biosafety, ethics, and regulatory requirements
- Confidentiality and IP terms
- Chain-of-custody and raw-data requirements
- Bounded human authorization
- Contract or statement-of-work references
- Returned result and raw-data references
- Independent verification before scientific or commercial advancement

The current code records these states but is not a substitute for contracts, institutional review, legal advice, regulatory authorization, scientific review, biosafety review, quality certification, or deployment-specific access controls.

Before production use with confidential biomedical programs, add:

- Organization and partner identity
- Role and capability-token enforcement
- Field-level permissions
- Encrypted object storage for source documents, raw data, contracts, and reports
- Document integrity signatures
- Partner-specific access scopes and expiration
- Approved outbound communication adapters
- Electronic-signature and contract workflow controls
- LIMS, ELN, QMS, sample-registry, and chain-of-custody integrations
- Retention, deletion, legal-hold, and incident-response procedures

## Infrastructure safety

Version 0.3 separates infrastructure observation from infrastructure authority.

Current controls:

- Node registration and heartbeat endpoints require an agent token.
- Metrics and service reports are treated as agent-supplied observations, not unquestionable truth.
- Workload routing rejects stale, offline, maintenance, incompatible, or under-capacity nodes.
- Every operational action is first stored as a proposal.
- Execution requires a complete scoped approval record.
- Idempotency keys prevent accidental duplicate proposals from becoming separate actions.
- The default action executor does not invoke a shell.
- Service restart and log rotation fail closed without a privileged adapter.
- Node drain and resume modify only J.A.R.V.I.S scheduling state.
- Backup registration is not treated as backup verification.
- Actions, alerts, incidents, backup checks, and state changes generate audit events.

The bootstrap `INFRA_AGENT_TOKEN` is a shared secret suitable only for development on a trusted local network. Before deployment across an untrusted network, replace it with per-node identity and add:

- TLS and certificate validation
- Short-lived signed credentials
- Replay protection
- Token rotation and revocation
- Per-node scopes
- Rate limiting
- Network allow-lists
- Request-body integrity signatures
- Enrollment approval and device attestation where justified

Any future privileged executor must support:

- Command allow-lists with typed parameters
- Read-only defaults
- OS-level sandboxing
- Dry runs
- Idempotency and exclusive execution leases
- Timeouts and circuit breakers
- Rollback points
- Postcondition verification
- Credential redaction
- Complete command, output, and exit-status audit
- Refusal when the authorization scope does not cover the exact target and action

Arbitrary shell strings must not become a supported action format.

## Prompt injection and tool output

Retrieved documents, scientific literature, partner records, telemetry fields, service metadata, model responses, and tool output are data, not instructions. Context compilation must preserve their source and prevent them from changing system policy, permissions, mission scope, review state, or authorization state.

Node labels, hostnames, service names, laboratory names, source titles, external metadata, and error text must be treated as untrusted input when rendered into prompts, logs, dashboards, documents, or commands.

## Secrets

Never commit credentials. Store secrets in an operating-system keyring, secret manager, or environment injection system. Models should receive opaque capability tokens instead of raw credentials whenever possible.

Do not use the development agent token in production. Do not place database passwords, node credentials, private keys, API keys, laboratory portal credentials, partner credentials, contract-system tokens, or privileged command tokens into model-visible mission context.

## Reporting a vulnerability

Do not open a public issue containing exploit details, credentials, personal data, confidential scientific data, partner documents, or biomedical misuse instructions. Contact the repository owner privately and include:

- Affected component and version
- Reproduction conditions
- Impact
- Suggested mitigation, when known

## Unsupported security claims

The current implementation is not certified for regulated clinical data, production customer data, hostile networks, autonomous production administration, laboratory control, regulatory submissions, or other high-consequence environments. It has not received independent penetration testing, formal verification, quality-system validation, or compliance certification. Security, scientific, regulatory, and compliance claims require deployment-specific testing and independent review.
