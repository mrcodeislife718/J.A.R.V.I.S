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
      const receipt: RuntimeReceipt = {
        protocolVersion: "1.0",
        requestId: request.requestId,
        systemId: request.systemId,
        status: "denied",
        output: {},
        evidence: [],
        verification: [],
        stateChanges: [],
        failure: { reason: "no_adapter", systemKind: request.systemKind },
        completedAt: new Date().toISOString(),
      };
      this.records.push(structuredClone(receipt));
      return receipt;
    }

    const receipt = await adapter.handle(request);
    if (receipt.requestId !== request.requestId || receipt.systemId !== request.systemId) {
      throw new Error("adapter returned a receipt for a different request or system");
    }
    this.records.push(structuredClone(receipt));
    return receipt;
  }

  snapshot(): ReadonlyArray<RuntimeRequest | RuntimeReceipt> {
    return structuredClone(this.records);
  }

  private validate(request: RuntimeRequest): void {
    if (request.protocolVersion !== "1.0") throw new Error("unsupported protocol version");
    if (!request.requestId || !request.systemId || !request.systemKind || !request.capability) {
      throw new Error("request identity and capability fields are required");
    }
  }
}
