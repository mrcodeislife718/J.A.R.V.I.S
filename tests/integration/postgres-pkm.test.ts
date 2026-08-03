import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FileSystemBlobStore } from "../../src/pkm/blob-store.js";
import { DeterministicEmbeddingClient } from "../../src/pkm/embedding.js";
import { PostgresPkmRepository } from "../../src/pkm/postgres-repository.js";
import { NoopSemanticIndex } from "../../src/pkm/semantic-index.js";
import { PkmService } from "../../src/pkm/service.js";
import { createPostgresPool, runMigrations } from "../../src/storage/postgres.js";

const databaseUrl = process.env.TEST_DATABASE_URL;

test(
  "PostgreSQL knowledge and content-addressed sources survive service restart",
  { skip: databaseUrl ? false : "TEST_DATABASE_URL is not configured" },
  async () => {
    if (!databaseUrl) return;
    const blobDirectory = await mkdtemp(join(tmpdir(), "jarvis-pkm-"));
    let workspaceId = "";
    let sourceId = "";

    const firstPool = createPostgresPool(databaseUrl);
    try {
      await runMigrations(firstPool);
      const firstService = new PkmService(
        new PostgresPkmRepository(firstPool),
        new FileSystemBlobStore(blobDirectory),
        new DeterministicEmbeddingClient(),
        new NoopSemanticIndex(),
      );
      const workspace = await firstService.createWorkspace({ name: "Persistent restart proof" });
      workspaceId = workspace.id;
      const ingested = await firstService.ingestSource(workspace.id, {
        title: "Durable project state",
        kind: "note",
        authorship: "user",
        content: "Decision: PostgreSQL is the authoritative knowledge store.\nNext action: Resume from approved state after restart.",
      });
      sourceId = ingested.source.id;
      assert.equal(ingested.extractedItems.length, 2);
      for (const item of ingested.extractedItems) {
        await firstService.approveItem(workspace.id, item.id, "CI reviewer");
      }
    } finally {
      await firstPool.end();
    }

    const secondPool = createPostgresPool(databaseUrl);
    try {
      const secondService = new PkmService(
        new PostgresPkmRepository(secondPool),
        new FileSystemBlobStore(blobDirectory),
        new DeterministicEmbeddingClient(),
        new NoopSemanticIndex(),
      );
      const workspace = await secondService.getWorkspace(workspaceId);
      assert.equal(workspace?.name, "Persistent restart proof");

      const resume = await secondService.buildResumePacket(workspaceId);
      assert.equal(resume.decisions.length, 1);
      assert.equal(resume.nextActions.length, 1);
      assert.match(resume.decisions[0]?.body ?? "", /authoritative knowledge store/u);

      const source = await secondService.getSourceContent(workspaceId, sourceId);
      assert.match(source.content, /Resume from approved state/u);

      const hits = await secondService.search(workspaceId, "authoritative knowledge store", 10);
      assert.ok(hits.some((hit) => hit.item.kind === "decision"));
    } finally {
      await secondPool.end();
      await rm(blobDirectory, { recursive: true, force: true });
    }
  },
);
