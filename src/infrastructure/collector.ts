import { createHash } from "node:crypto";
import { statfs } from "node:fs/promises";
import os from "node:os";
import type { RegisterInfrastructureNodeInput } from "./service.js";
import type {
  InfrastructureNodeHeartbeat,
  InfrastructureNodeRole,
  InfrastructurePlatform,
  InfrastructureServiceRecord,
} from "./types.js";

export interface LocalCollectorOptions {
  nodeId?: string;
  nodeName?: string;
  role?: InfrastructureNodeRole;
  labels?: string[];
  capabilities?: string[];
  rootPath?: string;
  agentVersion?: string;
  services?: Array<Omit<InfrastructureServiceRecord, "nodeId" | "lastCheckedAt">>;
}

const platform = (): InfrastructurePlatform => {
  const value = os.platform();
  if (value === "linux" || value === "darwin" || value === "win32") return value;
  return "unknown";
};

export const deterministicLocalNodeId = (): string => {
  const digest = createHash("sha256")
    .update(`${os.hostname()}|${os.platform()}|${os.arch()}`)
    .digest("hex")
    .slice(0, 20);
  return `node-${digest}`;
};

const diskCapacity = async (rootPath: string): Promise<{ total: number; used: number }> => {
  try {
    const info = await statfs(rootPath);
    const blockSize = Number(info.bsize);
    const total = Number(info.blocks) * blockSize;
    const available = Number(info.bavail) * blockSize;
    return { total, used: Math.max(0, total - available) };
  } catch {
    return { total: 0, used: 0 };
  }
};

export class LocalHostCollector {
  constructor(private readonly options: LocalCollectorOptions = {}) {}

  async registration(): Promise<RegisterInfrastructureNodeInput> {
    const rootPath = this.options.rootPath ?? (os.platform() === "win32" ? "C:\\" : "/");
    const disk = await diskCapacity(rootPath);
    return {
      id: this.options.nodeId ?? deterministicLocalNodeId(),
      name: this.options.nodeName ?? os.hostname(),
      hostname: os.hostname(),
      platform: platform(),
      architecture: os.arch(),
      role: this.options.role ?? "worker",
      labels: this.options.labels ?? [],
      capabilities: this.options.capabilities ?? [],
      agentVersion: this.options.agentVersion ?? "0.3.0",
      capacity: {
        cpuCores: os.cpus().length,
        memoryTotalBytes: os.totalmem(),
        swapTotalBytes: 0,
        diskTotalBytes: disk.total,
        gpuMemoryTotalBytes: null,
      },
      metadata: {
        release: os.release(),
        type: os.type(),
        uptimeSeconds: os.uptime(),
        collector: "node-os-statfs",
      },
    };
  }

  async heartbeat(): Promise<InfrastructureNodeHeartbeat> {
    const rootPath = this.options.rootPath ?? (os.platform() === "win32" ? "C:\\" : "/");
    const disk = await diskCapacity(rootPath);
    const cpuCores = Math.max(1, os.cpus().length);
    const load1 = os.loadavg()[0] ?? 0;
    const cpuUtilization = Math.min(1, Math.max(0, load1 / cpuCores));
    const now = new Date().toISOString();
    return {
      observedAt: now,
      capacity: {
        cpuCores,
        memoryTotalBytes: os.totalmem(),
        diskTotalBytes: disk.total,
      },
      metric: {
        cpuUtilization,
        load1,
        memoryUsedBytes: Math.max(0, os.totalmem() - os.freemem()),
        swapUsedBytes: 0,
        diskUsedBytes: disk.used,
        temperatureC: null,
        networkRxBytes: null,
        networkTxBytes: null,
        processCount: null,
        metadata: {
          cpuUtilizationMethod: "one-minute-load-divided-by-logical-cores",
          swapCollection: "not-available-through-node-os",
        },
      },
      services: (this.options.services ?? []).map((service) => ({
        ...service,
        lastCheckedAt: now,
      })),
      metadata: { uptimeSeconds: os.uptime() },
    };
  }
}
