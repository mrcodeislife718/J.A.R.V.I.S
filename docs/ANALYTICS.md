# Governed Analytics

## Purpose

J.A.R.V.I.S Analytics turns registered data, approved metric definitions, deterministic checks, and traceable transformations into reproducible decision support. It does not treat a generated chart, SQL statement, or model forecast as proof.

Version 0.4 adds a durable analytics control plane while preserving a strict read-only default.

## Operating flow

```text
Register source
  -> record sensitivity and access requirement
  -> preserve an opaque credential reference
  -> ingest a schema snapshot
  -> define candidate metrics and quality rules
  -> review and approve metrics
  -> validate read-only SQL or calculate structured metrics
  -> record result hashes and lineage
  -> evaluate quality and forecast performance
  -> compile approved analytics state into missions
```

## Data-source registry

A source record stores:

- Stable source ID
- Source type
- Owner
- Sensitivity classification
- Whether explicit access approval is required
- Human-readable endpoint label
- Opaque credential reference
- Tags and non-secret metadata
- Active or disabled state

The API does not accept a connection string as `credentialRef`. That field is intended to contain a secret-manager key, environment-variable name, or another opaque reference. Models do not receive the credential reference in mission context.

Supported source classes are PostgreSQL, spreadsheets, CSV, JSON, APIs, event streams, and manually supplied datasets. Version 0.4 registers these sources but does not pretend that every connector is already installed.

## Schema snapshots

Schema snapshots are immutable observations linked to a source. Each snapshot includes:

- Version number
- SHA-256 fingerprint
- Tables, views, files, streams, sheets, or collections
- Column names and types
- Nullability and primary-key flags
- Estimated row counts when known
- Observer and observation time

A new observation creates a new version. It does not silently overwrite the previous schema.

## Read-only SQL governance

The SQL validator accepts one `SELECT` or read-only `WITH` statement. It rejects:

- INSERT, UPDATE, DELETE, MERGE, and UPSERT
- CREATE, ALTER, DROP, TRUNCATE, and schema mutation
- GRANT, REVOKE, and role changes
- COPY, VACUUM, ANALYZE, CLUSTER, REINDEX, and refresh operations
- Procedures, session-control statements, and dangerous database functions
- SELECT INTO
- Row-locking clauses
- Multiple statements
- Data-modifying common-table expressions

The validator also reports referenced relations, positional parameters, and warnings such as `SELECT *`, missing `LIMIT`, missing `ORDER BY`, and `CROSS JOIN`.

Validation is not execution. The default query executor refuses all live external queries. A deployment must inject a separately reviewed, read-only executor that resolves approved credential references outside model-visible context, enforces timeouts and row limits, and uses database permissions that cannot write.

For sensitive sources, query execution also requires a named authorization record.

## Governed metrics

Metric definitions begin as candidates. They cannot be calculated or included in an approved report until reviewed.

A definition stores:

- Source and dataset
- Name, description, owner, unit, and grain
- Dimensions and exact filters
- Structured calculation
- Version and review state
- Approver and review reason

The first structured calculations are:

- Row or non-null count
- Distinct count
- Sum
- Average
- Minimum
- Maximum
- Ratio of summed numerator and denominator columns

Metric observations preserve the input hash, filtered row count, dimensions, computed value, operator, and time. The input rows themselves are not written to the observation record.

## Data quality

Quality rules are deterministic and dataset-scoped. Version 0.4 supports:

- Required values
- Uniqueness
- Numeric ranges
- Accepted values
- Timestamp freshness

Each run records the rule results, failure ratios, bounded examples, row count, input hash, operator, and pass/fail state. Passing a quality run means only that the configured rules passed; it does not prove that the dataset is complete or unbiased.

## Dataset profiles

A profile records:

- Row count
- Input hash
- Column names
- Null and non-null counts
- Distinct counts
- Numeric minimum, maximum, and mean
- A small bounded set of example values

Profiles are descriptive. They are not causal evidence and do not replace data-quality rules.

## Forecast evaluation

Forecast evaluation compares supplied predictions with observed values and a declared constant baseline. It records:

- MAE
- RMSE
- MAPE when actual values are nonzero
- Baseline MAE and RMSE
- Whether the candidate beats the baseline on RMSE
- Hashes of actual and predicted series
- Horizon, sample count, evaluator, and model name

A forecast that beats one baseline is not automatically production-ready. Deployment still requires leakage checks, time-aware validation, distribution-shift monitoring, calibration where relevant, and domain review.

## Lineage

Lineage edges connect sources, datasets, schemas, queries, metrics, quality runs, forecasts, and reports. Every edge records the transformation, evidence metadata, and creation time.

Examples:

```text
source -> schema
source -> query
source:relation -> query
source:dataset -> metric
source:dataset -> quality-run
source:dataset -> forecast
metric observation -> approved report snapshot
```

## Reports

Reports begin as candidates. Approval requires every referenced metric to be approved. A report snapshot returns the latest observation for each metric and explicitly lists missing metrics rather than filling gaps with invented values.

The schedule field is stored as governed metadata. Background recurring delivery is not yet implemented by version 0.4.

## Analytics mission context

When an analytics mission supplies `inputs.sourceId` or `inputs.metricId`, the context compiler can include:

- Sanitized source registry state
- Latest schema fingerprint and bounded table summaries
- Approved metric definitions
- Latest observations
- Recent quality runs
- Forecast comparisons
- Evidence references and missing-state warnings

Credentials, raw query results, and unrestricted source data are not injected into model context.

## Storage

Set:

```text
ANALYTICS_STORAGE_DRIVER=postgres
```

Then run:

```bash
npm run migrate
npm run dev
```

PostgreSQL stores source records, schema snapshots, metrics, observations, query-run metadata, rules, quality runs, profiles, lineage, forecast evaluations, and reports. Integration tests verify that governed analytics state survives a repository restart.

## Current boundaries

Version 0.4 does not yet provide:

- A built-in credential resolver or secret manager
- A production PostgreSQL, warehouse, spreadsheet, API, or event-stream query connector
- Sandboxed Python or notebook execution
- Automatic schema crawling
- Distributed data-processing jobs
- Chart rendering or dashboard hosting
- Scheduled report delivery
- Learned anomaly detection
- Causal-inference automation
- Privacy certification or regulated-data approval

These capabilities must be added without weakening source isolation, access approval, read-only defaults, lineage, reproducibility, or evidence labeling.
