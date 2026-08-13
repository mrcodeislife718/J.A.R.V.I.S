export type RuntimeStatus = "requested" | "running" | "succeeded" | "failed" | "denied";

export interface RuntimeRequest {
  protocolVersion: "1.0";
  requestId: string;
  systemId: string;
  systemKind: string;
  missionId?: string;
  capability: string;
  intent: Record<string, unknown>;
  authority: Record<string, unknown>;
  evidenceRefs: string[];
  stateRefs: string[];
  verificationRequirements: string[];
  createdAt: string;
}

export interface RuntimeReceipt {
  protocolVersion: "1.0";
  requestId: string;
  systemId: string;
  status: RuntimeStatus;
  output: Record<string, unknown>;
  evidence: Record<string, unknown>[];
  verification: Record<string, unknown>[];
  stateChanges: Record<string, unknown>[];
  failure?: Record<string, unknown>;
  completedAt: string;
}

export interface RuntimeInteropAdapter {
  handle(request: RuntimeRequest): Promise<RuntimeReceipt>;
}
