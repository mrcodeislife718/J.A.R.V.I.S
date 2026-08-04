export const BUSINESS_ENTITY_TYPES = [
  "organization",
  "project",
  "decision",
  "sop",
  "financial-scenario",
  "risk",
  "meeting",
  "weekly-report",
] as const;

export type BusinessEntityType = (typeof BUSINESS_ENTITY_TYPES)[number];
export type BusinessProjectStatus = "planned" | "active" | "blocked" | "completed" | "cancelled";
export type BusinessMilestoneStatus = "pending" | "in-progress" | "blocked" | "completed" | "cancelled";
export type BusinessDecisionStage =
  | "recommendation"
  | "decision"
  | "authorized"
  | "executing"
  | "verified"
  | "rejected";
export type BusinessReviewStatus = "candidate" | "approved" | "rejected" | "retired";
export type BusinessRiskStatus = "open" | "mitigating" | "accepted" | "closed";

export interface BusinessBaseEntity {
  id: string;
  entityType: BusinessEntityType;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessOrganization extends BusinessBaseEntity {
  entityType: "organization";
  name: string;
  description: string | null;
  owner: string;
  currency: string;
  timezone: string;
  status: "active" | "archived";
  metadata: Record<string, unknown>;
}

export interface BusinessMilestone {
  id: string;
  title: string;
  owner: string;
  dueAt: string | null;
  status: BusinessMilestoneStatus;
  dependencies: string[];
  completionEvidence: string[];
}

export interface BusinessProject extends BusinessBaseEntity {
  entityType: "project";
  name: string;
  objective: string;
  owner: string;
  status: BusinessProjectStatus;
  priority: "low" | "normal" | "high" | "critical";
  startDate: string | null;
  targetDate: string | null;
  milestones: BusinessMilestone[];
  dependencies: string[];
  bottlenecks: string[];
  successCriteria: string[];
  metadata: Record<string, unknown>;
}

export interface BusinessDecision extends BusinessBaseEntity {
  entityType: "decision";
  title: string;
  context: string;
  recommendation: string;
  rationale: string;
  stage: BusinessDecisionStage;
  proposedBy: string;
  decidedBy: string | null;
  authorizedBy: string | null;
  executedBy: string | null;
  verifiedBy: string | null;
  evidenceRefs: string[];
  affectedProjectIds: string[];
  transitionHistory: Array<{
    from: BusinessDecisionStage | null;
    to: BusinessDecisionStage;
    actor: string;
    rationale: string;
    occurredAt: string;
  }>;
}

export interface BusinessSop extends BusinessBaseEntity {
  entityType: "sop";
  name: string;
  purpose: string;
  owner: string;
  status: BusinessReviewStatus;
  version: number;
  steps: Array<{
    order: number;
    instruction: string;
    verification: string;
    escalation: string | null;
  }>;
  reviewedBy: string | null;
  reviewedAt: string | null;
  changeReason: string | null;
}

export interface BusinessFinancialScenario extends BusinessBaseEntity {
  entityType: "financial-scenario";
  name: string;
  createdBy: string;
  periodLabel: string;
  assumptions: {
    revenue: number;
    variableCostRate: number;
    fixedCosts: number;
    cashOnHand: number;
  };
  outputs: {
    variableCosts: number;
    contributionMargin: number;
    operatingProfit: number;
    monthlyBurn: number;
    runwayMonths: number | null;
    breakEvenRevenue: number | null;
  };
  notes: string[];
  evidenceRefs: string[];
}

export interface BusinessRisk extends BusinessBaseEntity {
  entityType: "risk";
  title: string;
  category: string;
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  score: number;
  status: BusinessRiskStatus;
  owner: string;
  trigger: string;
  mitigation: string;
  contingency: string;
  evidenceRefs: string[];
}

export interface BusinessMeeting extends BusinessBaseEntity {
  entityType: "meeting";
  title: string;
  heldAt: string;
  attendees: string[];
  notes: string;
  decisionIds: string[];
  actions: Array<{
    id: string;
    description: string;
    owner: string;
    dueAt: string | null;
    status: "open" | "completed" | "cancelled";
  }>;
}

export interface BusinessWeeklyReport extends BusinessBaseEntity {
  entityType: "weekly-report";
  weekStart: string;
  weekEnd: string;
  generatedBy: string;
  projectSummary: {
    total: number;
    active: number;
    blocked: number;
    completed: number;
  };
  openDecisionIds: string[];
  overdueMilestones: Array<{ projectId: string; milestoneId: string; title: string; dueAt: string }>;
  topRiskIds: string[];
  latestScenarioIds: string[];
  unresolvedActions: Array<{ meetingId: string; actionId: string; description: string; owner: string }>;
  narrative: string;
  evidenceRefs: string[];
}

export type BusinessEntity =
  | BusinessOrganization
  | BusinessProject
  | BusinessDecision
  | BusinessSop
  | BusinessFinancialScenario
  | BusinessRisk
  | BusinessMeeting
  | BusinessWeeklyReport;

export interface BusinessEvent {
  id: string;
  organizationId: string;
  entityType: BusinessEntityType;
  entityId: string;
  type: string;
  actor: string;
  summary: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export interface BusinessMissionContext {
  summary: string;
  evidence: Array<{
    id: string;
    source: string;
    locator: string;
    retrievedAt: string;
  }>;
  uncertainties: string[];
}
