import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import type {
  CreateBusinessDecisionInput,
  CreateBusinessMeetingInput,
  CreateBusinessOrganizationInput,
  CreateBusinessProjectInput,
  CreateBusinessRiskInput,
  CreateBusinessSopInput,
  CreateFinancialScenarioInput,
} from "./service.js";
import { BusinessService } from "./service.js";
import { BUSINESS_ENTITY_TYPES } from "./types.js";

const sendError = (reply: FastifyReply, error: unknown) =>
  reply.code(400).send({ error: error instanceof Error ? error.message : "Business operation failed" });

const organizationSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  owner: z.string().min(1),
  currency: z.string().min(3).max(8).optional(),
  timezone: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const projectSchema = z.object({
  id: z.string().min(1).optional(),
  organizationId: z.string().min(1),
  name: z.string().min(1),
  objective: z.string().min(1),
  owner: z.string().min(1),
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  milestones: z.array(z.object({
    id: z.string().min(1).optional(),
    title: z.string().min(1),
    owner: z.string().min(1),
    dueAt: z.string().optional(),
    dependencies: z.array(z.string()).optional(),
  })).optional(),
  dependencies: z.array(z.string()).optional(),
  bottlenecks: z.array(z.string()).optional(),
  successCriteria: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const decisionSchema = z.object({
  id: z.string().min(1).optional(),
  organizationId: z.string().min(1),
  title: z.string().min(1),
  context: z.string().min(1),
  recommendation: z.string().min(1),
  rationale: z.string().min(1),
  proposedBy: z.string().min(1),
  evidenceRefs: z.array(z.string()).optional(),
  affectedProjectIds: z.array(z.string()).optional(),
});

const sopSchema = z.object({
  id: z.string().min(1).optional(),
  organizationId: z.string().min(1),
  name: z.string().min(1),
  purpose: z.string().min(1),
  owner: z.string().min(1),
  steps: z.array(z.object({
    instruction: z.string().min(1),
    verification: z.string().min(1),
    escalation: z.string().optional(),
  })).min(1),
  changeReason: z.string().optional(),
});

const financialScenarioSchema = z.object({
  id: z.string().min(1).optional(),
  organizationId: z.string().min(1),
  name: z.string().min(1),
  createdBy: z.string().min(1),
  periodLabel: z.string().min(1),
  revenue: z.number().nonnegative(),
  variableCostRate: z.number().min(0).max(1),
  fixedCosts: z.number().nonnegative(),
  cashOnHand: z.number().nonnegative(),
  notes: z.array(z.string()).optional(),
  evidenceRefs: z.array(z.string()).optional(),
});

const riskSchema = z.object({
  id: z.string().min(1).optional(),
  organizationId: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  likelihood: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  impact: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  owner: z.string().min(1),
  trigger: z.string().min(1),
  mitigation: z.string().min(1),
  contingency: z.string().min(1),
  evidenceRefs: z.array(z.string()).optional(),
});

const meetingSchema = z.object({
  id: z.string().min(1).optional(),
  organizationId: z.string().min(1),
  title: z.string().min(1),
  heldAt: z.string().min(1),
  attendees: z.array(z.string()).optional(),
  notes: z.string().min(1),
  decisionIds: z.array(z.string()).optional(),
  actions: z.array(z.object({
    id: z.string().min(1).optional(),
    description: z.string().min(1),
    owner: z.string().min(1),
    dueAt: z.string().optional(),
  })).optional(),
  recordedBy: z.string().min(1),
});

export const registerBusinessRoutes = (app: FastifyInstance, service: BusinessService): void => {
  app.post("/v1/business/organizations", async (request, reply) => {
    const parsed = organizationSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid organization", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ organization: await service.createOrganization(parsed.data as CreateBusinessOrganizationInput) }); }
    catch (error) { return sendError(reply, error); }
  });

  app.get("/v1/business/organizations", async () => ({ organizations: await service.listEntities("organization") }));

  app.get("/v1/business/entities/:type", async (request, reply) => {
    const params = z.object({ type: z.enum(BUSINESS_ENTITY_TYPES) }).safeParse(request.params);
    const query = z.object({ organizationId: z.string().optional(), limit: z.coerce.number().int().min(1).max(1000).default(200) }).safeParse(request.query);
    if (!params.success || !query.success) return reply.code(400).send({ error: "Invalid business entity query" });
    return { entities: await service.listEntities(params.data.type, query.data.organizationId, query.data.limit) };
  });

  app.get("/v1/business/entities/:type/:id", async (request, reply) => {
    const parsed = z.object({ type: z.enum(BUSINESS_ENTITY_TYPES), id: z.string().min(1) }).safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid business entity identifier" });
    try { return { entity: await service.getEntity(parsed.data.type, parsed.data.id) }; }
    catch (error) { return reply.code(404).send({ error: error instanceof Error ? error.message : "Business entity not found" }); }
  });

  app.post("/v1/business/projects", async (request, reply) => {
    const parsed = projectSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid project", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ project: await service.createProject(parsed.data as CreateBusinessProjectInput) }); }
    catch (error) { return sendError(reply, error); }
  });

  app.patch("/v1/business/projects/:id/status", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const parsed = z.object({
      status: z.enum(["planned", "active", "blocked", "completed", "cancelled"]),
      actor: z.string().min(1),
      evidence: z.array(z.string()).default([]),
    }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid project status update", detail: parsed.error.flatten() });
    try { return { project: await service.updateProjectStatus(params.id, parsed.data.status, parsed.data.actor, parsed.data.evidence) }; }
    catch (error) { return sendError(reply, error); }
  });

  app.patch("/v1/business/projects/:id/milestones/:milestoneId", async (request, reply) => {
    const params = z.object({ id: z.string().min(1), milestoneId: z.string().min(1) }).parse(request.params);
    const parsed = z.object({
      status: z.enum(["pending", "in-progress", "blocked", "completed", "cancelled"]),
      actor: z.string().min(1),
      evidence: z.array(z.string()).default([]),
    }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid milestone update", detail: parsed.error.flatten() });
    try { return { project: await service.updateMilestone(params.id, params.milestoneId, parsed.data.status, parsed.data.actor, parsed.data.evidence) }; }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/business/decisions", async (request, reply) => {
    const parsed = decisionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid decision", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ decision: await service.createDecision(parsed.data as CreateBusinessDecisionInput) }); }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/business/decisions/:id/transitions", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const parsed = z.object({
      to: z.enum(["recommendation", "decision", "authorized", "executing", "verified", "rejected"]),
      actor: z.string().min(1),
      rationale: z.string().min(1),
    }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid decision transition", detail: parsed.error.flatten() });
    try { return { decision: await service.transitionDecision(id, parsed.data.to, parsed.data.actor, parsed.data.rationale) }; }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/business/sops", async (request, reply) => {
    const parsed = sopSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid SOP", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ sop: await service.createSop(parsed.data as CreateBusinessSopInput) }); }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/business/sops/:id/review", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const parsed = z.object({ approved: z.boolean(), reviewer: z.string().min(1), reason: z.string().min(1) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid SOP review", detail: parsed.error.flatten() });
    try { return { sop: await service.reviewSop(id, parsed.data.approved, parsed.data.reviewer, parsed.data.reason) }; }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/business/financial-scenarios", async (request, reply) => {
    const parsed = financialScenarioSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid financial scenario", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ scenario: await service.createFinancialScenario(parsed.data as CreateFinancialScenarioInput) }); }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/business/risks", async (request, reply) => {
    const parsed = riskSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid risk", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ risk: await service.createRisk(parsed.data as CreateBusinessRiskInput) }); }
    catch (error) { return sendError(reply, error); }
  });

  app.patch("/v1/business/risks/:id/status", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const parsed = z.object({ status: z.enum(["open", "mitigating", "accepted", "closed"]), actor: z.string().min(1), reason: z.string().min(1) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid risk update", detail: parsed.error.flatten() });
    try { return { risk: await service.updateRiskStatus(id, parsed.data.status, parsed.data.actor, parsed.data.reason) }; }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/business/meetings", async (request, reply) => {
    const parsed = meetingSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid meeting", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ meeting: await service.createMeeting(parsed.data as CreateBusinessMeetingInput) }); }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/business/meetings/:id/actions/:actionId/complete", async (request, reply) => {
    const params = z.object({ id: z.string().min(1), actionId: z.string().min(1) }).parse(request.params);
    const parsed = z.object({ actor: z.string().min(1) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid action completion" });
    try { return { meeting: await service.completeMeetingAction(params.id, params.actionId, parsed.data.actor) }; }
    catch (error) { return sendError(reply, error); }
  });

  app.post("/v1/business/reports/weekly", async (request, reply) => {
    const parsed = z.object({ organizationId: z.string().min(1), weekStart: z.string().min(1), weekEnd: z.string().min(1), generatedBy: z.string().min(1) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid weekly report request", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ report: await service.generateWeeklyReport(parsed.data.organizationId, parsed.data.weekStart, parsed.data.weekEnd, parsed.data.generatedBy) }); }
    catch (error) { return sendError(reply, error); }
  });

  app.get("/v1/business/context", async (request) => {
    const query = z.object({ organizationId: z.string().optional() }).parse(request.query);
    return { context: await service.buildMissionContext(query.organizationId) };
  });

  app.get("/v1/business/events", async (request) => {
    const query = z.object({ organizationId: z.string().optional(), entityId: z.string().optional(), limit: z.coerce.number().int().min(1).max(1000).default(500) }).parse(request.query);
    return { events: await service.listEvents(query.organizationId, query.entityId, query.limit) };
  });
};
