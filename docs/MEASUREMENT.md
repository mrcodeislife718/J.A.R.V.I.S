# Measurement and Claims Standard

J.A.R.V.I.S does not treat agent count, context-window size, or an isolated token-reduction percentage as proof of system quality.

## Primary success metric

A mission succeeds only when it produces the required artifact, remains within policy and resource constraints, and passes the applicable verification checks.

## Required benchmark dimensions

Every architecture or optimization comparison must record:

- Task-success rate
- Verification pass rate
- Factual precision and citation correctness where applicable
- Retrieval recall and ranking quality where applicable
- Test pass rate for code and deterministic artifacts
- Hallucination or unsupported-claim rate
- Tool-call failure and retry rate
- Peak memory and swap use
- Input, output, and total processed tokens
- Time to first token
- End-to-end mission latency
- Throughput under defined concurrency
- Recovery after model, tool, database, or node failure
- Monetary API cost
- Local energy use when measurable

## Token accounting

Total processed tokens must include:

- System and capability prompts
- Mission context
- Retrieved evidence
- Model outputs
- Agent or capability handoffs
- Summarization and compression calls
- Verification calls
- Retries and failed attempts
- Tool results reintroduced into model context

A token-reduction claim uses:

```text
token reduction = 1 - optimized total processed tokens / baseline total processed tokens
```

The baseline, task set, models, quantization, context settings, hardware, concurrency, and quality threshold must be published with the result.

## Non-inferiority requirement

Efficiency claims must show that the optimized system remains within a predeclared quality margin relative to the baseline. “Same answer” is insufficient because two fluent answers may differ in grounding, completeness, policy compliance, and hidden failure rate.

## Required ablations

At minimum, benchmark:

1. Full-context baseline
2. Vector retrieval only
3. Hybrid retrieval
4. Hybrid retrieval plus reranking
5. Context compiler
6. Context compiler plus adaptive model routing
7. Full governed system with verification and memory gate

This identifies which component actually creates the improvement.

## Domain evaluation suites

Each domain requires its own tests:

- Biomedical: evidence entailment, retraction awareness, study quality, uncertainty, subtype separation, safety boundaries
- Business: constraint coverage, financial reproducibility, decision-authority separation, dependency tracking
- Personal knowledge: authorship attribution, correction retention, project isolation, exact-state resumption
- Customer support: policy grounding, escalation accuracy, resolution quality, privacy preservation
- Analytics: query validity, lineage, data quality, statistical calibration, forecast backtesting
- Infrastructure: diagnosis accuracy, safe-plan quality, rollback completeness, postcondition checks
- Content: factual accuracy, originality, platform compliance, voice consistency, commercial purpose

## Publication rule

No public performance claim should be made until the benchmark data, methodology, and failure cases are stored as a versioned evaluation artifact. Negative results and regressions remain part of the audit history.
