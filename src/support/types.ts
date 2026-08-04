export const SUPPORT_ENTITY_TYPES = [
  "workspace",
  "customer",
  "product",
  "policy",
  "playbook",
  "ticket",
  "support-action",
  "handoff",
  "quality-review",
  "failure-cluster",
] as const;

export type SupportEntityType = (typeof SUPPORT_ENTITY_TYPES)[number];
export type SupportReviewStatus = "candidate" | "approved" | "rejected" | "retired";
export type SupportTicketStatus = "new" | "triaged" | "waiting-customer" | "waiting-human" | "resolved" | "closed";
export type SupportPriority = "low" | "normal" | "high" | "urgent";
export type SupportCategory =
  | "technical"
  | "billing"
  | "account"
  | "refund"
  | "security"
  | "privacy"
  | "legal"
  | "safety"
  | "product-feedback"
  | "general";
export type SupportActionKind =
  | "standard-response"
  | "troubleshooting-step"
  | "refund"
  | "account-change"
  | "policy-exception"
  | "legal-response"
  | "human-handoff";
export type SupportActionStatus = "proposed" | "approved" | "rejected" | "recorded-complete" | "failed";
export type SupportHandoffStatus = "requested" | "accepted" | "resolved" | "cancelled";

export interface SupportBaseEntity {
  id: string;
  entityType: SupportEntityType;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportWorkspace extends SupportBaseEntity {
  entityType: "workspace";
  name: string;
  owner: string;
  description: string | null;
  defaultSlaMinutes: number;
  escalationTeams: string[];
  status: "active" | "archived";
  metadata: Record<string, unknown>;
}

export interface SupportCustomer extends SupportBaseEntity {
  entityType: "customer";
  externalRef: string;
  displayName: string;
  segment: string | null;
  riskFlags: string[];
  consentState: "unknown" | "granted" | "withdrawn";
  metadata: Record<string, unknown>;
}

export interface SupportProduct extends SupportBaseEntity {
  entityType: "product";
  name: string;
  version: string | null;
  ownerTeam: string;
  supportChannels: string[];
  knownIssueRefs: string[];
  metadata: Record<string, unknown>;
}

export interface SupportPolicy extends SupportBaseEntity {
  entityType: "policy";
  name: string;
  category: SupportCategory;
  version: number;
  status: SupportReviewStatus;
  body: string;
  sourceRef: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  requiresHumanApproval: boolean;
  approvedActionKinds: SupportActionKind[];
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
}

export interface SupportPlaybookStep {
  order: number;
  instruction: string;
  expectedSignal: string;
  failureEscalation: string | null;
  requiresHuman: boolean;
}

export interface SupportPlaybook extends SupportBaseEntity {
  entityType: "playbook";
  name: string;
  productId: string | null;
  category: SupportCategory;
  version: number;
  status: SupportReviewStatus;
  steps: SupportPlaybookStep[];
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
}

export interface SupportTicketMessage {
  id: string;
  authorType: "customer" | "agent" | "system";
  body: string;
  createdAt: string;
}

export interface SupportTriageResult {
  category: SupportCategory;
  priority: SupportPriority;
  frustrationScore: number;
  escalationRequired: boolean;
  legalRisk: boolean;
  securityRisk: boolean;
  safetyRisk: boolean;
  assignedQueue: string;
  reasons: string[];
  evaluatedAt: string;
}

export interface SupportTroubleshootingPlan {
  playbookId: string;
  playbookVersion: number;
  generatedAt: string;
  steps: SupportPlaybookStep[];
}

export interface SupportTicket extends SupportBaseEntity {
  entityType: "ticket";
  customerId: string;
  productId: string | null;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  channel: string;
  category: SupportCategory;
  priority: SupportPriority;
  assignedQueue: string;
  messages: SupportTicketMessage[];
  triage: SupportTriageResult | null;
  policyIds: string[];
  troubleshootingPlan: SupportTroubleshootingPlan | null;
  failureSignature: string | null;
  resolutionSummary: string | null;
  resolutionEvidence: string[];
  firstResponseAt: string | null;
  resolvedAt: string | null;
}

export interface SupportAction extends SupportBaseEntity {
  entityType: "support-action";
  ticketId: string;
  kind: SupportActionKind;
  status: SupportActionStatus;
  summary: string;
  requestedBy: string;
  policyId: string | null;
  amount: number | null;
  currency: string | null;
  requestedScope: string;
  approvedBy: string | null;
  approvedAt: string | null;
  approvalReason: string | null;
  completedBy: string | null;
  completedAt: string | null;
  externalReference: string | null;
  outcome: string | null;
  evidenceRefs: string[];
  idempotencyKey: string;
}

export interface SupportHandoff extends SupportBaseEntity {
  entityType: "handoff";
  ticketId: string;
  status: SupportHandoffStatus;
  reason: string;
  targetTeam: string;
  requestedBy: string;
  acceptedBy: string | null;
  summary: string;
  requestedAt: string;
  resolvedAt: string | null;
}

export interface SupportQualityReview extends SupportBaseEntity {
  entityType: "quality-review";
  ticketId: string;
  reviewedBy: string;
  policyAccuracy: number;
  diagnosisQuality: number;
  communicationQuality: number;
  escalationQuality: number;
  evidenceQuality: number;
  overallScore: number;
  findings: string[];
  correctiveActions: string[];
}

export interface SupportFailureCluster extends SupportBaseEntity {
  entityType: "failure-cluster";
  productId: string | null;
  signature: string;
  ticketIds: string[];
  occurrenceCount: number;
  severity: SupportPriority;
  firstSeenAt: string;
  lastSeenAt: string;
  status: "open" | "investigating" | "resolved";
  ownerTeam: string | null;
}

export type SupportEntity =
  | SupportWorkspace
  | SupportCustomer
  | SupportProduct
  | SupportPolicy
  | SupportPlaybook
  | SupportTicket
  | SupportAction
  | SupportHandoff
  | SupportQualityReview
  | SupportFailureCluster;

export interface SupportEvent {
  id: string;
  workspaceId: string;
  entityType: SupportEntityType;
  entityId: string;
  type: string;
  actor: string;
  summary: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export interface SupportMissionContext {
  summary: string;
  evidence: Array<{
    id: string;
    source: string;
    locator: string;
    retrievedAt: string;
  }>;
  uncertainties: string[];
}
