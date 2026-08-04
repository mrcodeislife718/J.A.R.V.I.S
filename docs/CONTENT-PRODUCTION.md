# Governed Content Production

J.A.R.V.I.S v0.5 adds an evidence-aware content pipeline that separates research, drafting, review, publication approval, external publication, and performance learning.

## Governed records

The Content Production domain stores:

- Brand voice, prohibited claims, required disclosures, and approved platforms
- Candidate, approved, and rejected sources
- Source credibility, rights, locators, and supported claims
- Candidate and approved content briefs
- Drafts with claim-level source checks
- Human review outcomes and review notes
- Publication plans and approvals
- Manual records of externally completed publication
- Performance observations and deterministic rates
- Content experiments with evidence-backed conclusions
- Append-only content events

## Evidence boundary

A source is not reusable until reviewed. Draft claim checks record the supporting source and locator. A draft cannot be approved while a claim remains unsupported or disputed.

The service also checks:

- Brand-prohibited language
- Brief-prohibited language
- Required messages
- Required disclosures
- Platform allow-lists
- Character limits
- Source and brand isolation

## Publication boundary

J.A.R.V.I.S does not publish automatically in v0.5.

The lifecycle is:

```text
approved draft -> planned publication -> human approval -> external publication -> recorded result
```

The `record-publication` operation records an action completed outside the platform. It does not hold social-account credentials or call a publishing API.

## Performance learning

Performance records preserve raw observations and calculate:

- Click-through rate
- Engagement rate
- Conversion rate
- Cost per conversion

The system validates basic count consistency and does not turn correlation into causal proof. Experiments require at least two approved variants and evidence before a conclusion can be stored.

## Persistence

Set `CONTENT_STORAGE_DRIVER=postgres` and run `npm run migrate` to persist content entities and events in PostgreSQL.

## Current boundary

The domain does not scrape restricted sources, reproduce unlicensed works, fabricate quotations, impersonate people, disclose confidential data, purchase advertising, or publish without human authorization.
