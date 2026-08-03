import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../../src/app.js";
import type { ModelClient, ModelRequest, ModelResponse } from "../../src/core/types.js";
import type {
  InfrastructureActionExecutionContext,
  InfrastructureActionExecutor,
} from "../../src/infrastructure/action-executor.js";
import { InMemoryInfrastructureRepository } from "../../src/infrastructure/in-memory-repository.js";
import type {
  InfrastructureActionExecutionResult,
  InfrastructureActionRequest,
} from "../../src/infrastructure/types.js";

const AGENT_TOKEN = "development-only-change-me";

class CapturingModelClient implements ModelClient {
  prompts: string[] = [];

  async generate(request: ModelRequest): Promise<ModelResponse> {
    this.prompts.push(request.prompt);
    const capability = request.prompt.match(/CURRENT CAPABILITY: ([^\n]+)/)?.[1] ?? "unknown";
    const text = capability === "core.report"
      ? "Known: infrastructure state was supplied by the control plane. Missing: no external host commands were executed."
      : `Known: processed ${capability}. Missing: no external host commands were executed.`;
    return { text, model: request.model, inputTokens: 100, outputTokens: 30, totalDurationMs: 5 };
  }
}

class SuccessfulActionExecutor implements InfrastructureActionExecutor {
  calls: InfrastructureActionRequest[] = [];

  async execute(
    action: InfrastructureActionRequest,
    _context: InfrastructureActionExecutionContext,
  ): Promise<InfrastructureActionExecutionResult> {
    this.calls.push(structuredClone(action));
    return {
      executed: !action.dryRun,
      success: true,
      message: `Test executor completed ${action.kind}`,
      detail: { test: true },
    };
  }
}

const registerNode = async (
  app: ReturnType<typeof buildApp>,
  input: { id: string; name: string; memory: number; capabilities: string[] },
): Promise<void> => {
  const response = await app.inject({
    method: "POST",
    url: "/v1/infrastructure/nodes",
    headers: { "x-jarvis-agent-token": AGENT_TOKEN },
    payload: {
      id: input.id,
      name: input.name,
      hostname: input.name.toLowerCase(),
      platform: "linux",
      architecture: "x64",
      role: "worker",
      labels: ["local"],
      capabilities: input.capabilities,
      agentVersion: "0.3.0-test",
      capacity: {
        cpuCores: 8,
        memoryTotalBytes: input.memory,
        swapTotalBytes: 4_000,
        diskTotalBytes: 100_000,
        gpuMemoryTotalBytes: null,
      },
    },
  });
  assert.equal(response.statusCode, 201);
};

const heartbeat = async (
  app: ReturnType<typeof buildApp>,
  nodeId: string,
  values: { cpu: number; memory: number; disk: number },
): Promise<void> => {
  const response = await app.inject({
    method: "POST",
    url: `/v1/infrastructure/nodes/${nodeId}/heartbeat`,
    headers: { "x-jarvis-agent-token": AGENT_TOKEN },
    payload: {
      metric: {
        cpuUtilization: values.cpu,
        load1: values.cpu * 8,
        memoryUsedBytes: values.memory,
        swapUsedBytes: 0,
        diskUsedBytes: values.disk,
        temperatureC: null,
        networkRxBytes: null,
        networkTxBytes: null,
        processCount: 100,
        metadata: {},
      },
      services: [{
        id: `${nodeId}-ollama`,
        name: "ollama",
        kind: "model-runtime",
        endpoint: "http://127.0.0.1:11434",
        status: "healthy",
        metadata: {},
      }],
    },
  });
  assert.equal(response.statusCode, 200);
};

test("infrastructure agents require the shared control-plane token", async () => {
  const app = buildApp({
    modelClient: new CapturingModelClient(),
    infrastructureRepository: new InMemoryInfrastructureRepository(),
    logger: false,
  });
  const response = await app.inject({
    method: "POST",
    url: "/v1/infrastructure/nodes",
    payload: {},
  });
  assert.equal(response.statusCode, 401);
  await app.close();
});

test("fleet monitoring opens alerts and routes work to the healthiest eligible node", async () => {
  const app = buildApp({
    modelClient: new CapturingModelClient(),
    infrastructureRepository: new InMemoryInfrastructureRepository(),
    logger: false,
  });
  await registerNode(app, {
    id: "node-constrained",
    name: "Constrained Node",
    memory: 16_000,
    capabilities: ["ollama", "coding"],
  });
  await registerNode(app, {
    id: "node-healthy",
    name: "Healthy Node",
    memory: 64_000,
    capabilities: ["ollama", "coding"],
  });
  await heartbeat(app, "node-constrained", { cpu: 0.96, memory: 15_500, disk: 90_000 });
  await heartbeat(app, "node-healthy", { cpu: 0.2, memory: 10_000, disk: 20_000 });

  const fleet = await app.inject({ method: "GET", url: "/v1/infrastructure/fleet" });
  assert.equal(fleet.statusCode, 200);
  assert.equal(fleet.json().fleet.totals.registeredNodes, 2);
  assert.ok(fleet.json().fleet.totals.openAlerts >= 2);

  const decision = await app.inject({
    method: "POST",
    url: "/v1/infrastructure/schedule",
    payload: {
      workloadId: "mission-analytics",
      requiredCapabilities: ["ollama"],
      minimumCpuCores: 4,
      minimumFreeMemoryBytes: 20_000,
      minimumFreeDiskBytes: 10_000,
      allowDegraded: false,
    },
  });
  assert.equal(decision.statusCode, 200);
  assert.equal(decision.json().decision.selectedNodeId, "node-healthy");
  await app.close();
});

test("infrastructure actions cannot execute before scoped approval", async () => {
  const executor = new SuccessfulActionExecutor();
  const app = buildApp({
    modelClient: new CapturingModelClient(),
    infrastructureRepository: new InMemoryInfrastructureRepository(),
    infrastructureActionExecutor: executor,
    logger: false,
  });
  await registerNode(app, {
    id: "node-action",
    name: "Action Node",
    memory: 32_000,
    capabilities: ["ollama"],
  });
  await heartbeat(app, "node-action", { cpu: 0.2, memory: 8_000, disk: 10_000 });

  const proposed = await app.inject({
    method: "POST",
    url: "/v1/infrastructure/actions",
    payload: {
      nodeId: "node-action",
      kind: "drain-node",
      target: "node-action",
      requestedBy: "Charles Castillo",
      dryRun: false,
      idempotencyKey: "drain-node-action-001",
    },
  });
  assert.equal(proposed.statusCode, 201);
  const actionId = proposed.json().action.id as string;

  const premature = await app.inject({
    method: "POST",
    url: `/v1/infrastructure/actions/${actionId}/execute`,
  });
  assert.equal(premature.statusCode, 400);
  assert.equal(executor.calls.length, 0);

  const approved = await app.inject({
    method: "POST",
    url: `/v1/infrastructure/actions/${actionId}/approve`,
    payload: {
      approvedBy: "Charles Castillo",
      scope: "Drain this node from new workload scheduling only.",
    },
  });
  assert.equal(approved.statusCode, 200);

  const executed = await app.inject({
    method: "POST",
    url: `/v1/infrastructure/actions/${actionId}/execute`,
  });
  assert.equal(executed.statusCode, 200);
  assert.equal(executed.json().action.status, "succeeded");
  assert.equal(executor.calls.length, 1);

  const node = await app.inject({ method: "GET", url: "/v1/infrastructure/nodes/node-action" });
  assert.equal(node.json().node.effectiveStatus, "maintenance");
  await app.close();
});

test("approved control-plane state reaches infrastructure missions", async () => {
  const model = new CapturingModelClient();
  const app = buildApp({
    modelClient: model,
    infrastructureRepository: new InMemoryInfrastructureRepository(),
    logger: false,
  });
  await registerNode(app, {
    id: "node-context",
    name: "Context Node",
    memory: 32_000,
    capabilities: ["ollama", "infra-read"],
  });
  await heartbeat(app, "node-context", { cpu: 0.25, memory: 12_000, disk: 25_000 });

  const mission = await app.inject({
    method: "POST",
    url: "/v1/missions",
    payload: {
      domain: "infrastructure-administration",
      objective: "Inventory the selected node and report its current resource state",
      requestedCapabilities: ["infrastructure.inventory"],
      inputs: { nodeId: "node-context" },
    },
  });
  assert.equal(mission.statusCode, 201);
  assert.equal(mission.json().mission.status, "completed");
  assert.ok(model.prompts.some((prompt) => prompt.includes("Context Node [node-context]")));
  await app.close();
});

test("backup verification and incident timelines remain auditable", async () => {
  const app = buildApp({
    modelClient: new CapturingModelClient(),
    infrastructureRepository: new InMemoryInfrastructureRepository(),
    logger: false,
  });
  await registerNode(app, {
    id: "node-backup",
    name: "Backup Node",
    memory: 32_000,
    capabilities: ["storage"],
  });
  await heartbeat(app, "node-backup", { cpu: 0.1, memory: 5_000, disk: 20_000 });

  const backup = await app.inject({
    method: "POST",
    url: "/v1/infrastructure/backups",
    payload: {
      id: "backup-primary",
      nodeId: "node-backup",
      name: "Primary database backup",
      source: "postgres://jarvis",
      repository: "file:///backups/jarvis",
      status: "unknown",
    },
  });
  assert.equal(backup.statusCode, 201);

  const verification = await app.inject({
    method: "POST",
    url: "/v1/infrastructure/backups/backup-primary/verifications",
    payload: {
      success: true,
      method: "checksum-and-restore-test",
      detail: "Archive checksum matched and isolated restore completed.",
      performedBy: "test-verifier",
    },
  });
  assert.equal(verification.statusCode, 201);
  assert.equal(verification.json().backup.status, "healthy");

  const incident = await app.inject({
    method: "POST",
    url: "/v1/infrastructure/incidents",
    payload: {
      title: "Storage latency investigation",
      severity: "warning",
      nodeIds: ["node-backup"],
      summary: "Investigate intermittent storage latency.",
    },
  });
  assert.equal(incident.statusCode, 201);
  const incidentId = incident.json().incident.id as string;

  const resolved = await app.inject({
    method: "PATCH",
    url: `/v1/infrastructure/incidents/${incidentId}`,
    payload: {
      status: "resolved",
      rootCause: "Synthetic test condition",
      resolution: "No production change required",
      actor: "Charles Castillo",
    },
  });
  assert.equal(resolved.statusCode, 200);
  assert.equal(resolved.json().incident.status, "resolved");

  const timeline = await app.inject({
    method: "GET",
    url: `/v1/infrastructure/incidents/${incidentId}`,
  });
  assert.equal(timeline.statusCode, 200);
  assert.ok(timeline.json().timeline.length >= 2);
  await app.close();
});
