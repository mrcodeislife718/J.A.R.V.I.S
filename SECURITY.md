# Security Policy

## Security model

J.A.R.V.I.S assumes models, retrieved content, tool output, user input, node telemetry, and cross-domain artifacts may be incorrect or adversarial. Trust is granted to verified records and narrowly scoped capabilities, not to natural-language confidence.

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

## Biomedical safety

The biomedical domain is research-support software. It must not autonomously order materials, synthesize biological agents, provide actionable human dosing, perform clinical work, initiate human experimentation, enhance pathogens, or transfer unreviewed plans into laboratory execution.

A future experimental-design feature must require qualified-expert review, biological-risk classification, source-level evidence, uncertainty labels, and institutional controls before any operational handoff.

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

Retrieved documents, telemetry fields, service metadata, model responses, and tool output are data, not instructions. Context compilation must preserve their source and prevent them from changing system policy, permissions, mission scope, or authorization state.

Node labels, hostnames, service names, metadata, and error text must be treated as untrusted input when rendered into prompts, logs, dashboards, or commands.

## Secrets

Never commit credentials. Store secrets in an operating-system keyring, secret manager, or environment injection system. Models should receive opaque capability tokens instead of raw credentials whenever possible.

Do not use the development agent token in production. Do not place database passwords, node credentials, private keys, API keys, or privileged command tokens into model-visible mission context.

## Reporting a vulnerability

Do not open a public issue containing exploit details, credentials, personal data, or biomedical misuse instructions. Contact the repository owner privately and include:

- Affected component and version
- Reproduction conditions
- Impact
- Suggested mitigation, when known

## Unsupported security claims

The current implementation is not certified for regulated clinical data, production customer data, hostile networks, autonomous production administration, or other high-consequence environments. It has not received independent penetration testing, formal verification, or compliance certification. Security and compliance claims require deployment-specific testing and independent review.
