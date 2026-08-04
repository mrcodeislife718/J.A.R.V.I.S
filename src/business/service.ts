import { randomUUID } from "node:crypto";
import type { BusinessRepository } from "./repository.js";
import type {
  BusinessDecision,
  BusinessDecisionStage,
  BusinessEntity,
  BusinessEntityType,
  BusinessFinancialScenario,
  BusinessMeeting,
  BusinessMissionContext,
  BusinessOrganization,
  BusinessProject,
  BusinessRisk,
  BusinessRiskStatus,
  BusinessSop,
  BusinessWeeklyReport,
} from "./types.js";

export interface CreateBusinessOrganizationInput {
  id?: string;
  name: string;
  description?: string;
  owner: string;
  currency?: string;
  timezone?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateBusinessProjectInput {
  id?: string;
  organizationId: string;
  name: string;
  objective: string;
  owner: string;
  priority?: BusinessProject["priority"];
  startDate?: string;
  targetDate?: string;
  milestones?: Array<{
    id?: string;
    title: string;
    owner: string;
    dueAt?: string;
    dependencies?: string[];
  }>;
  dependencies?: string[];
  bottlenecks?: string[];
  successCriteria?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateBusinessDecisionInput {
  id?: string;
  organizationId: string;
  title: string;
  context: string;
  recommendation: string;
  rationale: string;
  proposedBy: string;
  evidenceRefs?: string[];
  affectedProjectIds?: string[];
}

export interface CreateBusinessSopInput {
  id?: string;
  organizationId: string;
  name: string;
  purpose: string;
  owner: string;
  steps: Array<{ instruction: string; verification: string; escalation?: string }>;
  changeReason?: string;
}

export interface CreateFinancialScenarioInput {
  id?: string;
  organizationId: string;
  name: string;
  createdBy: string;
  periodLabel: string;
  revenue: number;
  variableCostRate: number;
  fixedCosts: number;
  cashOnHand: number;
  notes?: string[];
  evidenceRefs?: string[];
}

export interface CreateBusinessRiskInput {
  id?: string;
  organizationId: string;
  title: string;
  category: string;
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  owner: string;
  trigger: string;
  mitigation: string;
  contingency: string;
  evidenceRefs?: string[];
}

export interface CreateBusinessMeetingInput {
  id?: string;
  organizationId: string;
  title: string;
  heldAt: string;
  attendees?: string[];
  notes: string;
  decisionIds?: string[];
  actions?: Array<{ id?: string; description: string; owner: string; dueAt?: string }>;
  recordedBy: string;
}

const unique = (values: string[] | undefined): string[] =>
  [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))].sort();

const requireText = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
};

const requireMoney = (value: number, label: string): number => {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative finite number`);
  return value;
};

const round = (value: number): number => Math.round(value * 100) / 100;

const stageOrder: BusinessDecisionStage[] = ["recommendation", "decision", "authorized", "executing", "verified"];

export class BusinessService {
  constructor(private readonly repository: BusinessRepository) {}

  async createOrganization(input: CreateBusinessOrganizationInput): Promise<BusinessOrganization> {
    const now = new Date().toISOString();
    const id = input.id?.trim() || randomUUID();
    const existing = await this.repository.get("organization", id);
    const organization: BusinessOrganization = {
      id,
      entityType: "organization",
      organizationId: id,
      name: requireText(input.name, "Organization name"),
      description: input.description?.trim() || null,
      owner: requireText(input.owner, "Organization owner"),
      currency: (input.currency?.trim() || "USD").toUpperCase(),
      timezone: input.timezone?.trim() || "UTC",
      status: existing?.entityType === "organization" ? existing.status : "active",
      metadata: { ...(existing?.entityType === "organization" ? existing.metadata : {}), ...(input.metadata ?? {}) },
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.repository.save(organization);
    await this.event(organization, existing ? "organization.updated" : "organization.created", organization.owner, `Stored organization ${organization.name}`);
    return organization;
  }

  async createProject(input: CreateBusinessProjectInput): Promise<BusinessProject> {
    await this.requireOrganization(input.organizationId);
    const now = new Date().toISOString();
    const project: BusinessProject = {
      id: input.id?.trim() || randomUUID(),
      entityType: "project",
      organizationId: input.organizationId,
      name: requireText(input.name, "Project name"),
      objective: requireText(input.objective, "Project objective"),
      owner: requireText(input.owner, "Project owner"),
      status: "planned",
      priority: input.priority ?? "normal",
      startDate: input.startDate ?? null,
      targetDate: input.targetDate ?? null,
      milestones: (input.milestones ?? []).map((milestone) => ({
        id: milestone.id?.trim() || randomUUID(),
        title: requireText(milestone.title, "Milestone title"),
        owner: requireText(milestone.owner, "Milestone owner"),
        dueAt: milestone.dueAt ?? null,
        status: "pending",
        dependencies: unique(milestone.dependencies),
        completionEvidence: [],
      })),
      dependencies: unique(input.dependencies),
      bottlenecks: unique(input.bottlenecks),
      successCriteria: unique(input.successCriteria),
      metadata: structuredClone(input.metadata ?? {}),
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.save(project);
    await this.event(project, "project.created", project.owner, `Created project ${project.name}`);
    return project;
  }

  async updateProjectStatus(
    projectId: string,
    status: BusinessProject["status"],
    actor: string,
    evidence: string[] = [],
  ): Promise<BusinessProject> {
    const project = await this.requireEntity("project", projectId);
    project.status = status;
    project.updatedAt = new Date().toISOString();
    if (status === "completed") {
      const incomplete = project.milestones.filter((milestone) => milestone.status !== "completed" && milestone.status !== "cancelled");
      if (incomplete.length > 0) throw new Error("Project cannot be completed while milestones remain incomplete");
      project.metadata = { ...project.metadata, completionEvidence: unique(evidence) };
    }
    await this.repository.save(project);
    await this.event(project, "project.status-changed", actor, `Changed ${project.name} to ${status}`, { evidence: unique(evidence) });
    return project;
  }

  async updateMilestone(
    projectId: string,
    milestoneId: string,
    status: BusinessProject["milestones"][number]["status"],
    actor: string,
    evidence: string[] = [],
  ): Promise<BusinessProject> {
    const project = await this.requireEntity("project", projectId);
    const milestone = project.milestones.find((item) => item.id === milestoneId);
    if (!milestone) throw new Error("Milestone not found");
    if (status === "completed" && evidence.length === 0) throw new Error("Completed milestones require verification evidence");
    milestone.status = status;
    milestone.completionEvidence = unique(evidence);
    project.status = status === "blocked" ? "blocked" : project.status === "planned" ? "active" : project.status;
    project.updatedAt = new Date().toISOString();
    await this.repository.save(project);
    await this.event(project, "project.milestone-updated", actor, `Changed milestone ${milestone.title} to ${status}`, { milestoneId, evidence: milestone.completionEvidence });
    return project;
  }

  async createDecision(input: CreateBusinessDecisionInput): Promise<BusinessDecision> {
    await this.requireOrganization(input.organizationId);
    for (const projectId of unique(input.affectedProjectIds)) await this.requireEntity("project", projectId);
    const now = new Date().toISOString();
    const decision: BusinessDecision = {
      id: input.id?.trim() || randomUUID(),
      entityType: "decision",
      organizationId: input.organizationId,
      title: requireText(input.title, "Decision title"),
      context: requireText(input.context, "Decision context"),
      recommendation: requireText(input.recommendation, "Recommendation"),
      rationale: requireText(input.rationale, "Decision rationale"),
      stage: "recommendation",
      proposedBy: requireText(input.proposedBy, "Proposer"),
      decidedBy: null,
      authorizedBy: null,
      executedBy: null,
      verifiedBy: null,
      evidenceRefs: unique(input.evidenceRefs),
      affectedProjectIds: unique(input.affectedProjectIds),
      transitionHistory: [{
        from: null,
        to: "recommendation",
        actor: input.proposedBy.trim(),
        rationale: input.rationale.trim(),
        occurredAt: now,
      }],
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.save(decision);
    await this.event(decision, "decision.recommended", decision.proposedBy, `Recorded recommendation ${decision.title}`);
    return decision;
  }

  async transitionDecision(
    decisionId: string,
    to: BusinessDecisionStage,
    actor: string,
    rationale: string,
  ): Promise<BusinessDecision> {
    const decision = await this.requireEntity("decision", decisionId);
    if (decision.stage === "verified" || decision.stage === "rejected") throw new Error("Final decisions cannot transition again");
    if (to !== "rejected") {
      const currentIndex = stageOrder.indexOf(decision.stage);
      const requestedIndex = stageOrder.indexOf(to);
      if (requestedIndex !== currentIndex + 1) {
        throw new Error(`Decision must transition from ${decision.stage} to ${stageOrder[currentIndex + 1] ?? "a final state"}`);
      }
    }
    const normalizedActor = requireText(actor, "Decision actor");
    const normalizedRationale = requireText(rationale, "Transition rationale");
    const now = new Date().toISOString();
    const from = decision.stage;
    decision.stage = to;
    if (to === "decision") decision.decidedBy = normalizedActor;
    if (to === "authorized") decision.authorizedBy = normalizedActor;
    if (to === "executing") decision.executedBy = normalizedActor;
    if (to === "verified") decision.verifiedBy = normalizedActor;
    decision.transitionHistory.push({ from, to, actor: normalizedActor, rationale: normalizedRationale, occurredAt: now });
    decision.updatedAt = now;
    await this.repository.save(decision);
    await this.event(decision, `decision.${to}`, normalizedActor, `Transitioned ${decision.title} from ${from} to ${to}`, { rationale: normalizedRationale });
    return decision;
  }

  async createSop(input: CreateBusinessSopInput): Promise<BusinessSop> {
    await this.requireOrganization(input.organizationId);
    if (input.steps.length === 0) throw new Error("An SOP requires at least one step");
    const now = new Date().toISOString();
    const sop: BusinessSop = {
      id: input.id?.trim() || randomUUID(),
      entityType: "sop",
      organizationId: input.organizationId,
      name: requireText(input.name, "SOP name"),
      purpose: requireText(input.purpose, "SOP purpose"),
      owner: requireText(input.owner, "SOP owner"),
      status: "candidate",
      version: 1,
      steps: input.steps.map((step, index) => ({
        order: index + 1,
        instruction: requireText(step.instruction, "SOP instruction"),
        verification: requireText(step.verification, "SOP verification"),
        escalation: step.escalation?.trim() || null,
      })),
      reviewedBy: null,
      reviewedAt: null,
      changeReason: input.changeReason?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.save(sop);
    await this.event(sop, "sop.candidate-created", sop.owner, `Created candidate SOP ${sop.name}`);
    return sop;
  }

  async reviewSop(sopId: string, approved: boolean, reviewer: string, reason: string): Promise<BusinessSop> {
    const sop = await this.requireEntity("sop", sopId);
    if (sop.status !== "candidate") throw new Error("Only candidate SOPs can be reviewed");
    sop.status = approved ? "approved" : "rejected";
    sop.reviewedBy = requireText(reviewer, "SOP reviewer");
    sop.reviewedAt = new Date().toISOString();
    sop.changeReason = requireText(reason, "Review reason");
    sop.updatedAt = sop.reviewedAt;
    await this.repository.save(sop);
    await this.event(sop, approved ? "sop.approved" : "sop.rejected", sop.reviewedBy, `${approved ? "Approved" : "Rejected"} SOP ${sop.name}`, { reason: sop.changeReason });
    return sop;
  }

  async createFinancialScenario(input: CreateFinancialScenarioInput): Promise<BusinessFinancialScenario> {
    await this.requireOrganization(input.organizationId);
    const revenue = requireMoney(input.revenue, "Revenue");
    const fixedCosts = requireMoney(input.fixedCosts, "Fixed costs");
    const cashOnHand = requireMoney(input.cashOnHand, "Cash on hand");
    if (!Number.isFinite(input.variableCostRate) || input.variableCostRate < 0 || input.variableCostRate > 1) {
      throw new Error("Variable cost rate must be between 0 and 1");
    }
    const variableCosts = revenue * input.variableCostRate;
    const contributionMargin = revenue - variableCosts;
    const operatingProfit = contributionMargin - fixedCosts;
    const monthlyBurn = Math.max(0, -operatingProfit);
    const marginRate = 1 - input.variableCostRate;
    const now = new Date().toISOString();
    const scenario: BusinessFinancialScenario = {
      id: input.id?.trim() || randomUUID(),
      entityType: "financial-scenario",
      organizationId: input.organizationId,
      name: requireText(input.name, "Scenario name"),
      createdBy: requireText(input.createdBy, "Scenario creator"),
      periodLabel: requireText(input.periodLabel, "Scenario period"),
      assumptions: { revenue, variableCostRate: input.variableCostRate, fixedCosts, cashOnHand },
      outputs: {
        variableCosts: round(variableCosts),
        contributionMargin: round(contributionMargin),
        operatingProfit: round(operatingProfit),
        monthlyBurn: round(monthlyBurn),
        runwayMonths: monthlyBurn > 0 ? round(cashOnHand / monthlyBurn) : null,
        breakEvenRevenue: marginRate > 0 ? round(fixedCosts / marginRate) : null,
      },
      notes: unique(input.notes),
      evidenceRefs: unique(input.evidenceRefs),
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.save(scenario);
    await this.event(scenario, "finance.scenario-created", scenario.createdBy, `Calculated financial scenario ${scenario.name}`);
    return scenario;
  }

  async createRisk(input: CreateBusinessRiskInput): Promise<BusinessRisk> {
    await this.requireOrganization(input.organizationId);
    const now = new Date().toISOString();
    const risk: BusinessRisk = {
      id: input.id?.trim() || randomUUID(),
      entityType: "risk",
      organizationId: input.organizationId,
      title: requireText(input.title, "Risk title"),
      category: requireText(input.category, "Risk category"),
      likelihood: input.likelihood,
      impact: input.impact,
      score: input.likelihood * input.impact,
      status: "open",
      owner: requireText(input.owner, "Risk owner"),
      trigger: requireText(input.trigger, "Risk trigger"),
      mitigation: requireText(input.mitigation, "Risk mitigation"),
      contingency: requireText(input.contingency, "Risk contingency"),
      evidenceRefs: unique(input.evidenceRefs),
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.save(risk);
    await this.event(risk, "risk.created", risk.owner, `Registered risk ${risk.title}`, { score: risk.score });
    return risk;
  }

  async updateRiskStatus(riskId: string, status: BusinessRiskStatus, actor: string, reason: string): Promise<BusinessRisk> {
    const risk = await this.requireEntity("risk", riskId);
    risk.status = status;
    risk.updatedAt = new Date().toISOString();
    await this.repository.save(risk);
    await this.event(risk, "risk.status-changed", actor, `Changed ${risk.title} to ${status}`, { reason: requireText(reason, "Risk status reason") });
    return risk;
  }

  async createMeeting(input: CreateBusinessMeetingInput): Promise<BusinessMeeting> {
    await this.requireOrganization(input.organizationId);
    for (const decisionId of unique(input.decisionIds)) await this.requireEntity("decision", decisionId);
    const now = new Date().toISOString();
    const meeting: BusinessMeeting = {
      id: input.id?.trim() || randomUUID(),
      entityType: "meeting",
      organizationId: input.organizationId,
      title: requireText(input.title, "Meeting title"),
      heldAt: input.heldAt,
      attendees: unique(input.attendees),
      notes: requireText(input.notes, "Meeting notes"),
      decisionIds: unique(input.decisionIds),
      actions: (input.actions ?? []).map((action) => ({
        id: action.id?.trim() || randomUUID(),
        description: requireText(action.description, "Meeting action"),
        owner: requireText(action.owner, "Meeting action owner"),
        dueAt: action.dueAt ?? null,
        status: "open",
      })),
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.save(meeting);
    await this.event(meeting, "meeting.recorded", requireText(input.recordedBy, "Meeting recorder"), `Recorded meeting ${meeting.title}`);
    return meeting;
  }

  async completeMeetingAction(meetingId: string, actionId: string, actor: string): Promise<BusinessMeeting> {
    const meeting = await this.requireEntity("meeting", meetingId);
    const action = meeting.actions.find((item) => item.id === actionId);
    if (!action) throw new Error("Meeting action not found");
    action.status = "completed";
    meeting.updatedAt = new Date().toISOString();
    await this.repository.save(meeting);
    await this.event(meeting, "meeting.action-completed", actor, `Completed action ${action.description}`, { actionId });
    return meeting;
  }

  async generateWeeklyReport(
    organizationId: string,
    weekStart: string,
    weekEnd: string,
    generatedBy: string,
  ): Promise<BusinessWeeklyReport> {
    await this.requireOrganization(organizationId);
    const [projects, decisions, risks, scenarios, meetings] = await Promise.all([
      this.listOf("project", organizationId),
      this.listOf("decision", organizationId),
      this.listOf("risk", organizationId),
      this.listOf("financial-scenario", organizationId),
      this.listOf("meeting", organizationId),
    ]);
    const endMs = new Date(weekEnd).getTime();
    if (!Number.isFinite(endMs)) throw new Error("Week end must be a valid date");
    const overdueMilestones = projects.flatMap((project) =>
      project.milestones
        .filter((milestone) => milestone.dueAt && new Date(milestone.dueAt).getTime() < endMs)
        .filter((milestone) => !["completed", "cancelled"].includes(milestone.status))
        .map((milestone) => ({ projectId: project.id, milestoneId: milestone.id, title: milestone.title, dueAt: milestone.dueAt as string })),
    );
    const topRisks = risks
      .filter((risk) => risk.status !== "closed")
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);
    const unresolvedActions = meetings.flatMap((meeting) =>
      meeting.actions
        .filter((action) => action.status === "open")
        .map((action) => ({ meetingId: meeting.id, actionId: action.id, description: action.description, owner: action.owner })),
    );
    const openDecisions = decisions.filter((decision) => !["verified", "rejected"].includes(decision.stage));
    const now = new Date().toISOString();
    const report: BusinessWeeklyReport = {
      id: randomUUID(),
      entityType: "weekly-report",
      organizationId,
      weekStart,
      weekEnd,
      generatedBy: requireText(generatedBy, "Report generator"),
      projectSummary: {
        total: projects.length,
        active: projects.filter((project) => project.status === "active").length,
        blocked: projects.filter((project) => project.status === "blocked").length,
        completed: projects.filter((project) => project.status === "completed").length,
      },
      openDecisionIds: openDecisions.map((decision) => decision.id),
      overdueMilestones,
      topRiskIds: topRisks.map((risk) => risk.id),
      latestScenarioIds: scenarios.slice(0, 3).map((scenario) => scenario.id),
      unresolvedActions,
      narrative: `Projects: ${projects.length} total, ${projects.filter((project) => project.status === "blocked").length} blocked. Open decisions: ${openDecisions.length}. Overdue milestones: ${overdueMilestones.length}. Open actions: ${unresolvedActions.length}.`,
      evidenceRefs: [
        ...projects.map((project) => `business:project:${project.id}`),
        ...openDecisions.map((decision) => `business:decision:${decision.id}`),
        ...topRisks.map((risk) => `business:risk:${risk.id}`),
      ],
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.save(report);
    await this.event(report, "report.weekly-generated", report.generatedBy, `Generated weekly operating report ${weekStart}–${weekEnd}`);
    return report;
  }

  async getEntity<T extends BusinessEntityType>(type: T, id: string): Promise<Extract<BusinessEntity, { entityType: T }>> {
    return this.requireEntity(type, id);
  }

  async listEntities<T extends BusinessEntityType>(
    type: T,
    organizationId?: string,
    limit = 200,
  ): Promise<Array<Extract<BusinessEntity, { entityType: T }>>> {
    return this.listOf(type, organizationId, limit);
  }

  async listEvents(organizationId?: string, entityId?: string, limit = 500) {
    return this.repository.listEvents({ organizationId, entityId, limit });
  }

  async buildMissionContext(organizationId?: string): Promise<BusinessMissionContext> {
    const organizations = organizationId
      ? [await this.requireOrganization(organizationId)]
      : await this.listOf("organization", undefined, 20);
    const selectedId = organizationId ?? organizations[0]?.id;
    if (!selectedId) {
      return { summary: "No governed business organization is registered.", evidence: [], uncertainties: ["Business context is empty."] };
    }
    const [projects, decisions, risks, sops, reports] = await Promise.all([
      this.listOf("project", selectedId, 50),
      this.listOf("decision", selectedId, 50),
      this.listOf("risk", selectedId, 50),
      this.listOf("sop", selectedId, 50),
      this.listOf("weekly-report", selectedId, 5),
    ]);
    const organization = await this.requireOrganization(selectedId);
    const approvedSops = sops.filter((sop) => sop.status === "approved");
    const openDecisions = decisions.filter((decision) => !["verified", "rejected"].includes(decision.stage));
    const openRisks = risks.filter((risk) => risk.status !== "closed").sort((a, b) => b.score - a.score);
    const generatedAt = new Date().toISOString();
    const lines = [
      `Organization: ${organization.name} (${organization.id}); owner: ${organization.owner}; currency: ${organization.currency}.`,
      `Projects: ${projects.length}; active ${projects.filter((item) => item.status === "active").length}; blocked ${projects.filter((item) => item.status === "blocked").length}.`,
      `Open decisions: ${openDecisions.map((item) => `${item.title} [${item.stage}]`).join("; ") || "none"}.`,
      `Highest risks: ${openRisks.slice(0, 5).map((item) => `${item.title} [${item.score}]`).join("; ") || "none"}.`,
      `Approved SOPs: ${approvedSops.map((item) => `${item.name} v${item.version}`).join("; ") || "none"}.`,
      `Latest weekly report: ${reports[0]?.narrative ?? "not generated"}.`,
      "Recommendation, decision, authorization, execution, and verification remain distinct records. The organization owner retains final authority.",
    ];
    const entities: BusinessEntity[] = [organization, ...projects, ...openDecisions, ...openRisks.slice(0, 5), ...approvedSops, ...reports.slice(0, 1)];
    return {
      summary: lines.join("\n"),
      evidence: entities.map((entity) => ({
        id: entity.id,
        source: `business:${entity.entityType}:${entity.id}`,
        locator: entity.organizationId,
        retrievedAt: generatedAt,
      })),
      uncertainties: [
        ...(reports.length === 0 ? ["No weekly operating report has been generated."] : []),
        ...(openDecisions.length > 0 ? [`${openDecisions.length} decisions remain unverified.`] : []),
      ],
    };
  }

  private async requireOrganization(id: string): Promise<BusinessOrganization> {
    return this.requireEntity("organization", id);
  }

  private async requireEntity<T extends BusinessEntityType>(
    type: T,
    id: string,
  ): Promise<Extract<BusinessEntity, { entityType: T }>> {
    const entity = await this.repository.get(type, id);
    if (!entity || entity.entityType !== type) throw new Error(`${type} not found`);
    return entity as Extract<BusinessEntity, { entityType: T }>;
  }

  private async listOf<T extends BusinessEntityType>(
    type: T,
    organizationId?: string,
    limit = 200,
  ): Promise<Array<Extract<BusinessEntity, { entityType: T }>>> {
    const entities = await this.repository.list(type, { organizationId, limit });
    return entities.filter((entity) => entity.entityType === type) as Array<Extract<BusinessEntity, { entityType: T }>>;
  }

  private async event(
    entity: BusinessEntity,
    type: string,
    actor: string,
    summary: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.repository.appendEvent({
      id: randomUUID(),
      organizationId: entity.organizationId,
      entityType: entity.entityType,
      entityId: entity.id,
      type,
      actor: actor.trim(),
      summary,
      occurredAt: new Date().toISOString(),
      metadata: structuredClone(metadata),
    });
  }
}
