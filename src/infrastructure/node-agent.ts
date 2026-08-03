import { LocalHostCollector, type LocalCollectorOptions } from "./collector.js";
import type { InfrastructureNodeRole } from "./types.js";

const controlUrl = (process.env.INFRA_CONTROL_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const agentToken = process.env.INFRA_AGENT_TOKEN ?? "development-only-change-me";
const intervalMs = Number(process.env.INFRA_AGENT_INTERVAL_MS ?? 30_000);
const labels = (process.env.INFRA_NODE_LABELS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const capabilities = (process.env.INFRA_NODE_CAPABILITIES ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const role = (process.env.INFRA_NODE_ROLE ?? "worker") as InfrastructureNodeRole;
const watch = process.argv.includes("--watch");

if (!Number.isFinite(intervalMs) || intervalMs < 5_000) {
  throw new Error("INFRA_AGENT_INTERVAL_MS must be at least 5000");
}

const collectorOptions: LocalCollectorOptions = {
  role,
  labels,
  capabilities,
  agentVersion: "0.3.0",
};
if (process.env.INFRA_NODE_ID !== undefined) collectorOptions.nodeId = process.env.INFRA_NODE_ID;
if (process.env.INFRA_NODE_NAME !== undefined) collectorOptions.nodeName = process.env.INFRA_NODE_NAME;
if (process.env.INFRA_ROOT_PATH !== undefined) collectorOptions.rootPath = process.env.INFRA_ROOT_PATH;

const collector = new LocalHostCollector(collectorOptions);

const post = async (path: string, body: unknown): Promise<unknown> => {
  const response = await fetch(`${controlUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-jarvis-agent-token": agentToken,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof payload === "object" && payload !== null && "error" in payload
      ? String((payload as { error: unknown }).error)
      : response.statusText;
    throw new Error(`Infrastructure control plane returned ${response.status}: ${detail}`);
  }
  return payload;
};

const register = async (): Promise<string> => {
  const registration = await collector.registration();
  const payload = await post("/v1/infrastructure/nodes", registration) as { node?: { id?: string } };
  const nodeId = payload.node?.id;
  if (!nodeId) throw new Error("Control plane did not return a node ID");
  return nodeId;
};

const sendHeartbeat = async (nodeId: string): Promise<void> => {
  await post(`/v1/infrastructure/nodes/${encodeURIComponent(nodeId)}/heartbeat`, await collector.heartbeat());
  process.stdout.write(`[${new Date().toISOString()}] heartbeat accepted for ${nodeId}\n`);
};

const run = async (): Promise<void> => {
  const nodeId = await register();
  await sendHeartbeat(nodeId);
  if (!watch) return;
  const timer = setInterval(() => {
    void sendHeartbeat(nodeId).catch((error: unknown) => {
      process.stderr.write(`[${new Date().toISOString()}] heartbeat failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
    });
  }, intervalMs);
  const stop = (): void => {
    clearInterval(timer);
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
};

run().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : "Unknown node agent failure"}\n`);
  process.exitCode = 1;
});
