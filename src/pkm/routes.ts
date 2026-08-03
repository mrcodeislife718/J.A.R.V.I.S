import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { PkmService } from "./service.js";
import {
  PKM_ITEM_KINDS,
  type PkmAuthorship,
  type PkmEvidenceState,
  type PkmSourceKind,
} from "./types.js";

const AUTHORSHIP = ["user", "assistant", "external", "system", "mixed"] as const;
const SOURCE_KINDS = ["conversation", "note", "file", "research", "plan", "import"] as const;
const EVIDENCE_STATES = ["observed", "sourced", "inferred", "assumed", "disputed", "unknown"] as const;
const RECORD_STATUSES = ["candidate", "approved", "rejected", "superseded"] as const;

const workspaceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(4_000).optional(),
});

const ingestSchema = z.object({
  title: z.string().min(1).max(500),
  kind: z.enum(SOURCE_KINDS),
  authorship: z.enum(AUTHORSHIP),
  content: z.string().min(1).max(2_000_000),
  externalUri: z.string().url().max(4_000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  extractLabeledKnowledge: z.boolean().optional(),
});

const itemSchema = z.object({
  sourceId: z.uuid(),
  kind: z.enum(PKM_ITEM_KINDS),
  title: z.string().min(1).max(500),
  body: z.string().min(1).max(200_000),
  authorship: z.enum(AUTHORSHIP),
  confidence: z.number().min(0).max(1),
  evidenceState: z.enum(EVIDENCE_STATES),
  sourceStart: z.number().int().min(0).optional(),
  sourceEnd: z.number().int().min(0).optional(),
  validFrom: z.iso.datetime().optional(),
  validUntil: z.iso.datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const reviewSchema = z.object({
  reviewedBy: z.string().min(1).max(200),
  reason: z.string().min(1).max(4_000).optional(),
});

const paramsSchema = z.object({ id: z.uuid() });
const itemParamsSchema = z.object({ id: z.uuid(), itemId: z.uuid() });
const sourceParamsSchema = z.object({ id: z.uuid(), sourceId: z.uuid() });

const errorResponse = (error: unknown): { error: string } => ({
  error: error instanceof Error ? error.message : "Personal knowledge operation failed",
});

export const registerPkmRoutes = (app: FastifyInstance, service: PkmService): void => {
  app.post("/v1/pkm/workspaces", async (request, reply) => {
    const parsed = workspaceSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid workspace", detail: parsed.error.flatten() });
    try {
      return reply.code(201).send({ workspace: await service.createWorkspace(parsed.data) });
    } catch (error) {
      return reply.code(400).send(errorResponse(error));
    }
  });

  app.get("/v1/pkm/workspaces", async () => ({ workspaces: await service.listWorkspaces() }));

  app.get("/v1/pkm/workspaces/:id", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid workspace id" });
    const workspace = await service.getWorkspace(parsed.data.id);
    return workspace ? { workspace } : reply.code(404).send({ error: "Workspace not found" });
  });

  app.post("/v1/pkm/workspaces/:id/sources", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const body = ingestSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "Invalid source ingestion request" });
    }
    try {
      return reply.code(201).send({ result: await service.ingestSource(params.data.id, body.data) });
    } catch (error) {
      return reply.code(400).send(errorResponse(error));
    }
  });

  app.get("/v1/pkm/workspaces/:id/sources", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const query = z.object({ limit: z.coerce.number().int().min(1).max(500).default(100) }).safeParse(request.query);
    if (!params.success || !query.success) return reply.code(400).send({ error: "Invalid source query" });
    try {
      return { sources: await service.listSources(params.data.id, query.data.limit) };
    } catch (error) {
      return reply.code(404).send(errorResponse(error));
    }
  });

  app.get("/v1/pkm/workspaces/:id/sources/:sourceId/content", async (request, reply) => {
    const params = sourceParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "Invalid source request" });
    try {
      return await service.getSourceContent(params.data.id, params.data.sourceId);
    } catch (error) {
      return reply.code(404).send(errorResponse(error));
    }
  });

  app.post("/v1/pkm/workspaces/:id/items", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const body = itemSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: "Invalid knowledge item" });
    try {
      return reply.code(201).send({ item: await service.createKnowledgeItem(params.data.id, body.data) });
    } catch (error) {
      return reply.code(400).send(errorResponse(error));
    }
  });

  app.get("/v1/pkm/workspaces/:id/items", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const query = z
      .object({
        kind: z.enum(PKM_ITEM_KINDS).optional(),
        status: z.enum(RECORD_STATUSES).optional(),
        limit: z.coerce.number().int().min(1).max(500).default(200),
      })
      .safeParse(request.query);
    if (!params.success || !query.success) return reply.code(400).send({ error: "Invalid item query" });
    try {
      const kinds = query.data.kind ? [query.data.kind] : undefined;
      const options: {
        kinds?: (typeof PKM_ITEM_KINDS)[number][];
        status?: (typeof RECORD_STATUSES)[number];
        limit: number;
      } = { limit: query.data.limit };
      if (kinds) options.kinds = kinds;
      if (query.data.status) options.status = query.data.status;
      return { items: await service.listItems(params.data.id, options) };
    } catch (error) {
      return reply.code(404).send(errorResponse(error));
    }
  });

  app.post("/v1/pkm/workspaces/:id/items/:itemId/approve", async (request, reply) => {
    const params = itemParamsSchema.safeParse(request.params);
    const body = reviewSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: "Invalid approval request" });
    try {
      return { item: await service.approveItem(params.data.id, params.data.itemId, body.data.reviewedBy) };
    } catch (error) {
      return reply.code(400).send(errorResponse(error));
    }
  });

  app.post("/v1/pkm/workspaces/:id/items/:itemId/reject", async (request, reply) => {
    const params = itemParamsSchema.safeParse(request.params);
    const body = reviewSchema.safeParse(request.body);
    if (!params.success || !body.success || !body.data.reason) {
      return reply.code(400).send({ error: "Rejection requires reviewedBy and reason" });
    }
    try {
      return {
        item: await service.rejectItem(params.data.id, params.data.itemId, body.data.reviewedBy, body.data.reason),
      };
    } catch (error) {
      return reply.code(400).send(errorResponse(error));
    }
  });

  app.get("/v1/pkm/workspaces/:id/search", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const query = z
      .object({ q: z.string().min(1).max(4_000), limit: z.coerce.number().int().min(1).max(100).default(20) })
      .safeParse(request.query);
    if (!params.success || !query.success) return reply.code(400).send({ error: "Invalid search request" });
    try {
      return { hits: await service.search(params.data.id, query.data.q, query.data.limit) };
    } catch (error) {
      return reply.code(404).send(errorResponse(error));
    }
  });

  app.get("/v1/pkm/workspaces/:id/resume", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "Invalid workspace id" });
    try {
      return { resume: await service.buildResumePacket(params.data.id) };
    } catch (error) {
      return reply.code(404).send(errorResponse(error));
    }
  });

  app.get("/v1/pkm/workspaces/:id/timeline", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const query = z.object({ limit: z.coerce.number().int().min(1).max(500).default(100) }).safeParse(request.query);
    if (!params.success || !query.success) return reply.code(400).send({ error: "Invalid timeline request" });
    try {
      return { events: await service.listTimeline(params.data.id, query.data.limit) };
    } catch (error) {
      return reply.code(404).send(errorResponse(error));
    }
  });
};

export type { PkmAuthorship, PkmEvidenceState, PkmSourceKind };
