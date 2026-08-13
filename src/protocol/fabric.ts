import { randomUUID } from "node:crypto";
import { protocolDigest, verifyDigest } from "./canonical.js";
import type { RuntimeInteropAdapter, RuntimeReceipt, RuntimeRequest } from "./interoperability.js";

export class RuntimeInteropFabric {
  private readonly adapters = new Map<string, RuntimeInteropAdapter>();
  private readonly records: Array<RuntimeRequest | RuntimeReceipt> = [];

  register(systemKind: string, adapter: RuntimeInteropAdapter): void {
    if (!systemKind.trim()) throw new Error("systemKind is required");
    if (this.adapters.has(systemKind)) throw new Error(`adapter already registered: ${systemKind}`);
    this.adapters.set(systemKind, adapter);
  }

  async submit(request: RuntimeRequest): Promise<RuntimeReceipt> {
    this.validate(request);
    this.records.push(structuredClone(request));

    const adapter = this.adapters.get(request.systemKind);
    if (!adapter) {
      const base = {
        protocolVersion: "1.2" as const,
        requestId: request.requestId,
        eventId: randomUUID(),
        causalParentIds: [request.eventId],
        systemId: request.systemId,
        status: "denied" as const,
        output: {},
        evidence: [],
        verification: [],
        stateChanges: [],
        failure: {
          failureId: randomUUID(),
          failureClass: "capability" as const,
          code: "NO_ADAPTER",
          message: `No runtime adapter is registered for ${request.systemKind}`,
          retryable: false,
          details: { systemKind: request.systemKind },
        },
        completedAt: new Date().toISOString(),
      };
      const receipt: RuntimeReceipt = {
        ...base,
        integrity: {
          algorithm: "sha256",
          contentHash: protocolDigest(base),
          ...(request.integrity?.contentHash ? { previousHash: request.integrity.contentHash } : {}),
        },
      };
      this.records.push(structuredClone(receipt));
      return receipt;
    }

    const receipt = await adapter.handle(request);
    this.validateReceipt(request, receipt);
    this.records.push(structuredClone(receipt));
    return receipt;
  }

  snapshot(): ReadonlyArray<RuntimeRequest | RuntimeReceipt> {
    return structuredClone(this.records);
  }

  private validate(request: RuntimeRequest): void {
    if (request.protocolVersion !== "1.2") throw new Error("unsupported protocol version");
    if (!request.requestId || !request.eventId || !request.systemId || !request.systemKind || !request.capability) {
      throw new Error("request identity, event, system, and capability fields are required");
    }
    if (request.sequence !== undefined && request.sequence < 0) throw new Error("sequence must be non-negative");
    for (const grant of request.authorityGrants) {
      const now = Date.now();
      if (grant.revokedAt) throw new Error(`authority grant revoked: ${grant.grantId}`);
      if (grant.expiresAt && Date.parse(grant.expiresAt) <= now) throw new Error(`authority grant expired: ${grant.grantId}`);
    }
    if (request.integrity && !verifyDigest(request as unknown as Record<string, unknown>, request.integrity.contentHash)) {
      throw new Error("request integrity verification failed");
    }
  }

  private validateReceipt(request: RuntimeRequest, receipt: RuntimeReceipt): void {
    if (receipt.protocolVersion !== "1.2") throw new Error("adapter returned unsupported protocol version");
    if (receipt.requestId !== request.requestId || receipt.systemId !== request.systemId) {
      throw new Error("adapter returned a receipt for a different request or system");
    }
    if (!receipt.eventId) throw new Error("receipt eventId is required");
    if (!receipt.causalParentIds.includes(request.eventId)) throw new Error("receipt must preserve causal parentage to the request event");
    if (receipt.status === "failed" && !receipt.failure) throw new Error("failed receipt requires a structured failure record");
    if (receipt.integrity && !verifyDigest(receipt as unknown as Record<string, unknown>, receipt.integrity.contentHash)) {
      throw new Error("receipt integrity verification failed");
    }
  }
}
