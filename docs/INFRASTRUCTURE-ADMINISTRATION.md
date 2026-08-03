# Infrastructure Administration

## Purpose

The Infrastructure Administration domain gives J.A.R.V.I.S a governed view of machines, services, local model runtimes, storage, resource pressure, incidents, backups, and workload placement.

It is a control plane, not an unrestricted remote shell. Observation, recommendation, authorization, execution, and verification remain separate records.

## System boundary

```text
Approved node agent
  -> token-gated registration
  -> periodic heartbeat and service status
  -> durable fleet repository
  -> health policy and alerts
  -> resource scheduler
  -> mission context
  -> proposed operational action
  -> scoped human approval
  -> bounded action executor
  -> result and audit event
```

The default executor is deliberately record-only:

- It can inspect records and perform dry-run validation.
- It can update J.A.R.V.I.S scheduling state for node drain/resume.
- It does not invoke a shell.
- It does not restart operating-system services.
- It does not rotate logs.
- It does not claim a backup is valid without a verifier result.

A future privileged executor must use explicit command allow-lists, isolated credentials, timeouts, idempotency, rollback, and postcondition verification.

## Fleet model

Each registered node retains:

- Stable node ID
- Name and hostname
- Operating system and architecture
- Controller, worker, storage, database, or hybrid role
- Labels and executable capabilities
- Agent version
- CPU, memory, swap, disk, and optional GPU-memory capacity
- Last-seen time and current control-plane status
- Metadata supplied by the approved agent

Heartbeat samples can report:

- CPU utilization
- One-minute load
- Memory and swap use
- Disk use
- Temperature
- Network counters
- Process count
- Known service health

The included local collector is shell-free and uses Node.js `os` and `statfs` APIs. Some values, such as swap use, temperature, process count, and network counters, remain unknown unless a future platform-specific collector supplies them.

## Health policy

The default thresholds are configurable:

```text
CPU warning       85%
CPU critical      95%
Memory warning    85%
Memory critical   95%
Disk warning      85%
Disk critical     95%
Heartbeat stale   90 seconds
Backup stale      7 days
```

Alerts are deduplicated by node and condition. When a metric returns below its threshold, the health policy resolves its active alert while preserving the alert and event history.

A node can be:

- `online`
- `degraded`
- `offline`
- `maintenance`

A stale heartbeat causes the fleet snapshot and workload scheduler to treat a node as offline even when its last stored state was online.

## Workload scheduling

`POST /v1/infrastructure/schedule` evaluates each node against:

- Required capabilities
- Preferred labels
- Minimum CPU cores
- Minimum free memory
- Minimum free disk
- Minimum GPU memory
- Health and maintenance state
- Open alerts
- Service health

Ineligible nodes receive explicit rejection reasons. Eligible nodes receive a score based on CPU, memory, disk headroom, label fit, service health, and alert pressure.

Version 0.3 returns a placement decision. It does not yet dispatch a mission through Redis or reserve capacity transactionally. Those are later worker-queue features.

## Governed actions

Supported action records are:

- `health-check`
- `drain-node`
- `resume-node`
- `restart-service`
- `verify-backup`
- `rotate-logs`

Lifecycle:

```text
proposed
  -> approved or rejected
  -> executing
  -> succeeded or failed
```

Every action stores:

- Requester
- Risk level
- Target and parameters
- Dry-run flag
- Idempotency key
- Approver
- Approval timestamp
- Approval scope
- Execution timestamp
- Structured result
- Related incident
- Audit events

Execution is rejected unless a complete approval record exists. Authorization does not override unsupported execution: a restart request remains failed when no privileged executor adapter is installed.

## Incidents

Incidents preserve:

- Severity and status
- Affected nodes and alerts
- Summary
- Root cause
- Resolution
- Opened, updated, and resolved times
- Associated operational events

The incident endpoint returns the incident plus its ordered timeline, allowing a later diagnostics capability to distinguish observed facts from inferred causes.

## Backups

The backup registry records:

- Source
- Destination repository
- Last successful backup
- Last verification
- Verification method
- Restore point
- Health status

Verification is stored as a separate immutable-style record. Registering a backup is not proof that it works. A healthy status requires an explicit successful verification such as checksum validation plus an isolated restore test.

## Mission integration

Infrastructure missions can include `inputs.nodeId`.

The context compiler then loads the selected node's current control-plane state—or a compact fleet view when no node is selected—and includes:

- Node identity and status
- Capacity and latest metric sample
- Services
- Open alerts
- Evidence references
- Missing or stale-data warnings

The model receives control-plane observations as internal evidence. It is instructed not to claim that a command, test, or external action occurred unless the context records it.

## Persistent operation

Set:

```text
INFRA_STORAGE_DRIVER=postgres
DATABASE_URL=postgresql://jarvis:jarvis@localhost:5432/jarvis
```

Then apply migrations:

```bash
npm run migrate
```

The PostgreSQL adapter stores nodes, metrics, services, alerts, actions, incidents, backups, verifications, and events.

## Node agent

Configure a strong shared development token and control-plane URL:

```text
INFRA_AGENT_TOKEN=replace-with-a-long-random-secret
INFRA_CONTROL_URL=http://CONTROL_NODE:3000
INFRA_NODE_ROLE=worker
INFRA_NODE_LABELS=local,linux
INFRA_NODE_CAPABILITIES=ollama,coding
```

Run once:

```bash
npm run infra:agent:once
```

Run continuously:

```bash
npm run infra:agent
```

The shared-token bootstrap is appropriate only for a trusted local network. Production hardening requires per-node identities, TLS, token rotation, replay protection, rate limits, and certificate or signed-request authentication.

## Current limits

Version 0.3 does not yet provide:

- Per-node cryptographic identity
- TLS termination or network policy
- Automatic Docker, systemd, launchd, or Windows-service discovery
- Privileged command execution
- Container orchestration
- Transactional workload leases
- Redis-backed queues
- Model residency management
- GPU telemetry across every vendor
- Vulnerability scanning or patch execution
- Automatic restore testing
- Cloud-provider inventory adapters
- Production high availability

Those limits are intentional. The control plane first establishes accurate inventory, health, routing, authorization, persistence, and audit contracts before gaining broader execution authority.
