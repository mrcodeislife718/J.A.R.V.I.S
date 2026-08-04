# Governed Customer Support

J.A.R.V.I.S v0.6 adds a persistent customer-support operating system that separates policy retrieval, diagnosis, recommendations, approvals, external account actions, and verified outcomes.

## Governed records

The Customer Support domain stores:

- Isolated support workspaces
- Customer references with minimized profile data and consent state
- Products, versions, owner teams, channels, and known-issue references
- Versioned candidate, approved, rejected, and retired policies
- Versioned troubleshooting playbooks
- Tickets, messages, deterministic triage, and queues
- Frustration, safety, security, privacy, and legal escalation signals
- Human handoffs
- Proposed, approved, rejected, and externally completed support actions
- Resolution evidence
- Quality reviews
- Repeated-failure clusters
- Append-only support events

## Policy boundary

Candidate policies and playbooks are not available for operational use. A human reviewer must approve them first. Policy selection also checks the effective date range and keeps the exact version and source reference.

A ticket can attach the approved policies that were active when it was handled. This prevents an updated policy from silently rewriting the historical decision basis.

## Triage and escalation

Triage is deterministic and records its reasons. It evaluates:

- Ticket category
- Priority
- Frustration signals
- Repeated customer contact
- Legal risk
- Security risk
- Safety risk
- Required queue
- Whether human escalation is mandatory

The rules are intentionally explainable. A model may assist with interpretation, but the stored triage result remains reviewable and reproducible.

## Troubleshooting boundary

Troubleshooting plans can only be generated from approved playbooks that match the ticket category and product. Every step includes an expected signal and may define a failure escalation path.

A troubleshooting plan does not authorize arbitrary code execution, device access, credential collection, or customer-account mutation.

## Privileged actions

The following actions are privileged:

- Refunds
- Account changes
- Policy exceptions
- Legal responses

They require:

1. An approved governing policy that authorizes the action kind.
2. A precise requested scope.
3. Explicit human approval.
4. An external completion reference.
5. Completion evidence.

J.A.R.V.I.S v0.6 does not execute refunds or mutate customer accounts. It records that an authorized person or external system completed the action.

```text
proposed action
  -> approved or rejected by a human
  -> completed outside J.A.R.V.I.S
  -> completion reference and evidence recorded
  -> ticket resolution verified
```

## Quality and product feedback

Quality reviews deterministically calculate an overall score from:

- Policy accuracy
- Diagnosis quality
- Communication quality
- Escalation quality
- Evidence quality

Repeated tickets with the same normalized failure signature are grouped into a failure cluster. Clusters preserve ticket IDs, first and last observation times, occurrence count, severity, and product ownership. They are signals for investigation, not automatic proof of root cause.

## Persistence

Set `SUPPORT_STORAGE_DRIVER=postgres` and run `npm run migrate` to persist support entities and append-only events in PostgreSQL.

## Current boundary

The domain does not send customer messages, issue refunds, alter accounts, make legal admissions, waive policy, expose customer secrets, or claim compliance certification. Production identity, role-based access, PII encryption, retention enforcement, CRM and help-desk connectors, and approved mutation adapters remain future work.
