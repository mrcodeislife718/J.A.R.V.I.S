import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import type { SupportService } from "./service.js";
import { SUPPORT_ENTITY_TYPES } from "./types.js";

const categories = [
  "technical",
  "billing",
  "account",
  "refund",
  "security",
  "privacy",
  "legal",
  "safety",
  "product-feedback",
  "general",
] as const;

const actionKinds = [
  "standard-response",
  "troubleshooting-step",
  "refund",
  "account-change",
  "policy-exception",
  "legal-response",
  "human-handoff",
] as const;

const failure = (reply: FastifyReply, error: unknown) =>
  reply.code(400).send({ error: error instanceof Error ? error.message : "Customer support operation failed" });

const workspaceSchema = z.object({
  id: z.string().min(1).max(200).optional(),
  name: z.string().min(1).max(300),
  owner: z.string().min(1).max(200),
  description: z.string().max(5_000).optional(),
  defaultSlaMinutes: z.number().int().positive().max(525_600).optional(),
  escalationTeams: z.array(z.string().min(1).max(200)).max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const customerSchema = z.object({
  id: z.string().min(1).max(200).optional(),
  workspaceId: z.string().min(1).max(200),
  externalRef: z.string().min(1).max(500),
  displayName: z.string().min(1).max(300),
  segment: z.string().max(200).optional(),
  riskFlags: z.array(z.string().min(1).max(200)).max(100).optional(),
  consentState: z.enum(["unknown", "granted", "withdrawn"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const productSchema = z.object({
  id: z.string().min(1).max(200).optional(),
  workspaceId: z.string().min(1).max(200),
  name: z.string().min(1).max(300),
  version: z.string().max(200).optional(),
  ownerTeam: z.string().min(1).max(200),
  supportChannels: z.array(z.string().min(1).max(100)).max(50).optional(),
  knownIssueRefs: z.array(z.string().min(1).max(500)).max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const policySchema = z.object({
  id: z.string().min(1).max(200).optional(),
  workspaceId: z.string().min(1).max(200),
  name: z.string().min(1).max(300),
  category: z.enum(categories),
  version: z.number().int().positive(),
  body: z.string().min(1).max(100_000),
  sourceRef: z.string().min(1).max(2_000),
  effectiveFrom: z.string().min(1).max(100),
  effectiveTo: z.string().min(1).max(100).optional(),
  requiresHumanApproval: z.boolean().optional(),
  approvedActionKinds: z.array(z.enum(actionKinds)).max(20).optional(),
});

const reviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewedBy: z.string().min(1).max(200),
  reason: z.string().min(3).max(5_000),
});

const playbookSchema = z.object({
  id: z.string().min(1).max(200).optional(),
  workspaceId: z.string().min(1).max(200),
  name: z.string().min(1).max(300),
  productId: z.string().min(1).max(200).optional(),
  category: z.enum(categories),
  version: z.number().int().positive(),
  steps: z.array(z.object({
    order: z.number().int().positive(),
    instruction: z.string().min(1).max(10_000),
    expectedSignal: z.string().min(1).max(5_000),
    failureEscalation: z.string().max(5_000).optional(),
    requiresHuman: z.boolean().optional(),
  })).min(1).max(100),
});

const ticketSchema = z.object({
  id: z.string().min(1).max(200).optional(),
  workspaceId: z.string().min(1).max(200),
  customerId: z.string().min(1).max(200),
  productId: z.string().min(1).max(200).optional(),
  subject: z.string().min(1).max(1_000),
  description: z.string().min(1).max(100_000),
  channel: z.string().min(1).max(100),
  failureSignature: z.string().max(500).optional(),
  createdBy: z.string().min(1).max(200),
});

const messageSchema = z.object({
  authorType: z.enum(["customer", "agent", "system"]),
  body: z.string().min(1).max(100_000),
  actor: z.string().min(1).max(200),
});

const handoffSchema = z.object({
  targetTeam: z.string().min(1).max(200),
  reason: z.string().min(3).max(5_000),
  summary: z.string().min(3).max(10_000),
  requestedBy: z.string().min(1).max(200),
});

const actionSchema = z.object({
  id: z.string().min(1).max(200).optional(),
  workspaceId: z.string().min(1).max(200),
  ticketId: z.string().min(1).max(200),
  kind: z.enum(actionKinds),
  summary: z.string().min(3).max(10_000),
  requestedBy: z.string().min(1).max(200),
  policyId: z.string().min(1).max(200).optional(),
  amount: z.number().positive().max(1_000_000_000).optional(),
  currency: z.string().min(3).max(3).optional(),
  requestedScope: z.string().min(3).max(5_000),
  evidenceRefs: z.array(z.string().min(1).max(2_000)).max(500).optional(),
  idempotencyKey: z.string().min(3).max(500),
});

const approvalSchema = z.object({
  approvedBy: z.string().min(1).max(200),
  reason: z.string().min(3).max(5_000),
});

const rejectionSchema = z.object({
  rejectedBy: z.string().min(1).max(200),
  reason: z.string().min(3).max(5_000),
});

const completionSchema = z.object({
  completedBy: z.string().min(1).max(200),
  externalReference: z.string().min(1).max(2_000),
  outcome: z.string().min(3).max(10_000),
  evidenceRefs: z.array(z.string().min(1).max(2_000)).min(1).max(500),
});

const resolutionSchema = z.object({
  resolvedBy: z.string().min(1).max(200),
  summary: z.string().min(3).max(10_000),
  evidenceRefs: z.array(z.string().min(1).max(2_000)).min(1).max(500),
});

const qualitySchema = z.object({
  ticketId: z.string().min(1).max(200),
  reviewedBy: z.string().min(1).max(200),
  scores: z.object({
    policyAccuracy: z.number().min(0).max(100),
    diagnosisQuality: z.number().min(0).max(100),
    communicationQuality: z.number().min(0).max(100),
    escalationQuality: z.number().min(0).max(100),
    evidenceQuality: z.number().min(0).max(100),
  }),
  findings: z.array(z.string().min(1).max(5_000)).max(100).default([]),
  correctiveActions: z.array(z.string().min(1).max(5_000)).max(100).default([]),
});

export const registerSupportRoutes = (app: FastifyInstance, service: SupportService): void => {
  app.post("/v1/support/workspaces", async (request, reply) => {
    const parsed = workspaceSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid support workspace", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ workspace: await service.createWorkspace(parsed.data) }); } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/customers", async (request, reply) => {
    const parsed = customerSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid customer", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ customer: await service.createCustomer(parsed.data) }); } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/products", async (request, reply) => {
    const parsed = productSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid product", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ product: await service.createProduct(parsed.data) }); } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/policies", async (request, reply) => {
    const parsed = policySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid support policy", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ policy: await service.createPolicy(parsed.data) }); } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/policies/:id/review", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = reviewSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid policy review", detail: parsed.error.flatten() });
    try { return { policy: await service.reviewPolicy(id, parsed.data.status, parsed.data.reviewedBy, parsed.data.reason) }; } catch (error) { return failure(reply, error); }
  });

  app.get("/v1/support/policies", async (request, reply) => {
    const parsed = z.object({ workspaceId: z.string().min(1), approvedOnly: z.coerce.boolean().default(false), limit: z.coerce.number().int().positive().max(1_000).default(200) }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid policy query", detail: parsed.error.flatten() });
    try {
      const policies = parsed.data.approvedOnly
        ? await service.approvedPolicies(parsed.data.workspaceId)
        : await service.listPolicies(parsed.data.workspaceId, parsed.data.limit);
      return { policies };
    } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/playbooks", async (request, reply) => {
    const parsed = playbookSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid support playbook", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ playbook: await service.createPlaybook(parsed.data) }); } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/playbooks/:id/review", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = reviewSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid playbook review", detail: parsed.error.flatten() });
    try { return { playbook: await service.reviewPlaybook(id, parsed.data.status, parsed.data.reviewedBy, parsed.data.reason) }; } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/tickets", async (request, reply) => {
    const parsed = ticketSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid support ticket", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ ticket: await service.createTicket(parsed.data) }); } catch (error) { return failure(reply, error); }
  });

  app.get("/v1/support/tickets", async (request, reply) => {
    const parsed = z.object({ workspaceId: z.string().min(1), limit: z.coerce.number().int().positive().max(5_000).default(200) }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid ticket query", detail: parsed.error.flatten() });
    try { return { tickets: await service.listTickets(parsed.data.workspaceId, parsed.data.limit) }; } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/tickets/:id/messages", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = messageSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid support message", detail: parsed.error.flatten() });
    try { return { ticket: await service.addMessage(id, parsed.data.authorType, parsed.data.body, parsed.data.actor) }; } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/tickets/:id/triage", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = z.object({ actor: z.string().min(1).max(200) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid triage request", detail: parsed.error.flatten() });
    try { return { ticket: await service.triageTicket(id, parsed.data.actor) }; } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/tickets/:id/attach-policies", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = z.object({ actor: z.string().min(1).max(200) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid policy attachment request", detail: parsed.error.flatten() });
    try { return { ticket: await service.attachCurrentPolicies(id, parsed.data.actor) }; } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/tickets/:id/troubleshooting-plan", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = z.object({ actor: z.string().min(1).max(200) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid troubleshooting request", detail: parsed.error.flatten() });
    try { return { ticket: await service.buildTroubleshootingPlan(id, parsed.data.actor) }; } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/tickets/:id/handoffs", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = handoffSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid handoff", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ handoff: await service.createHandoff(id, parsed.data.targetTeam, parsed.data.reason, parsed.data.summary, parsed.data.requestedBy) }); } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/handoffs/:id/accept", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = z.object({ acceptedBy: z.string().min(1).max(200) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid handoff acceptance", detail: parsed.error.flatten() });
    try { return { handoff: await service.acceptHandoff(id, parsed.data.acceptedBy) }; } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/actions", async (request, reply) => {
    const parsed = actionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid support action", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ action: await service.createAction(parsed.data) }); } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/actions/:id/approve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = approvalSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid action approval", detail: parsed.error.flatten() });
    try { return { action: await service.approveAction(id, parsed.data.approvedBy, parsed.data.reason) }; } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/actions/:id/reject", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = rejectionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid action rejection", detail: parsed.error.flatten() });
    try { return { action: await service.rejectAction(id, parsed.data.rejectedBy, parsed.data.reason) }; } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/actions/:id/record-completion", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = completionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid action completion", detail: parsed.error.flatten() });
    try { return { action: await service.recordActionCompletion(id, parsed.data.completedBy, parsed.data.externalReference, parsed.data.outcome, parsed.data.evidenceRefs) }; } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/tickets/:id/resolve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = resolutionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid ticket resolution", detail: parsed.error.flatten() });
    try { return { ticket: await service.resolveTicket(id, parsed.data.resolvedBy, parsed.data.summary, parsed.data.evidenceRefs) }; } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/quality-reviews", async (request, reply) => {
    const parsed = qualitySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid quality review", detail: parsed.error.flatten() });
    try { return reply.code(201).send({ review: await service.createQualityReview(parsed.data.ticketId, parsed.data.reviewedBy, parsed.data.scores, parsed.data.findings, parsed.data.correctiveActions) }); } catch (error) { return failure(reply, error); }
  });

  app.post("/v1/support/failure-clusters/rebuild", async (request, reply) => {
    const parsed = z.object({ workspaceId: z.string().min(1).max(200), actor: z.string().min(1).max(200) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid cluster rebuild", detail: parsed.error.flatten() });
    try { return { clusters: await service.rebuildFailureClusters(parsed.data.workspaceId, parsed.data.actor) }; } catch (error) { return failure(reply, error); }
  });

  app.get("/v1/support/context", async (request, reply) => {
    const parsed = z.object({ workspaceId: z.string().min(1).optional(), ticketId: z.string().min(1).optional() }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid support context query", detail: parsed.error.flatten() });
    try { return { context: await service.buildMissionContext(parsed.data.workspaceId, parsed.data.ticketId) }; } catch (error) { return failure(reply, error); }
  });

  app.get("/v1/support/events", async (request, reply) => {
    const parsed = z.object({ workspaceId: z.string().min(1).optional(), entityId: z.string().min(1).optional(), limit: z.coerce.number().int().positive().max(5_000).default(500) }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid event query", detail: parsed.error.flatten() });
    try { return { events: await service.listEvents(parsed.data.workspaceId, parsed.data.entityId, parsed.data.limit) }; } catch (error) { return failure(reply, error); }
  });

  app.get("/v1/support/entity-types", async () => ({ entityTypes: SUPPORT_ENTITY_TYPES }));
};
