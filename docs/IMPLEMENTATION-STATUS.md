# Implementation Status

## Implemented in 0.1

- One shared governed mission lifecycle
- Seven isolated domain manifests
- Capability allow-lists
- Domain risk assessment and non-overridable rejection
- Human authorization pause and scoped authorization record
- Same-domain approved-memory context compilation
- Local Ollama generation adapter
- Adaptive default/strong model routing
- Global generation backpressure
- Bounded retry and dependency failure stop
- Deterministic verification checks
- Human-reviewed memory promotion
- Governed tool gateway contract
- Append-only audit events
- Mission, token, latency, and reliability telemetry
- Repeatable evaluation harness contract
- HTTP API and integration tests

## Adapter work still required

- PostgreSQL persistent repositories and migrations
- Qdrant hybrid dense/sparse retrieval and reranking
- Object storage for original artifacts
- Redis queue, leases, and distributed scheduling
- Authentication, organizations, roles, and capability tokens
- Live MCP server discovery and governed invocation
- Sandboxed code, SQL, and infrastructure execution
- Source connectors for literature, patents, policies, tickets, business data, and content performance
- Domain-specific production evaluation suites
- Cross-domain approved-artifact bridge
- Multi-node worker enrollment and failover

## Explicitly unsupported in 0.1

- Autonomous clinical or laboratory activity
- Actionable human dosing
- Autonomous biological ordering or synthesis
- Destructive infrastructure changes
- Customer-account or refund mutations
- Automated publication
- Claims of production security, regulatory compliance, or benchmark superiority
