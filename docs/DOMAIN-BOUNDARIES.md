# Domain Boundaries

J.A.R.V.I.S contains one governed core and seven isolated operating domains. Sharing orchestration code does not grant one domain access to another domain's private data, credentials, or tools.

## Isolation contract

Every domain receives a dedicated:

- Database schema or authoritative table partition
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

The current implementation enforces capability, repository, mission-context, and memory-namespace separation in code. Strong production identity, encryption, credential, vector, graph, and object-storage isolation remain production milestones.

## Biomedical Research and Development

Permitted purpose: full governed scientific and commercial development support for independent scientists, research companies, universities, HBCUs, laboratories, CROs, CDMOs, and other qualified partners.

Permitted functions include:

- Scientific, patent, clinical-trial, regulatory, laboratory, grant, market, and competitor intelligence
- Disease, subtype, target, pathway, mechanism, biomarker, intervention, delivery, manufacturing, regulatory, and market graph development
- Evidence-quality, retraction, bias, control, replication, limitation, contradiction, and uncertainty analysis
- Falsifiable hypothesis and development-plan preparation
- Formulation, delivery, synthesis-option, gene-editing, nanoparticle, toxicology, manufacturing, and clinical-translation analysis in a professional research context
- Laboratory qualification and matching
- NDA, RFI, RFQ, SOW, contract-reference, deliverable, raw-data, chain-of-custody, and result-verification coordination
- IP, inventorship, ownership, prior-art, enablement, disclosure, filing, licensing, and technology-transfer planning
- Grant, government-contract, partner, budget, manufacturing, commercialization, and revenue strategy

Authority model:

```text
scientific analysis or recommendation
  -> owner or principal-investigator decision
  -> bounded authorization
  -> qualified professional external execution
  -> raw data and result package returned
  -> independent verification
  -> advancement, iteration, pivot, licensing, partnership, or termination
```

Hard boundaries:

- No self-administration or self-experimentation workflow for an untested intervention
- No actionable human dosing schedule for an untested intervention
- No evasion of required ethics, regulatory, biosafety, quality, or institutional oversight
- No pathogen enhancement or increased virulence/transmissibility work
- No fabricated evidence, raw data, certificates, laboratory reports, or provenance
- No autonomous wet-lab execution by J.A.R.V.I.S
- No external laboratory commitment, contract, or financial authorization without proper owner, principal-investigator, or authorized-executive authority

Normal scientific words and development categories are not themselves prohibited. Context, authority, evidence, and execution controls determine whether a workflow is permitted.

Disease areas and technologies may receive dedicated workspaces, programs, graph partitions, policies, partner scopes, and evaluation suites beneath the shared biomedical control layer.

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
Biomedical Research and Development
  -> approved research, IP, funding, regulatory, manufacturing, or commercialization artifact
  -> Business Operations, Analytics, Content Production, or Personal Knowledge

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
- Privacy and confidentiality classification
- Approval identity and time
- Permitted use
- Expiration or retention rule

A destination domain receives only the approved artifact, not access to the source domain's underlying store. The approved-artifact bridge itself remains a production milestone unless a specific transfer contract is already implemented and tested.
