import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../../src/app.js";
import type { ModelClient, ModelRequest, ModelResponse } from "../../src/core/types.js";
import { InMemoryBlobStore } from "../../src/pkm/blob-store.js";
import { DeterministicEmbeddingClient } from "../../src/pkm/embedding.js";
import { InMemoryPkmRepository } from "../../src/pkm/in-memory-repository.js";
import { NoopSemanticIndex } from "../../src/pkm/semantic-index.js";

class UnusedModelClient implements ModelClient {
  async generate(request: ModelRequest): Promise<ModelResponse> {
    return { text: "Known: test response.", model: request.model };
  }
}

const buildPkmApp = () =>
  buildApp({
    modelClient: new UnusedModelClient(),
    pkmRepository: new InMemoryPkmRepository(),
    blobStore: new InMemoryBlobStore(),
    embeddingClient: new DeterministicEmbeddingClient(),
    semanticIndex: new NoopSemanticIndex(),
    logger: false,
  });

test("personal knowledge preserves authorship and requires review before retrieval", async () => {
  const app = buildPkmApp();
  const workspaceResponse = await app.inject({
    method: "POST",
    url: "/v1/pkm/workspaces",
    payload: { name: "J.A.R.V.I.S", description: "Persistent project memory" },
  });
  assert.equal(workspaceResponse.statusCode, 201);
  const workspaceId = workspaceResponse.json().workspace.id as string;

  const content = [
    "Decision: Build one governed core with seven isolated domains.",
    "Correction: Agent count is not a performance metric.",
    "Standing rule: Keep each project workspace isolated.",
    "Open question: Which persistence adapter should run by default?",
    "Next action: Add PostgreSQL persistence and exact-state resumption.",
  ].join("\n");

  const ingest = await app.inject({
    method: "POST",
    url: `/v1/pkm/workspaces/${workspaceId}/sources`,
    payload: {
      title: "Architecture decisions",
      kind: "conversation",
      authorship: "user",
      content,
      extractLabeledKnowledge: true,
    },
  });
  assert.equal(ingest.statusCode, 201);
  const result = ingest.json().result;
  assert.equal(result.extractedItems.length, 5);
  assert.ok(result.extractedItems.every((item: { authorship: string }) => item.authorship === "user"));
  assert.ok(result.extractedItems.every((item: { status: string }) => item.status === "candidate"));

  const beforeReview = await app.inject({
    method: "GET",
    url: `/v1/pkm/workspaces/${workspaceId}/search?q=governed%20core`,
  });
  assert.equal(beforeReview.statusCode, 200);
  assert.equal(beforeReview.json().hits.length, 0);

  for (const item of result.extractedItems as Array<{ id: string }>) {
    const approval = await app.inject({
      method: "POST",
      url: `/v1/pkm/workspaces/${workspaceId}/items/${item.id}/approve`,
      payload: { reviewedBy: "Charles Castillo" },
    });
    assert.equal(approval.statusCode, 200);
    assert.equal(approval.json().item.status, "approved");
  }

  const afterReview = await app.inject({
    method: "GET",
    url: `/v1/pkm/workspaces/${workspaceId}/search?q=governed%20core`,
  });
  assert.equal(afterReview.statusCode, 200);
  assert.ok(afterReview.json().hits.length >= 1);
  assert.equal(afterReview.json().hits[0].item.kind, "decision");

  const resume = await app.inject({
    method: "GET",
    url: `/v1/pkm/workspaces/${workspaceId}/resume`,
  });
  assert.equal(resume.statusCode, 200);
  assert.equal(resume.json().resume.decisions.length, 1);
  assert.equal(resume.json().resume.corrections.length, 1);
  assert.equal(resume.json().resume.standingRules.length, 1);
  assert.equal(resume.json().resume.unresolvedQuestions.length, 1);
  assert.equal(resume.json().resume.nextActions.length, 1);

  const source = await app.inject({
    method: "GET",
    url: `/v1/pkm/workspaces/${workspaceId}/sources/${result.source.id}/content`,
  });
  assert.equal(source.statusCode, 200);
  assert.equal(source.json().content, content);
  await app.close();
});

test("rejected knowledge never appears in approved resume state", async () => {
  const app = buildPkmApp();
  const workspace = await app.inject({
    method: "POST",
    url: "/v1/pkm/workspaces",
    payload: { name: "Separated project" },
  });
  const workspaceId = workspace.json().workspace.id as string;
  const ingest = await app.inject({
    method: "POST",
    url: `/v1/pkm/workspaces/${workspaceId}/sources`,
    payload: {
      title: "Unverified assistant output",
      kind: "conversation",
      authorship: "assistant",
      content: "Decision: This unsupported assistant statement should not become trusted memory.",
    },
  });
  const candidateId = ingest.json().result.extractedItems[0].id as string;

  const rejected = await app.inject({
    method: "POST",
    url: `/v1/pkm/workspaces/${workspaceId}/items/${candidateId}/reject`,
    payload: { reviewedBy: "Charles Castillo", reason: "Unsupported assistant-generated claim" },
  });
  assert.equal(rejected.statusCode, 200);
  assert.equal(rejected.json().item.status, "rejected");

  const resume = await app.inject({
    method: "GET",
    url: `/v1/pkm/workspaces/${workspaceId}/resume`,
  });
  assert.equal(resume.json().resume.decisions.length, 0);
  await app.close();
});
