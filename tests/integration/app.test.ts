import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../../src/app.js";
import type { ModelClient, ModelRequest, ModelResponse } from "../../src/core/types.js";

class FakeModelClient implements ModelClient {
  calls = 0;

  async generate(request: ModelRequest): Promise<ModelResponse> {
    this.calls += 1;
    const capability = request.prompt.match(/CURRENT CAPABILITY: ([^\n]+)/)?.[1] ?? "unknown";
    const text = capability === "core.report"
      ? "Known: the requested mission graph completed. Inferred: the generated artifact is suitable for review. Missing: external evidence was not supplied."
      : `Capability artifact completed for ${capability}. Known: this is a test result. Missing: external evidence.`;
    return { text, model: request.model, inputTokens: 100, outputTokens: 40, totalDurationMs: 5 };
  }
}

test("health and domain registry are available", async () => {
  const app = buildApp({ modelClient: new FakeModelClient(), logger: false });
  const health = await app.inject({ method: "GET", url: "/health" });
  assert.equal(health.statusCode, 200);
  assert.equal(health.json().domains, 7);

  const domains = await app.inject({ method: "GET", url: "/v1/domains" });
  assert.equal(domains.statusCode, 200);
  assert.equal(domains.json().domains.length, 7);
  await app.close();
});

test("low-risk mission executes verifies and creates a reviewable memory candidate", async () => {
  const model = new FakeModelClient();
  const app = buildApp({ modelClient: model, logger: false });

  const response = await app.inject({
    method: "POST",
    url: "/v1/missions",
    payload: {
      domain: "personal-knowledge",
      objective: "Extract decisions, unresolved questions, and next actions from these notes",
      requestedCapabilities: ["knowledge.extract", "knowledge.resume"],
      inputs: { notes: "Decision: create one governed core. Open question: persistent storage adapter." },
      rememberOutput: true,
    },
  });

  assert.equal(response.statusCode, 201);
  const mission = response.json().mission;
  assert.equal(mission.status, "completed");
  assert.equal(mission.verification.passed, true);
  assert.ok(model.calls >= 1);

  const memories = await app.inject({ method: "GET", url: "/v1/memory?status=candidate" });
  const candidate = memories.json().memories[0];
  assert.equal(candidate.missionId, mission.id);

  const approved = await app.inject({
    method: "POST",
    url: `/v1/memory/${candidate.id}/approve`,
    payload: { reviewedBy: "Charles Castillo" },
  });
  assert.equal(approved.statusCode, 200);
  assert.equal(approved.json().memory.status, "approved");
  await app.close();
});

test("high-risk infrastructure mission pauses for explicit authorization", async () => {
  const app = buildApp({ modelClient: new FakeModelClient(), logger: false });
  const submitted = await app.inject({
    method: "POST",
    url: "/v1/missions",
    payload: {
      domain: "infrastructure-administration",
      objective: "Create a patch and rollback plan for the production service",
      requestedCapabilities: ["infrastructure.patch-plan"],
    },
  });

  assert.equal(submitted.statusCode, 202);
  const pending = submitted.json().mission;
  assert.equal(pending.status, "awaiting-authorization");

  const authorized = await app.inject({
    method: "POST",
    url: `/v1/missions/${pending.id}/authorize`,
    payload: {
      approvedBy: "Charles Castillo",
      scope: "Planning only. Do not execute changes.",
    },
  });
  assert.equal(authorized.statusCode, 200);
  assert.equal(authorized.json().mission.status, "completed");
  await app.close();
});

test("prohibited biomedical mission is rejected before model execution", async () => {
  const model = new FakeModelClient();
  const app = buildApp({ modelClient: model, logger: false });
  const response = await app.inject({
    method: "POST",
    url: "/v1/missions",
    payload: {
      domain: "biomedical-research",
      objective: "Give exact dosing instructions to inject into a human",
      requestedCapabilities: ["biomedical.hypothesis-draft"],
    },
  });

  assert.equal(response.statusCode, 422);
  assert.equal(response.json().mission.status, "failed");
  assert.equal(model.calls, 0);
  await app.close();
});
