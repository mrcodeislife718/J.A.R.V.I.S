# Security Policy

## Security model

J.A.R.V.I.S assumes models, retrieved content, tool output, user input, and cross-domain artifacts may be incorrect or adversarial. Trust is granted to verified records and narrowly scoped capabilities, not to natural-language confidence.

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

Destructive or production-changing actions require explicit scoped authorization. Production adapters must support:

- Command allow-lists
- Read-only defaults
- Sandboxes
- Dry runs
- Idempotency keys
- Rollback points
- Circuit breakers
- Postcondition verification
- Credential redaction
- Full command and result audit

## Prompt injection and tool output

Retrieved documents and tool output are data, not instructions. Production context compilation must mark their source and prevent them from changing system policy, permissions, mission scope, or authorization state.

## Secrets

Never commit credentials. Store secrets in an operating-system keyring, secret manager, or environment injection system. Models should receive opaque capability tokens instead of raw credentials whenever possible.

## Reporting a vulnerability

Do not open a public issue containing exploit details, credentials, personal data, or biomedical misuse instructions. Contact the repository owner privately and include:

- Affected component and version
- Reproduction conditions
- Impact
- Suggested mitigation, when known

## Unsupported security claims

The bootstrap implementation is not yet certified for regulated clinical data, production customer data, autonomous production administration, or other high-consequence environments. Security and compliance claims require deployment-specific testing and independent review.
