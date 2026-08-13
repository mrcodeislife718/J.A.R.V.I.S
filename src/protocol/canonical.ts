import { createHash } from "node:crypto";

export type CanonicalValue = null | boolean | number | string | CanonicalValue[] | { [key: string]: CanonicalValue };

function normalize(value: unknown): CanonicalValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonical serialization does not allow non-finite numbers");
    return value;
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, CanonicalValue> = {};
    for (const key of Object.keys(source).sort()) {
      const item = source[key];
      if (item === undefined) continue;
      out[key] = normalize(item);
    }
    return out;
  }
  throw new Error(`unsupported canonical value type: ${typeof value}`);
}

export function canonicalSerialize(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function protocolDigest(value: unknown): string {
  return createHash("sha256").update(canonicalSerialize(value), "utf8").digest("hex");
}

export function withoutIntegrity<T extends Record<string, unknown>>(record: T): Record<string, unknown> {
  const clone = { ...record };
  delete clone.integrity;
  return clone;
}

export function verifyDigest(record: Record<string, unknown>, expected: string): boolean {
  return protocolDigest(withoutIntegrity(record)) === expected;
}

export function verifyEventChain(records: Array<Record<string, unknown>>): boolean {
  let previous: string | undefined;
  for (const record of records) {
    const integrity = record.integrity as { contentHash?: string; previousHash?: string } | undefined;
    if (!integrity?.contentHash) return false;
    if (previous !== integrity.previousHash) return false;
    if (!verifyDigest(record, integrity.contentHash)) return false;
    previous = integrity.contentHash;
  }
  return true;
}

export function negotiateProtocol(local: readonly string[], remote: readonly string[]): string | null {
  const supported = local.filter((version) => remote.includes(version));
  return supported.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0] ?? null;
}
