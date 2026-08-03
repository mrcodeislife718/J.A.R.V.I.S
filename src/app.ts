import Fastify, { type FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { OllamaClient } from "./adapters/ollama-client.js";
import { listCapabilities } from "./capabilities/registry.js";
import { config } from "./config/env.js";
import { ContextCompiler } from "./core/context-compiler.js";
import { ExecutionScheduler } from "./core/execution-scheduler.js";
import { MemoryGate } from "./core/memory-gate.js";
import { MissionCompiler } from "./core/mission-compiler.js";
import { ModelRouter } from "./core/model-router.js";
import { JarvisOrchestrator } from "./core/orchestrator.js";
import { TelemetryService } from "./core/telemetry.js";
import { DOMAIN_IDS, type ModelClient } from "./core/types.js";
import { VerificationEngine } from "./core/verification-engine.js";
import { listDomainManifests } from "./domains/registry.js";
import { FileSystemBlobStore, type BlobStore } from "./pkm/blob-store.js";
import {
  DeterministicEmbeddingClient,
  OllamaEmbeddingClient,
  type EmbeddingClient,
} from "./pkm/embedding.js";
import { InMemoryPkmRepository } from "./pkm/in-memory-repository.js";
import { PostgresPkmRepository } from "./pkm/postgres-repository.js";
import type { PkmRepository } from "./pkm/repository.js";
import { registerPkmRoutes } from "./pkm/routes.js";
import {
  NoopSemanticIndex,
  QdrantSemanticIndex,
  type SemanticIndex,
} from "./pkm/semantic-index.js";
import { PkmService } from "./pkm/service.js";
import {
  InMemoryAuditRepository,
  InMemoryMemoryRepository,
  InMemoryMissionRepository,
} from "./storage/in-memory.js";
import { createPostgresPool } from "./storage/postgres.js";

const missionRequestSchema = z.object({
  domain: z.enum(DOMAIN_IDS),
  objective: z.string().min(3).max(50_000),
  requestedCapabilities: z.array(z.string().min(1)).max(32).default([]),
  inputs: z.record(z.string(), z.unknown()).default({}),
  constraints: z
    .object({
      tokenBudget: z.number().int().min(512).max(200_000).optional(),
      memoryBudgetMb: z.number().int().min(256).max(1_048_576).optional(),
      deadlineMs: z.number().int().min(1_000).max(3_600_000).optional(),
      allowExternalNetwork: z.boolean().optional(),
      allowSideEffects: z.boolean().optional(),
    })
    .default({}),
  rememberOutput: z.boolean().default(false),
});

const authorizationSchema = z.object({
  approvedBy: z.string().min(1).max(200),
  scope: z.string().min(3).max(2_000),
});

const memoryDecisionSchema = z.object({
  reviewedBy: z.string().min(1).max(200),
  reason: z.string().min(3).max(2_000).optional(),
});

export interface BuildAppOptions {
  modelClient?: ModelClient;
  pkmRepository?: PkmRepository;
  blobStore?: BlobStore;
  embeddingClient?: EmbeddingClient;
  semanticIndex?: SemanticIndex;
  logger?: boolean;
}

export const buildApp = (options: BuildAppOptions = {}): FastifyInstance => {
  const app = Fastify({
    logger: options.logger === false ? false : { level: config.LOG_LEVEL },
    bodyLimit: 2 * 1024 * 1024,
    requestTimeout: 130_000,
  });

  const missionRepository = new InMemoryMissionRepository();
  const memoryRepository = new InMemoryMemoryRepository();
  const auditRepository = new InMemoryAuditRepository();
  const modelClient = options.modelClient ?? new OllamaClient(config.OLLAMA_BASE_URL);
  const compiler = new MissionCompiler({
    tokenBudget: config.DEFAULT_TOKEN_BUDGET,
    memoryBudgetMb: config.DEFAULT_MEMORY_BUDGET_MB,
    deadlineMs: config.MODEL_TIMEOUT_MS,
  });
  const contextCompiler = new ContextCompiler(memoryRepository);
  const modelRouter = new ModelRouter({
    defaultModel: config.OLLAMA_DEFAULT_MODEL,
    strongModel: config.OLLAMA_STRONG_MODEL,
  });
  const scheduler = new ExecutionScheduler(
    modelClient,
    modelRouter,
    auditRepository,
    config.MODEL_TIMEOUT_MS,
    config.MAX_PARALLEL_GENERATIONS,
  );
  const verifier = new VerificationEngine();
  const memoryGate = new MemoryGate(memoryRepository);
  const orchestrator = new JarvisOrchestrator(
    compiler,
    contextCompiler,
    scheduler,
    verifier,
    memoryGate,
    missionRepository,
    memoryRepository,
    auditRepository,
  );
  const telemetry = new TelemetryService(missionRepository, auditRepository);

  let pkmPool: Pool | null = null;
  let pkmRepository = options.pkmRepository;
  if (!pkmRepository) {
    if (config.PKM_STORAGE_DRIVER === "postgres") {
      pkmPool = createPostgresPool(config.DATABASE_URL);
      pkmRepository = new PostgresPkmRepository(pkmPool);
    } else {
      pkmRepository = new InMemoryPkmRepository();
    }
  }

  const blobStore = options.blobStore ?? new FileSystemBlobStore(config.PKM_BLOB_DIR);
  const embeddingClient =
    options.embeddingClient ??
    (config.PKM_SEMANTIC_INDEX === "qdrant"
      ? new OllamaEmbeddingClient(config.OLLAMA_BASE_URL, config.OLLAMA_EMBEDDING_MODEL)
      : new DeterministicEmbeddingClient());
  const semanticIndex =
    options.semanticIndex ??
    (config.PKM_SEMANTIC_INDEX === "qdrant"
      ? new QdrantSemanticIndex(config.QDRANT_URL, config.QDRANT_COLLECTION)
      : new NoopSemanticIndex());
  const pkmService = new PkmService(pkmRepository, blobStore, embeddingClient, semanticIndex);
  contextCompiler.setPersistentContextProvider(pkmService);

  if (pkmPool) {
    app.addHook("onClose", async () => {
      await pkmPool?.end();
    });
  }

  app.get("/health", async () => ({
    status: "ok",
    system: "J.A.R.V.I.S",
    expansion: "Just A Regular Virtual Intelligence System",
    version: "0.2.0",
    domains: DOMAIN_IDS.length,
    personalKnowledge: {
      storage: options.pkmRepository ? "injected" : config.PKM_STORAGE_DRIVER,
      semanticIndex: options.semanticIndex ? "injected" : config.PKM_SEMANTIC_INDEX,
    },
  }));

  app.get("/v1/domains", async () => ({ domains: listDomainManifests() }));
  app.get("/v1/metrics", async () => ({ metrics: await telemetry.snapshot() }));

  app.get("/v1/capabilities", async (request) => {
    const query = z.object({ domain: z.enum(DOMAIN_IDS).optional() }).parse(request.query);
    const domains = listDomainManifests();
    const allowed = query.domain
      ? new Set(domains.find((domain) => domain.id === query.domain)?.allowedCapabilities ?? [])
      : null;
    return {
      capabilities: listCapabilities().filter((capability) => !allowed || allowed.has(capability.id)),
    };
  });

  app.post("/v1/missions", async (request, reply) => {
    const parsed = missionRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid mission", detail: parsed.error.flatten() });
    try {
      const mission = await orchestrator.submit(parsed.data);
      const statusCode = mission.risk.prohibited
        ? 422
        : mission.status === "awaiting-authorization"
          ? 202
          : 201;
      return reply.code(statusCode).send({ mission });
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Mission submission failed" });
    }
  });

  app.get("/v1/missions", async () => ({ missions: await orchestrator.listMissions() }));

  app.get("/v1/missions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const mission = await orchestrator.getMission(id);
    return mission ? { mission } : reply.code(404).send({ error: "Mission not found" });
  });

  app.post("/v1/missions/:id/authorize", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = authorizationSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid authorization", detail: parsed.error.flatten() });
    try {
      const mission = await orchestrator.authorizeAndRun(id, {
        approvedBy: parsed.data.approvedBy,
        approvedAt: new Date().toISOString(),
        scope: parsed.data.scope,
      });
      return { mission };
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Authorization failed" });
    }
  });

  app.get("/v1/missions/:id/audit", async (request) => {
    const { id } = request.params as { id: string };
    return { events: await orchestrator.listAudit(id) };
  });

  app.get("/v1/memory", async (request) => {
    const query = z
      .object({ status: z.enum(["candidate", "approved", "rejected", "superseded"]).optional() })
      .parse(request.query);
    return { memories: await orchestrator.listMemories(query.status) };
  });

  app.post("/v1/memory/:id/approve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = memoryDecisionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid review", detail: parsed.error.flatten() });
    try {
      return { memory: await orchestrator.approveMemory(id, parsed.data.reviewedBy) };
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Memory approval failed" });
    }
  });

  app.post("/v1/memory/:id/reject", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = memoryDecisionSchema.safeParse(request.body);
    if (!parsed.success || !parsed.data.reason) {
      return reply.code(400).send({ error: "Memory rejection requires reviewedBy and reason" });
    }
    try {
      return {
        memory: await orchestrator.rejectMemory(id, parsed.data.reviewedBy, parsed.data.reason),
      };
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Memory rejection failed" });
    }
  });

  registerPkmRoutes(app, pkmService);
  return app;
};
