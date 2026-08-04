import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import type {
  BiomedicalService,
  CreateBiomedicalClaimInput,
  CreateBiomedicalCommercializationInput,
  CreateBiomedicalContradictionInput,
  CreateBiomedicalDecisionGateInput,
  CreateBiomedicalDevelopmentPlanInput,
  CreateBiomedicalEdgeInput,
  CreateBiomedicalEngagementInput,
  CreateBiomedicalEvidenceInput,
  CreateBiomedicalFundingInput,
  CreateBiomedicalHypothesisInput,
  CreateBiomedicalIpInput,
  CreateBiomedicalLaboratoryInput,
  CreateBiomedicalManufacturingInput,
  CreateBiomedicalNodeInput,
  CreateBiomedicalProgramInput,
  CreateBiomedicalRegulatoryInput,
  CreateBiomedicalWorkspaceInput,
  EngagementTransitionInput,
  EvidenceReviewInput,
} from "./service.js";
import type { BiomedicalEntityType } from "./types.js";

const idParams = z.object({ id: z.string().min(1).max(300) });
const objectBody = z.record(z.string(), z.unknown());
const reviewBody = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewedBy: z.string().min(1),
  reason: z.string().min(3),
});

const parsedObject = <T>(body: unknown): T => objectBody.parse(body) as unknown as T;
const handle = async <T>(reply: FastifyReply, action: () => Promise<T>, key: string, statusCode = 201) => {
  try {
    return reply.code(statusCode).send({ [key]: await action() });
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : "Biomedical operation failed" });
  }
};

export const registerBiomedicalRoutes = (app: FastifyInstance, service: BiomedicalService): void => {
  app.post("/v1/biomedical/workspaces", async (request, reply) =>
    handle(reply, () => service.createWorkspace(parsedObject<CreateBiomedicalWorkspaceInput>(request.body)), "workspace"));

  app.post("/v1/biomedical/programs", async (request, reply) =>
    handle(reply, () => service.createProgram(parsedObject<CreateBiomedicalProgramInput>(request.body)), "program"));

  app.post("/v1/biomedical/evidence", async (request, reply) =>
    handle(reply, () => service.createEvidence(parsedObject<CreateBiomedicalEvidenceInput>(request.body)), "evidence"));

  app.post("/v1/biomedical/evidence/:id/review", async (request, reply) => {
    const { id } = idParams.parse(request.params);
    return handle(reply, () => service.reviewEvidence(id, parsedObject<EvidenceReviewInput>(request.body)), "evidence", 200);
  });

  app.post("/v1/biomedical/claims", async (request, reply) =>
    handle(reply, () => service.createClaim(parsedObject<CreateBiomedicalClaimInput>(request.body)), "claim"));

  app.post("/v1/biomedical/claims/:id/review", async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const parsed = reviewBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid claim review", detail: parsed.error.flatten() });
    return handle(reply, () => service.reviewClaim(id, parsed.data.status, parsed.data.reviewedBy, parsed.data.reason), "claim", 200);
  });

  app.post("/v1/biomedical/contradictions", async (request, reply) =>
    handle(reply, () => service.createContradiction(parsedObject<CreateBiomedicalContradictionInput>(request.body)), "contradiction"));

  app.post("/v1/biomedical/contradictions/:id/resolve", async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const parsed = z.object({
      status: z.enum(["partially-resolved", "resolved", "accepted-uncertainty"]),
      reviewedBy: z.string().min(1),
      summary: z.string().min(3),
    }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid contradiction resolution", detail: parsed.error.flatten() });
    return handle(reply, () => service.resolveContradiction(id, parsed.data.status, parsed.data.reviewedBy, parsed.data.summary), "contradiction", 200);
  });

  app.post("/v1/biomedical/graph/nodes", async (request, reply) =>
    handle(reply, () => service.createNode(parsedObject<CreateBiomedicalNodeInput>(request.body)), "node"));

  app.post("/v1/biomedical/graph/nodes/:id/review", async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const parsed = reviewBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid node review", detail: parsed.error.flatten() });
    return handle(reply, () => service.reviewNode(id, parsed.data.status, parsed.data.reviewedBy), "node", 200);
  });

  app.post("/v1/biomedical/graph/edges", async (request, reply) =>
    handle(reply, () => service.createEdge(parsedObject<CreateBiomedicalEdgeInput>(request.body)), "edge"));

  app.post("/v1/biomedical/graph/edges/:id/review", async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const parsed = reviewBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid edge review", detail: parsed.error.flatten() });
    return handle(reply, () => service.reviewEdge(id, parsed.data.status, parsed.data.reviewedBy), "edge", 200);
  });

  app.post("/v1/biomedical/hypotheses", async (request, reply) =>
    handle(reply, () => service.createHypothesis(parsedObject<CreateBiomedicalHypothesisInput>(request.body)), "hypothesis"));

  app.post("/v1/biomedical/hypotheses/:id/review", async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const parsed = reviewBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid hypothesis review", detail: parsed.error.flatten() });
    return handle(reply, () => service.reviewHypothesis(id, parsed.data.status, parsed.data.reviewedBy, parsed.data.reason), "hypothesis", 200);
  });

  app.post("/v1/biomedical/development-plans", async (request, reply) =>
    handle(reply, () => service.createDevelopmentPlan(parsedObject<CreateBiomedicalDevelopmentPlanInput>(request.body)), "developmentPlan"));

  app.post("/v1/biomedical/development-plans/:id/review", async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const parsed = reviewBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid development-plan review", detail: parsed.error.flatten() });
    return handle(reply, () => service.reviewDevelopmentPlan(id, parsed.data.status, parsed.data.reviewedBy, parsed.data.reason), "developmentPlan", 200);
  });

  app.post("/v1/biomedical/laboratories", async (request, reply) =>
    handle(reply, () => service.createLaboratory(parsedObject<CreateBiomedicalLaboratoryInput>(request.body)), "laboratory"));

  app.post("/v1/biomedical/laboratories/:id/qualify", async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const parsed = z.object({
      status: z.enum(["qualified", "rejected", "suspended"]),
      qualifiedBy: z.string().min(1),
      reason: z.string().min(3),
    }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid laboratory qualification", detail: parsed.error.flatten() });
    return handle(reply, () => service.qualifyLaboratory(id, parsed.data.status, parsed.data.qualifiedBy, parsed.data.reason), "laboratory", 200);
  });

  app.post("/v1/biomedical/laboratory-engagements", async (request, reply) =>
    handle(reply, () => service.createEngagement(parsedObject<CreateBiomedicalEngagementInput>(request.body)), "engagement"));

  app.post("/v1/biomedical/laboratory-engagements/:id/transitions", async (request, reply) => {
    const { id } = idParams.parse(request.params);
    return handle(reply, () => service.transitionEngagement(id, parsedObject<EngagementTransitionInput>(request.body)), "engagement", 200);
  });

  app.post("/v1/biomedical/regulatory-pathways", async (request, reply) =>
    handle(reply, () => service.createRegulatoryPathway(parsedObject<CreateBiomedicalRegulatoryInput>(request.body)), "regulatoryPathway"));

  app.post("/v1/biomedical/regulatory-pathways/:id/review", async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const parsed = reviewBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid regulatory review", detail: parsed.error.flatten() });
    return handle(reply, () => service.reviewRegulatoryPathway(id, parsed.data.status, parsed.data.reviewedBy), "regulatoryPathway", 200);
  });

  app.post("/v1/biomedical/ip-assets", async (request, reply) =>
    handle(reply, () => service.createIpAsset(parsedObject<CreateBiomedicalIpInput>(request.body)), "ipAsset"));

  app.post("/v1/biomedical/ip-assets/:id/status", async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const parsed = z.object({
      status: z.enum(["candidate", "disclosure-ready", "filed", "licensed", "abandoned"]),
      reviewer: z.string().min(1),
    }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid IP status", detail: parsed.error.flatten() });
    return handle(reply, () => service.advanceIpAsset(id, parsed.data.status, parsed.data.reviewer), "ipAsset", 200);
  });

  app.post("/v1/biomedical/funding-opportunities", async (request, reply) =>
    handle(reply, () => service.createFundingOpportunity(parsedObject<CreateBiomedicalFundingInput>(request.body)), "fundingOpportunity"));

  app.post("/v1/biomedical/manufacturing-plans", async (request, reply) =>
    handle(reply, () => service.createManufacturingPlan(parsedObject<CreateBiomedicalManufacturingInput>(request.body)), "manufacturingPlan"));

  app.post("/v1/biomedical/commercialization-plans", async (request, reply) =>
    handle(reply, () => service.createCommercializationPlan(parsedObject<CreateBiomedicalCommercializationInput>(request.body)), "commercializationPlan"));

  app.post("/v1/biomedical/decision-gates", async (request, reply) =>
    handle(reply, () => service.createDecisionGate(parsedObject<CreateBiomedicalDecisionGateInput>(request.body)), "decisionGate"));

  app.post("/v1/biomedical/decision-gates/:id/decide", async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const parsed = z.object({ decidedBy: z.string().min(1), decision: z.string().min(3) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid gate decision", detail: parsed.error.flatten() });
    return handle(reply, () => service.decideGate(id, parsed.data.decidedBy, parsed.data.decision), "decisionGate", 200);
  });

  app.post("/v1/biomedical/decision-gates/:id/verify", async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const parsed = z.object({ actor: z.string().min(1), evidenceRefs: z.array(z.string().min(1)).min(1) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid gate verification", detail: parsed.error.flatten() });
    return handle(reply, () => service.verifyGate(id, parsed.data.actor, parsed.data.evidenceRefs), "decisionGate", 200);
  });

  app.get("/v1/biomedical/entities", async (request) => {
    const query = z.object({
      type: z.enum(["workspace", "research-program", "evidence-source", "claim", "contradiction", "knowledge-node", "knowledge-edge", "hypothesis", "development-plan", "laboratory-partner", "laboratory-engagement", "regulatory-pathway", "ip-asset", "funding-opportunity", "manufacturing-plan", "commercialization-plan", "decision-gate"]),
      workspaceId: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(5000).default(500),
    }).parse(request.query);
    return { entities: await service.listEntities(query.type as BiomedicalEntityType, query.workspaceId, query.limit) };
  });

  app.get("/v1/biomedical/context", async (request, reply) => {
    const query = z.object({ workspaceId: z.string().min(1), programId: z.string().optional() }).safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: "workspaceId is required", detail: query.error.flatten() });
    return handle(reply, () => service.buildMissionContext(query.data.workspaceId, query.data.programId), "context", 200);
  });

  app.get("/v1/biomedical/events", async (request) => {
    const query = z.object({
      workspaceId: z.string().optional(),
      entityId: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(5000).default(500),
    }).parse(request.query);
    return { events: await service.listEvents(query.workspaceId, query.entityId, query.limit) };
  });
};
