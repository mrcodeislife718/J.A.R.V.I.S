import { randomUUID } from "node:crypto";
import type { BlobStore } from "./blob-store.js";
import type { EmbeddingClient } from "./embedding.js";
import { LabeledKnowledgeExtractor } from "./extractor.js";
import type { PkmRepository } from "./repository.js";
import type { SemanticIndex } from "./semantic-index.js";
import { PkmSearchService } from "./search-service.js";
import type {
  PkmAuthorship,
  PkmEvidenceState,
  PkmIngestRequest,
  PkmItemKind,
  PkmKnowledgeItem,
  PkmRelation,
  PkmResumePacket,
  PkmSearchHit,
  PkmSource,
  PkmTimelineEvent,
  PkmWorkspace,
} from "./types.js";

export interface CreateKnowledgeItemInput {
  sourceId: string;
  kind: PkmItemKind;
  title: string;
  body: string;
  authorship: PkmAuthorship;
  confidence: number;
  evidenceState: PkmEvidenceState;
  sourceStart?: number | undefined;
  sourceEnd?: number | undefined;
  validFrom?: string | undefined;
  validUntil?: string | undefined;
  supersedesId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export class PkmService {
  private readonly searchService: PkmSearchService;
  private readonly extractor = new LabeledKnowledgeExtractor();

  constructor(
    private readonly repository: PkmRepository,
    private readonly blobStore: BlobStore,
    private readonly embeddingClient: EmbeddingClient,
    private readonly semanticIndex: SemanticIndex,
  ) {
    this.searchService = new PkmSearchService(repository, embeddingClient, semanticIndex);
  }

  async createWorkspace(input: { name: string; description?: string | undefined }): Promise<PkmWorkspace> {
    const now = new Date().toISOString();
    const workspace: PkmWorkspace = {
      id: randomUUID(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.createWorkspace(workspace);
    await this.appendTimeline({
      workspaceId: workspace.id,
      type: "workspace.created",
      summary: `Created workspace ${workspace.name}`,
      metadata: {},
    });
    return workspace;
  }

  async listWorkspaces(): Promise<PkmWorkspace[]> {
    return this.repository.listWorkspaces();
  }

  async getWorkspace(id: string): Promise<PkmWorkspace | null> {
    return this.repository.getWorkspace(id);
  }

  async ingestSource(
    workspaceId: string,
    input: PkmIngestRequest,
  ): Promise<{ source: PkmSource; extractedItems: PkmKnowledgeItem[] }> {
    const workspace = await this.requireWorkspace(workspaceId);
    const blob = await this.blobStore.putText(input.content);
    const now = new Date().toISOString();
    const source: PkmSource = {
      id: randomUUID(),
      workspaceId,
      title: input.title.trim(),
      kind: input.kind,
      authorship: input.authorship,
      externalUri: input.externalUri?.trim() || null,
      blobKey: blob.key,
      contentHash: blob.sha256,
      metadata: input.metadata ?? {},
      createdAt: now,
    };
    await this.repository.saveSource(source);
    workspace.updatedAt = now;
    await this.repository.saveWorkspace(workspace);
    await this.appendTimeline({
      workspaceId,
      sourceId: source.id,
      type: "source.ingested",
      summary: `Ingested ${source.kind}: ${source.title}`,
      metadata: { contentHash: source.contentHash, bytes: blob.bytes, authorship: source.authorship },
    });

    const extractedItems: PkmKnowledgeItem[] = [];
    if (input.extractLabeledKnowledge !== false) {
      for (const candidate of this.extractor.extract(input.content, input.authorship)) {
        extractedItems.push(
          await this.createKnowledgeItem(workspaceId, {
            sourceId: source.id,
            kind: candidate.kind,
            title: candidate.title,
            body: candidate.body,
            authorship: candidate.authorship,
            confidence: candidate.confidence,
            evidenceState: candidate.evidenceState,
            sourceStart: candidate.sourceStart,
            sourceEnd: candidate.sourceEnd,
            metadata: { extractionMethod: "explicit-label-v1" },
          }),
        );
      }
    }

    return { source, extractedItems };
  }

  async getSourceContent(workspaceId: string, sourceId: string): Promise<{ source: PkmSource; content: string }> {
    await this.requireWorkspace(workspaceId);
    const source = await this.repository.getSource(sourceId);
    if (!source || source.workspaceId !== workspaceId) throw new Error("Source not found");
    return { source, content: await this.blobStore.getText(source.blobKey) };
  }

  async listSources(workspaceId: string, limit = 100): Promise<PkmSource[]> {
    await this.requireWorkspace(workspaceId);
    return this.repository.listSources(workspaceId, limit);
  }

  async createKnowledgeItem(
    workspaceId: string,
    input: CreateKnowledgeItemInput,
  ): Promise<PkmKnowledgeItem> {
    const workspace = await this.requireWorkspace(workspaceId);
    const source = await this.repository.getSource(input.sourceId);
    if (!source || source.workspaceId !== workspaceId) throw new Error("Source not found in workspace");
    if (input.confidence < 0 || input.confidence > 1) throw new Error("Confidence must be between 0 and 1");

    const now = new Date().toISOString();
    const item: PkmKnowledgeItem = {
      id: randomUUID(),
      workspaceId,
      sourceId: input.sourceId,
      kind: input.kind,
      title: input.title.trim(),
      body: input.body.trim(),
      authorship: input.authorship,
      confidence: input.confidence,
      status: "candidate",
      evidenceState: input.evidenceState,
      sourceStart: input.sourceStart ?? null,
      sourceEnd: input.sourceEnd ?? null,
      validFrom: input.validFrom ?? null,
      validUntil: input.validUntil ?? null,
      supersedesId: input.supersedesId ?? null,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.saveItem(item);
    workspace.updatedAt = now;
    await this.repository.saveWorkspace(workspace);
    await this.appendTimeline({
      workspaceId,
      itemId: item.id,
      sourceId: item.sourceId,
      type: "knowledge.candidate-created",
      summary: `${item.kind}: ${item.title}`,
      metadata: { authorship: item.authorship, evidenceState: item.evidenceState },
    });
    return item;
  }

  async approveItem(workspaceId: string, itemId: string, reviewedBy: string): Promise<PkmKnowledgeItem> {
    const item = await this.requireItem(workspaceId, itemId);
    if (item.status === "superseded") throw new Error("Superseded knowledge cannot be approved");
    item.status = "approved";
    item.updatedAt = new Date().toISOString();
    item.metadata = { ...item.metadata, reviewedBy, reviewedAt: item.updatedAt };
    await this.repository.saveItem(item);

    let indexed = false;
    try {
      const vector = await this.embeddingClient.embed(`${item.title}\n${item.body}`);
      await this.semanticIndex.upsert({ itemId: item.id, workspaceId, vector });
      indexed = true;
    } catch {
      indexed = false;
    }

    await this.appendTimeline({
      workspaceId,
      itemId: item.id,
      sourceId: item.sourceId,
      type: "knowledge.approved",
      summary: `Approved ${item.kind}: ${item.title}`,
      metadata: { reviewedBy, semanticIndexed: indexed },
    });
    return item;
  }

  async rejectItem(
    workspaceId: string,
    itemId: string,
    reviewedBy: string,
    reason: string,
  ): Promise<PkmKnowledgeItem> {
    const item = await this.requireItem(workspaceId, itemId);
    item.status = "rejected";
    item.updatedAt = new Date().toISOString();
    item.metadata = { ...item.metadata, reviewedBy, reviewedAt: item.updatedAt, rejectionReason: reason };
    await this.repository.saveItem(item);
    await this.semanticIndex.remove(item.id).catch(() => undefined);
    await this.appendTimeline({
      workspaceId,
      itemId: item.id,
      sourceId: item.sourceId,
      type: "knowledge.rejected",
      summary: `Rejected ${item.kind}: ${item.title}`,
      metadata: { reviewedBy, reason },
    });
    return item;
  }

  async supersedeItem(
    workspaceId: string,
    itemId: string,
    replacement: Omit<CreateKnowledgeItemInput, "supersedesId">,
  ): Promise<{ previous: PkmKnowledgeItem; replacement: PkmKnowledgeItem; relation: PkmRelation }> {
    const previous = await this.requireItem(workspaceId, itemId);
    previous.status = "superseded";
    previous.updatedAt = new Date().toISOString();
    await this.repository.saveItem(previous);
    await this.semanticIndex.remove(previous.id).catch(() => undefined);

    const created = await this.createKnowledgeItem(workspaceId, { ...replacement, supersedesId: previous.id });
    const relation: PkmRelation = {
      id: randomUUID(),
      workspaceId,
      fromItemId: created.id,
      toItemId: previous.id,
      type: "supersedes",
      confidence: 1,
      createdAt: new Date().toISOString(),
    };
    await this.repository.saveRelation(relation);
    await this.appendTimeline({
      workspaceId,
      itemId: created.id,
      sourceId: created.sourceId,
      type: "knowledge.supersedes",
      summary: `${created.title} supersedes ${previous.title}`,
      metadata: { previousItemId: previous.id },
    });
    return { previous, replacement: created, relation };
  }

  async listItems(
    workspaceId: string,
    options: Parameters<PkmRepository["listItems"]>[1] = {},
  ): Promise<PkmKnowledgeItem[]> {
    await this.requireWorkspace(workspaceId);
    return this.repository.listItems(workspaceId, options);
  }

  async search(workspaceId: string, query: string, limit = 20): Promise<PkmSearchHit[]> {
    await this.requireWorkspace(workspaceId);
    return this.searchService.search(workspaceId, query, limit);
  }

  async buildResumePacket(workspaceId: string): Promise<PkmResumePacket> {
    const workspace = await this.requireWorkspace(workspaceId);
    const approved = { status: "approved" as const, limit: 200 };
    const [decisions, standingRules, corrections, unresolvedQuestions, nextActions, projectState, contradictions, recentTimeline] =
      await Promise.all([
        this.repository.listItems(workspaceId, { ...approved, kinds: ["decision"] }),
        this.repository.listItems(workspaceId, { ...approved, kinds: ["standing-rule"] }),
        this.repository.listItems(workspaceId, { ...approved, kinds: ["correction"] }),
        this.repository.listItems(workspaceId, { ...approved, kinds: ["unresolved-question"] }),
        this.repository.listItems(workspaceId, { ...approved, kinds: ["next-action"] }),
        this.repository.listItems(workspaceId, { ...approved, kinds: ["project-state"] }),
        this.repository.listItems(workspaceId, { ...approved, kinds: ["contradiction"] }),
        this.repository.listTimeline(workspaceId, 50),
      ]);

    return {
      workspace,
      decisions,
      standingRules,
      corrections,
      unresolvedQuestions,
      nextActions,
      projectState,
      contradictions,
      recentTimeline,
      generatedAt: new Date().toISOString(),
    };
  }

  async listTimeline(workspaceId: string, limit = 100): Promise<PkmTimelineEvent[]> {
    await this.requireWorkspace(workspaceId);
    return this.repository.listTimeline(workspaceId, limit);
  }

  private async requireWorkspace(id: string): Promise<PkmWorkspace> {
    const workspace = await this.repository.getWorkspace(id);
    if (!workspace) throw new Error("Workspace not found");
    return workspace;
  }

  private async requireItem(workspaceId: string, itemId: string): Promise<PkmKnowledgeItem> {
    await this.requireWorkspace(workspaceId);
    const item = await this.repository.getItem(itemId);
    if (!item || item.workspaceId !== workspaceId) throw new Error("Knowledge item not found");
    return item;
  }

  private async appendTimeline(input: {
    workspaceId: string;
    itemId?: string | undefined;
    sourceId?: string | undefined;
    type: string;
    summary: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    await this.repository.appendTimeline({
      id: randomUUID(),
      workspaceId: input.workspaceId,
      itemId: input.itemId ?? null,
      sourceId: input.sourceId ?? null,
      type: input.type,
      summary: input.summary,
      occurredAt: new Date().toISOString(),
      metadata: input.metadata,
    });
  }
}
