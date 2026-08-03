# HTTP API

The version 0.1 API is intentionally small. Authentication and persistent multi-user tenancy are production milestones; do not expose this bootstrap service to an untrusted network.

## Health

`GET /health`

Returns system identity, version, and domain count.

## Domains and capabilities

`GET /v1/domains`

Returns all domain manifests, safeguards, denied actions, authorization requirements, memory namespaces, and allowed capabilities.

`GET /v1/capabilities?domain=<domain-id>`

Returns either all capabilities or the allow-listed capabilities for one domain.

## Missions

`POST /v1/missions`

```json
{
  "domain": "personal-knowledge",
  "objective": "Extract decisions and next actions from these notes",
  "requestedCapabilities": ["knowledge.extract", "knowledge.resume"],
  "inputs": { "notes": "Decision: build one governed core." },
  "constraints": {
    "tokenBudget": 12000,
    "memoryBudgetMb": 4096,
    "deadlineMs": 120000,
    "allowExternalNetwork": false,
    "allowSideEffects": false
  },
  "rememberOutput": true
}
```

Responses:

- `201`: mission executed or failed during allowed execution
- `202`: mission compiled and paused for human authorization
- `422`: mission rejected by a non-overridable domain policy
- `400`: invalid request or capability selection

`GET /v1/missions`

Lists missions held by the current development repository adapter.

`GET /v1/missions/:id`

Returns one mission, its steps, risk assessment, authorization, verification report, and final output.

`POST /v1/missions/:id/authorize`

```json
{
  "approvedBy": "Charles Castillo",
  "scope": "Planning only. Do not execute external changes."
}
```

Authorization is scoped. It cannot override a prohibited mission.

`GET /v1/missions/:id/audit`

Returns append-only mission events for compilation, risk, authorization, execution attempts, verification, and memory review.

## Memory

`GET /v1/memory?status=candidate`

Lists memory records, optionally filtered by status.

`POST /v1/memory/:id/approve`

```json
{ "reviewedBy": "Charles Castillo" }
```

`POST /v1/memory/:id/reject`

```json
{
  "reviewedBy": "Charles Castillo",
  "reason": "The output lacks sufficient evidence."
}
```

Only approved same-domain memory is eligible for later context compilation.

## Telemetry

`GET /v1/metrics`

Returns mission totals, completion rate, authorization backlog, inference failures, token counts, and latency totals. Monetary API cost is zero for the current local Ollama adapter.
