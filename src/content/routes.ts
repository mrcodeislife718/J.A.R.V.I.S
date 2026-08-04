import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import type {
  CreateContentBrandInput,
  CreateContentBriefInput,
  CreateContentDraftInput,
  CreateContentExperimentInput,
  CreatePublicationPlanInput,
  RecordPerformanceInput,
  RegisterContentSourceInput,
} from "./service.js";
import { ContentService } from "./service.js";
import { CONTENT_ENTITY_TYPES } from "./types.js";

const sendError = (reply: FastifyReply, error: unknown) =>
  reply.code(400).send({ error: error instanceof Error ? error.message : "Content operation failed" });

const brandSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  owner: z.string().min(1),
  voicePrinciples: z.array(z.string()).optional(),
  prohibitedClaims: z.array(z.string()).optional(),
  requiredDisclosures: z.array(z.string()).optional(),
  approvedPlatforms: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const sourceSchema = z.object({
  id: z.string().min(1).optional(),
  brandId: z.string().min(1),
  title: z.string().min(1),
  publisher: z.string().optional(),
  url: z.string().url().optional(),
  locator: z.string().min(1),
  publishedAt: z.string().optional(),
  summary: z.string().min(1),
  credibility: z.enum(["high", "medium", "low", "unknown"]).optional(),
  rights: z.enum(["link-only", "quote-limited", "licensed", "owned"]).optional(),
  supportedClaims: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  registeredBy: z.string().min(1),
});

const briefSchema = z.object({
  id: z.string().min(1).optional(),
  brandId: z.string().min(1),
  title: z.string().min(1),
  purpose: z.string().min(1),
  audience: z.string().min(1),
  platform: z.string().min(1),
  format: z.string().min(1),
  owner: z.string().min(1),
  goals: z.array(z.string()).optional(),
  requiredSourceIds: z.array(z.string()).optional(),
  requiredMessages: z.array(z.string()).optional(),
  prohibitedMessages: z.array(z.string()).optional(),
  maximumCharacters: z.number().int().positive().optional(),
});

const draftSchema = z.object({
  id: z.string().min(1).optional(),
  brandId: z.string().min(1),
  briefId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  createdBy: z.string().min(1),
  sourceIds: z.array(z.string()).optional(),
  claims: z.array(z.object({
    id: z.string().min(1).optional(),
    claim: z.string().min(1),
    sourceId: z.string().min(1).optional(),
    locator: z.string().optional(),
    note: z.string().optional(),
  })).optional(),
});

const publicationSchema = z.object({
  id: z.string().min(1).optional(),
  brandId: z.string().min(1),
  draftId: z.string().min(1),
  platform: z.string().min(1),
  scheduledFor: z.string().optional(),
  requestedBy: z.string().min(1),
  notes: z.array(z.string()).optional(),
});

const performanceSchema = z.object({
  id: z.string().min(1).optional(),
  brandId: z.string().min(1),
  publicationPlanId: z.string().min(1),
  observedAt: z.string().min(1),
  recordedBy: z.string().min(1),
  metrics: z.object({
    impressions: z.number().nonnegative(),
    clicks: z.number().nonnegative(),
    reactions: z.number().nonnegative(),
    comments: z.number().nonnegative(),
    shares: z.number().nonnegative(),
    conversions: z.number().nonnegative(),
    spend: z.number().nonnegative(),
  }),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const experimentSchema = z.object({
  id: z.string().min(1).optional(),
  brandId: z.string().min(1),
  name: z.string().min(1),
  hypothesis: z.string().min(1),
  platform: z.string().min(1),
  primaryMetric: z.string().min(1),
  variantDraftIds: z.array(z.string()).min(2),
  createdBy: z.string().min(1),
});

export const registerContentRoutes = (app: FastifyInstance, service: ContentService): void => {
  app.post("/v1/content/brands", async (request, reply) => {
    const parsed = brandSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid brand", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ brand: await service.createBrand(parsed.data as CreateContentBrandInput) }); }
    catch (error) { return sendError(reply, error); }
  });

  app.get("/v1/content/brands", async () => ({ brands: await service.listEntities("brand") }));

  app.get("/v1/content/entities/:type", async (request, reply) => {
    const params = z.object({ type: z.enum(CONTENT_ENTITY_TYPES) }).safeParse(request.params);
    const query = z.object({ brandId: z.string().optional(), limit: z.coerce.number().int().min(1).max(1000).default(200) }).safeParse(request.query);
    if (!params.success || !query.success) return reply.code(400).send({ error: "Invalid content entity query" });
    return { entities: await service.listEntities(params.data.type, query.data.brandId, query.data.limit) };
  });

  app.get("/v1/content/entities/:type/:id", async (request, reply) => {
    const parsed = z.object({ type: z.enum(CONTENT_ENTITY_TYPES), id: z.string().min(1) }).safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid content entity identifier" });
    try { return { entity: await service.getEntity(parsed.data.type, parsed.data.id) }; }
    catch (error) { return reply.code(404).send({ error: error instanceof Error ? error.message : "Content entity not found" }); }
  });

  app.post("/v1/content/sources", async (request, reply) => {
    const parsed = sourceSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid source", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ source: await service.registerSource(parsed.data as RegisterContentSourceInput) }); }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/content/sources/:id/review", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const parsed = z.object({ approved: z.boolean(), reviewer: z.string().min(1), reason: z.string().min(1) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid source review", detail: parsed.error.flatten() });
    try { return { source: await service.reviewSource(id, parsed.data.approved, parsed.data.reviewer, parsed.data.reason) }; }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/content/briefs", async (request, reply) => {
    const parsed = briefSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid brief", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ brief: await service.createBrief(parsed.data as CreateContentBriefInput) }); }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/content/briefs/:id/review", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const parsed = z.object({ approved: z.boolean(), reviewer: z.string().min(1) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid brief review", detail: parsed.error.flatten() });
    try { return { brief: await service.reviewBrief(id, parsed.data.approved, parsed.data.reviewer) }; }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/content/drafts", async (request, reply) => {
    const parsed = draftSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid draft", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ draft: await service.createDraft(parsed.data as CreateContentDraftInput) }); }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/content/drafts/:id/review", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const parsed = z.object({
      status: z.enum(["approved", "changes-requested", "rejected"]),
      reviewer: z.string().min(1),
      note: z.string().min(1),
    }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid draft review", detail: parsed.error.flatten() });
    try { return { draft: await service.reviewDraft(id, parsed.data.status, parsed.data.reviewer, parsed.data.note) }; }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/content/publication-plans", async (request, reply) => {
    const parsed = publicationSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid publication plan", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ plan: await service.createPublicationPlan(parsed.data as CreatePublicationPlanInput) }); }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/content/publication-plans/:id/approve", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const parsed = z.object({ approvedBy: z.string().min(1) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid publication approval" });
    try { return { plan: await service.approvePublicationPlan(id, parsed.data.approvedBy) }; }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/content/publication-plans/:id/record-publication", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const parsed = z.object({ actor: z.string().min(1), externalReference: z.string().min(1), publishedAt: z.string().min(1) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid publication record", detail: parsed.error.flatten() });
    try { return { plan: await service.recordManualPublication(id, parsed.data.actor, parsed.data.externalReference, parsed.data.publishedAt) }; }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/content/performance", async (request, reply) => {
    const parsed = performanceSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid performance record", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ performance: await service.recordPerformance(parsed.data as RecordPerformanceInput) }); }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/content/experiments", async (request, reply) => {
    const parsed = experimentSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid experiment", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ experiment: await service.createExperiment(parsed.data as CreateContentExperimentInput) }); }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/content/experiments/:id/complete", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const parsed = z.object({ actor: z.string().min(1), conclusion: z.string().min(1), evidenceRefs: z.array(z.string()).min(1) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid experiment completion", detail: parsed.error.flatten() });
    try { return { experiment: await service.completeExperiment(id, parsed.data.actor, parsed.data.conclusion, parsed.data.evidenceRefs) }; }
    catch (error) { return sendError(reply, error); }
  });

  app.get("/v1/content/context", async (request) => {
    const query = z.object({ brandId: z.string().optional(), draftId: z.string().optional() }).parse(request.query);
    return { context: await service.buildMissionContext(query.brandId, query.draftId) };
  });

  app.get("/v1/content/events", async (request) => {
    const query = z.object({ brandId: z.string().optional(), entityId: z.string().optional(), limit: z.coerce.number().int().min(1).max(1000).default(500) }).parse(request.query);
    return { events: await service.listEvents(query.brandId, query.entityId, query.limit) };
  });
};
