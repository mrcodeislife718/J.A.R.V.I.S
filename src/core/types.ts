export const DOMAIN_IDS = [
  "biomedical-research",
  "business-operations",
  "personal-knowledge",
  "customer-support",
  "analytics",
  "infrastructure-administration",
  "content-production",
] as const;

export type DomainId = (typeof DOMAIN_IDS)[number];

export type RiskLevel = "low" | "moderate" | "high" | "critical";
export type MissionStatus =
  | "compiled"
  | "awaiting-authorization"
  | "running"
  | "verification-failed"
  | "completed"
  | "failed";

export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";
export type MemoryStatus = "candidate" | "approved" | "rejected" | "superseded";
export type UncertaintyLabel =
  | "known"
  | "inferred"
  | "assumed"
  | "unverified"
  | "contradicted"
  | "missing";

export interface MissionAuthorization {
  approvedBy: string;
  approvedAt: string;
  scope: string;
}

export interface MissionConstraints {
  tokenBudget: number;
  memoryBudgetMb: number;
  deadlineMs: number;
  allowExternalNetwork: boolean;
  allowSideEffects: boolean;
}

export interface MissionConstraintOverrides {
  tokenBudget?: number | undefined;
  memoryBudgetMb?: number | undefined;
  deadlineMs?: number | undefined;
  allowExternalNetwork?: boolean | undefined;
  allowSideEffects?: boolean | undefined;
}

export interface MissionRequest {
  domain: DomainId;
  objective: string;
  requestedCapabilities: string[];
  inputs: Record<string, unknown>;
  constraints: MissionConstraintOverrides;
  rememberOutput: boolean;
}

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  reasons: string[];
  requiresHumanAuthorization: boolean;
  prohibited: boolean;
}

export interface CapabilityDefinition {
  id: string;
  name: string;
  description: string;
  risk: RiskLevel;
  tools: string[];
  sideEffecting: boolean;
  verification: string[];
}

export interface DomainManifest {
  id: DomainId;
  name: string;
  description: string;
  memoryNamespace: string;
  defaultCapabilities: string[];
  allowedCapabilities: string[];
  deniedActions: string[];
  authorizationRequiredFor: string[];
  safeguards: string[];
}

export interface MissionStep {
  id: string;
  capabilityId: string;
  dependsOn: string[];
  status: StepStatus;
  attempt: number;
  startedAt?: string;
  completedAt?: string;
  output?: string;
  error?: string;
}

export interface EvidenceReference {
  id: string;
  source: string;
  locator: string;
  retrievedAt: string;
  trust: "primary" | "secondary" | "internal" | "unknown";
}

export interface ContextPacket {
  missionId: string;
  domain: DomainId;
  objective: string;
  constraints: MissionConstraints;
  workingState: string[];
  evidence: EvidenceReference[];
  uncertainties: Array<{ label: UncertaintyLabel; statement: string }>;
}

export interface VerificationCheck {
  id: string;
  passed: boolean;
  detail: string;
}

export interface VerificationReport {
  passed: boolean;
  checks: VerificationCheck[];
  verifiedAt: string;
}

export interface MissionRecord {
  id: string;
  request: MissionRequest;
  status: MissionStatus;
  risk: RiskAssessment;
  constraints: MissionConstraints;
  steps: MissionStep[];
  createdAt: string;
  updatedAt: string;
  authorization?: MissionAuthorization;
  verification?: VerificationReport;
  finalOutput?: string;
  error?: string;
}

export interface MemoryRecord {
  id: string;
  domain: DomainId;
  namespace: string;
  missionId: string;
  content: string;
  status: MemoryStatus;
  confidence: number;
  provenance: EvidenceReference[];
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface AuditEvent {
  id: string;
  missionId: string;
  type: string;
  actor: string;
  occurredAt: string;
  detail: Record<string, unknown>;
}

export interface ModelRequest {
  model: string;
  system: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

export interface ModelResponse {
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalDurationMs?: number;
}

export interface ModelClient {
  generate(request: ModelRequest): Promise<ModelResponse>;
}
