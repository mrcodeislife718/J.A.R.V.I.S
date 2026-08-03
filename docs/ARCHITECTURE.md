# J.A.R.V.I.S Architecture

## Purpose

J.A.R.V.I.S turns a user or system objective into a bounded, auditable mission. It activates only the capabilities required for that mission, compiles the smallest useful context, routes each step to an appropriate model or deterministic tool, verifies the result, and prevents unreviewed output from becoming trusted long-term memory.

The architecture is designed around verified mission success rather than agent count.

## Mission pipeline

```text
Objective
  -> Mission compiler
  -> Risk, permission, and resource assessment
  -> Dynamic capability graph
  -> Context and evidence compiler
  -> Model and tool router
  -> Execution scheduler
  -> Verification plane
  -> Approved output
  -> Governed memory-write gate
```

## Core components

### Mission compiler

The compiler validates the selected domain, resolves requested or default capabilities, rejects capabilities outside the domain allow-list, applies resource limits, and emits an ordered capability graph.

A compiled mission contains:

- Objective and structured inputs
- Domain identifier
- Token, memory, deadline, network, and side-effect constraints
- Risk assessment
- Capability steps and dependencies
- Authorization state
- Execution and verification status

### Risk engine

The risk engine combines capability risk with domain-specific objective patterns. It separates three outcomes:

- Execute without approval
- Pause for explicit human authorization
- Reject because the mission violates a domain policy

Authorization cannot override a prohibited mission.

### Capability registry

Capabilities are logical units of work, not permanently running agents. A mission activates only the required subset. Each capability defines its risk, tool requirements, side-effect behavior, and verification expectations.

### Context compiler

The context compiler includes only:

- Current objective and constraints
- Supplied mission inputs
- Approved memory from the same domain namespace
- Explicit evidence references
- Current uncertainty state

Candidate, rejected, cross-domain, or unapproved memory is excluded.

### Model router

The model router selects the default or stronger local model according to mission risk, capability risk, objective complexity, and verification requirements. It allocates a per-step token budget from the mission-level budget.

### Tool gateway

The tool gateway is the control point for future MCP servers and APIs. Every registered tool declares:

- Allowed domains
- Whether it causes side effects
- Its executor
- Its description and identifier

Side-effecting tools require both mission permission and explicit human authorization.

### Execution scheduler

The scheduler executes the capability graph in dependency order. For each step it:

1. Confirms dependencies completed.
2. Selects a model route.
3. Builds a bounded prompt from the context packet and recent step artifacts.
4. Executes the model call.
5. Records model, token, duration, status, and failure data in the audit stream.
6. Stops downstream execution when a dependency fails.

The bootstrap scheduler is serial by design. This prevents a 16 GB local machine from loading multiple generation workloads without an explicit resource scheduler.

### Verification plane

The deterministic verification layer currently checks:

- The mission is not prohibited.
- Required human authorization exists.
- Every capability step completed.
- A final output exists.
- The output does not invent source markers when no evidence was supplied.
- Biomedical output does not contain actionable human dosing instructions.
- Output does not claim side effects when side effects were disabled.

Domain-specific evaluators, test runners, statistical checks, citation entailment, SQL validation, and policy engines are extension points for later phases.

### Memory-write gate

Verified output can become a memory candidate only when the mission explicitly requests it. A candidate remains unavailable to future context compilation until a human approves it. Rejection records the reviewer and reason.

### Audit and telemetry

Mission compilation, risk decisions, authorization, capability execution, verification, and memory decisions create append-only audit events. The telemetry service aggregates:

- Mission completion and failure rates
- Authorization backlog
- Completed and failed inference calls
- Input and output tokens
- Total and average inference duration
- Estimated API cost

Local Ollama inference is reported as zero API cost; energy and hardware depreciation are not yet estimated.

## Domain isolation

The seven systems share source code but not unrestricted data or permissions. Every domain has a manifest containing its own:

- Memory namespace
- Capability allow-list
- Denied actions
- Authorization requirements
- Safeguards

Persistent deployments will enforce isolation with separate database schemas, Qdrant collections, credentials, encryption keys, retention rules, and audit partitions.

## Storage strategy

Version 0.1 uses in-memory repositories so the execution contracts can be tested without infrastructure. The production adapter plan is:

- PostgreSQL: missions, decisions, authorizations, structured memory, permissions, and audit metadata
- Qdrant: hybrid semantic retrieval indexes
- Object storage: original documents, datasets, reports, and large artifacts
- Redis: queues, leases, rate limits, and short-lived execution state
- Append-only audit storage: tamper-evident mission events

The vector database is an index, not the source of truth.

## Deployment topology

### Single machine

The M4 mini or another primary node runs:

- J.A.R.V.I.S API and scheduler
- One active generation model
- Small embedding model when needed
- Development persistence services

Generation concurrency defaults to one.

### Multi-node

The preferred expansion order is:

1. Move databases and indexing to a service node.
2. Assign independent missions to separate worker nodes.
3. Add a dedicated verification and test node.
4. Add failover and queue recovery.
5. Use model sharding only when a model genuinely cannot fit or perform adequately on one node.

Task parallelism is preferred before cross-node tensor or model parallelism.

## Current implementation boundary

Version 0.1 is a runnable governed-core foundation. It does not yet claim production persistence, live MCP integrations, hybrid Qdrant retrieval, autonomous research browsing, wet-lab execution, production infrastructure mutation, customer-account mutation, or automated publishing. Those capabilities must be added behind the existing permission, evidence, verification, and authorization contracts.
