import assert from "node:assert/strict";
import test from "node:test";
import { canonicalSerialize, negotiateProtocol, protocolDigest, verifyEventChain } from "../../src/protocol/canonical.js";

test("protocol canonicalization is deterministic", () => {
  const a = { z: 2, a: { y: 1, x: true }, list: [3, 2, 1] };
  const b = { list: [3, 2, 1], a: { x: true, y: 1 }, z: 2 };
  assert.equal(canonicalSerialize(a), canonicalSerialize(b));
  assert.equal(protocolDigest(a), protocolDigest(b));
  assert.notEqual(protocolDigest(a), protocolDigest({ ...a, z: 3 }));
});

test("protocol negotiation chooses the highest common version", () => {
  assert.equal(negotiateProtocol(["1.0", "1.1", "1.2"], ["1.1", "1.2"]), "1.2");
  assert.equal(negotiateProtocol(["1.2"], ["1.0"]), null);
});

test("event chain rejects tampering", () => {
  const firstBase = { eventId: "e1", sequence: 0, payload: { value: 1 } };
  const firstHash = protocolDigest(firstBase);
  const first = { ...firstBase, integrity: { algorithm: "sha256", contentHash: firstHash } };
  const secondBase = { eventId: "e2", sequence: 1, payload: { value: 2 } };
  const secondHash = protocolDigest(secondBase);
  const second = { ...secondBase, integrity: { algorithm: "sha256", contentHash: secondHash, previousHash: firstHash } };

  assert.equal(verifyEventChain([first, second]), true);
  assert.equal(verifyEventChain([first, { ...second, payload: { value: 9 } }]), false);
  assert.equal(verifyEventChain([first, { ...second, integrity: { ...second.integrity, previousHash: "broken" } }]), false);
});
