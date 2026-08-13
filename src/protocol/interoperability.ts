export type RuntimeStatus = "requested" | "authorized" | "running" | "succeeded" | "failed" | "denied" | "cancelled";
export type FailureClass = "validation" | "authorization" | "capability" | "resource" | "timeout" | "external" | "verification" | "state" | "internal" | "cancelled";

export interface ActorIdentity { actorId: string; actorKind: string; authorityDomain?: string; }
export interface CapabilityIdentity { capabilityId: string; version?: string; provider?: string; }
export interface AuthorityGrant { grantId: string; issuerId: string; scopes: string[]; issuedAt: string; expiresAt?: string; revokedAt?: string; revocationRef?: string; }
export interface EvidenceRecord { evidenceId: string; kind: string; provenance: string; contentHash?: string; producedBy?: string; observedAt?: string; payload: Record<string, unknown>; }
export interface VerificationClaim { claimId: string; verifierId: string; requirement: string; passed: boolean; evidenceRefs: string[]; method?: string; verifiedAt: string; }
export interface StateChange { stateId: string; kind: string; beforeRef?: string; afterRef?: string; delta: Record<string, unknown>; }
export interface CheckpointRecord { checkpointId: string; stateRefs: string[]; reversible: boolean; createdAt: string; }
export interface RecoveryRecord { recoveryId: string; triggerEventId: string; strategy: string; outcome: string; checkpointRef?: string; }
export interface ResourceUsage { wallTimeMs?: number; cpuTimeMs?: number; memoryBytesPeak?: number; networkBytes?: number; costUnits?: number; }
export interface IntegrityRecord { algorithm: "sha256" | string; contentHash: string; previousHash?: string; }
export interface FailureRecord { failureId: string; failureClass: FailureClass; code: string; message: string; retryable: boolean; details: Record<string, unknown>; }

export interface RuntimeRequest {
  protocolVersion: "1.2";
  requestId: string;
  eventId: string;
  causalParentIds: string[];
  sequence?: number;
  systemId: string;
  systemKind: string;
  missionId?: string;
  actor?: ActorIdentity;
  capability: string;
  capabilityIdentity?: CapabilityIdentity;
  intent: Record<string, unknown>;
  authority: Record<string, unknown>;
  authorityGrants: AuthorityGrant[];
  evidenceRefs: string[];
  stateRefs: string[];
  verificationRequirements: string[];
  checkpointRef?: string;
  integrity?: IntegrityRecord;
  createdAt: string;
}

export interface RuntimeReceipt {
  protocolVersion: "1.2";
  requestId: string;
  eventId: string;
  causalParentIds: string[];
  sequence?: number;
  systemId: string;
  status: RuntimeStatus;
  output: Record<string, unknown>;
  evidence: EvidenceRecord[];
  verification: VerificationClaim[];
  stateChanges: StateChange[];
  checkpoint?: CheckpointRecord;
  recovery?: RecoveryRecord;
  resourceUsage?: ResourceUsage;
  failure?: FailureRecord;
  integrity?: IntegrityRecord;
  startedAt?: string;
  completedAt: string;
}

export interface RuntimeInteropAdapter {
  handle(request: RuntimeRequest): Promise<RuntimeReceipt>;
}
