# Contributing to J.A.R.V.I.S

## Development rule

Changes must strengthen verified mission success, domain isolation, evidence integrity, resource efficiency, or operational reliability. Adding more agents without a measured need is not an architectural improvement.

## Before opening a change

1. Identify the affected domain and capability.
2. State the mission failure or missing capability being addressed.
3. Define the required permissions and side effects.
4. Add deterministic checks where possible.
5. Add or update tests.
6. Record new security, privacy, biomedical, or operational risks.
7. Update architecture and evaluation documentation when contracts change.

## Local verification

```bash
npm install
npm run check
```

## Pull-request expectations

A pull request should include:

- Problem and intended outcome
- Architectural impact
- Domain boundary impact
- Test evidence
- Failure and rollback behavior
- New configuration or migration requirements
- Benchmark evidence for performance claims

## Prohibited contribution patterns

- Credentials or personal data committed to the repository
- Silent cross-domain access
- Unreviewed long-term memory writes
- Tool execution that bypasses authorization
- Fabricated benchmark or evidence claims
- Biomedical human-use, dosing, autonomous synthesis, or pathogen-enhancement features
- Destructive infrastructure behavior without explicit approval, rollback, and postcondition verification
