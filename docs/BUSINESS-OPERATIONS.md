# Governed Business Operations

J.A.R.V.I.S v0.5 adds a persistent operating system for company execution without transferring final authority from the owner to a model.

## Operating records

The Business Operations domain stores:

- Organizations and owner authority
- Projects, milestones, dependencies, bottlenecks, and success criteria
- Decisions with explicit recommendation, decision, authorization, execution, and verification stages
- Candidate and approved standard operating procedures
- Deterministic financial scenarios and their assumptions
- Risks, triggers, mitigations, contingencies, and scores
- Meeting records and assigned actions
- Reproducible weekly operating reports
- Append-only business events

## Authority boundary

A model-generated recommendation is not a decision. A decision is not authorization. Authorization is not execution. Execution is not verification.

The transition sequence is enforced:

```text
recommendation -> decision -> authorized -> executing -> verified
```

A decision may also be rejected. Final decisions cannot silently transition again.

## Financial scenarios

Financial scenarios preserve the exact inputs used for calculations:

- Revenue
- Variable-cost rate
- Fixed costs
- Cash on hand

The service deterministically calculates variable costs, contribution margin, operating profit, monthly burn, runway, and break-even revenue. Scenarios are decision support, not accounting statements, financing commitments, or guarantees.

## Weekly reports

Weekly reports are generated from stored operating records and disclose:

- Project totals and blocked work
- Open decisions
- Overdue milestones
- Highest-scoring open risks
- Recent financial scenarios
- Unresolved meeting actions

The report stores evidence references to the underlying records.

## Persistence

Set `BUSINESS_STORAGE_DRIVER=postgres` and run `npm run migrate` to persist business entities and events in PostgreSQL.

## Current boundary

The domain does not sign contracts, transfer money, hire or terminate staff, accept legal obligations, submit external documents, or modify production systems. Those capabilities require separate governed adapters and explicit scoped authorization.
