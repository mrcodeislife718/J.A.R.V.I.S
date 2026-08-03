# Domain Boundaries

J.A.R.V.I.S contains one governed core and seven isolated operating domains. Sharing orchestration code does not grant one domain access to another domain's private data, credentials, or tools.

## Isolation contract

Every domain receives a dedicated:

- Database schema
- Vector collection
- Knowledge-graph partition
- Object-storage prefix
- Credential set
- Tool allow-list
- Policy bundle
- Evaluation suite
- Audit partition
- Retention schedule
- Human approval policy

The bootstrap implementation enforces capability and memory-namespace separation in code. Persistent infrastructure separation is a production milestone.

## Biomedical Research

Permitted purpose: evidence organization, mechanism comparison, research-question development, supplied-data analysis, IP mapping, and translational planning for qualified researchers.

Hard boundaries:

- No autonomous ordering or purchasing
- No autonomous synthesis
- No actionable human dosing or administration
- No clinical use
- No human experimentation
- No pathogen-enhancement assistance
- No unreviewed transfer into wet-lab execution

Cancer subtypes, HIV, and nanotechnology must receive separate graph partitions and evaluation suites beneath the biomedical control layer.

## Business Operations

Permitted purpose: planning, decision intelligence, SOPs, scenarios, risk mapping, reporting, and coordination.

Hard boundaries:

- Recommendation is not decision.
- Decision is not authorization.
- Authorization is not execution.
- Execution is not verification.
- The authorized owner retains final authority for consequential actions.

## Personal Knowledge Management

Permitted purpose: project continuity, authorship separation, concept connection, timelines, gaps, review plans, and exact-state resumption.

Hard boundaries:

- Assistant-generated claims cannot be silently attributed to the user.
- Project contexts cannot be merged merely because concepts overlap.
- Long-term memory requires review and promotion.
- Corrections and reasons for changes must remain visible.

## Customer Support

Permitted purpose: classification, policy retrieval, troubleshooting, escalation, anonymized product feedback, and quality analysis.

Hard boundaries:

- No unauthorized refund, credit, or account mutation
- No policy exceptions without approval
- No legal admission
- No unnecessary exposure of customer data
- Only verified resolutions may enter reusable support memory

## Analytics

Permitted purpose: schema inspection, read-only query generation, data-quality analysis, metrics, anomaly detection, forecasting, and lineage.

Hard boundaries:

- Read-only by default
- No fabricated data or hidden transformations
- No causal claims without an appropriate design
- No destructive production query without explicit authorization and postcondition controls
- Every material conclusion requires reproducible lineage

## Infrastructure Administration

Permitted purpose: inventory, monitoring, diagnosis, routing, backup verification, patch planning, and incident reconstruction.

Hard boundaries:

- No deletion, wipe, credential rotation, firewall change, production deployment, backup mutation, or shutdown without explicit authorization
- Shell execution must be allow-listed and sandboxed
- Consequential operations require rollback points and postcondition verification

## Content Production

Permitted purpose: research, strategy, drafting, repurposing, fact checking, performance analysis, and calendar preparation.

Hard boundaries:

- No invented sources or quotations
- No use of confidential research without an approved transfer artifact
- No autonomous publication
- No private-data disclosure or impersonation

## Controlled bridges

Domains exchange approved artifacts, never unrestricted raw memory.

```text
Biomedical Research
  -> approved, de-risked research summary
  -> Content Production

Customer Support
  -> anonymized recurring-problem report
  -> Analytics

Analytics
  -> verified operational recommendation
  -> Business Operations

Infrastructure Administration
  -> sanitized availability and capacity metrics
  -> Analytics
```

Every bridge record must contain:

- Source domain
- Destination domain
- Artifact type and version
- Provenance
- Privacy classification
- Approval identity and time
- Permitted use
- Expiration or retention rule

A destination domain receives only the approved artifact, not access to the source domain's underlying store.
