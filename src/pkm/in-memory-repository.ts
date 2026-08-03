import type { PkmRepository } from "./repository.js";
import type {
  PkmKnowledgeItem,
  PkmRecordStatus,
  PkmRelation,
  PkmSearchHit,
  PkmSource,
  PkmTimelineEvent,
  PkmWorkspace,
} from "./types.js";

const clone = <T>(value: T): T => structuredClone(value);

const tokenize = (value: string): Set<string> =>
  new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/u)
      .filter((token) => token.length > 1),
  );

export class InMemoryPkmRepository implements PkmRepository {
  private readonly workspaces = new Map<string, PkmWorkspace>();
  private readonly sources = new Map<string, PkmSource>();
  private readonly items = new Map<string, PkmKnowledgeItem>();
  private readonly relations = new Map<string, PkmRelation>();
  private readonly timeline: PkmTimelineEvent[] = [];

  async createWorkspace(workspace: PkmWorkspace): Promise<void> {
    if (this.workspaces.has(workspace.id)) throw new Error(`Workspace ${workspace.id} already exists`);
    this.workspaces.set(workspace.id, clone(workspace));
  }

  async getWorkspace(id: string): Promise<PkmWorkspace | null> {
    const workspace = this.workspaces.get(id);
    return workspace ? clone(workspace) : null;
  }

  async listWorkspaces(): Promise<PkmWorkspace[]> {
    return [...this.workspaces.values()]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(clone);
  }

  async saveWorkspace(workspace: PkmWorkspace): Promise<void> {
    this.workspaces.set(workspace.id, clone(workspace));
  }

  async saveSource(source: PkmSource): Promise<void> {
    this.sources.set(source.id, clone(source));
  }

  async getSource(id: string): Promise<PkmSource | null> {
    const source = this.sources.get(id);
    return source ? clone(source) : null;
  }

  async listSources(workspaceId: string, limit = 100): Promise<PkmSource[]> {
    return [...this.sources.values()]
      .filter((source) => source.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map(clone);
  }

  async saveItem(item: PkmKnowledgeItem): Promise<void> {
    this.items.set(item.id, clone(item));
  }

  async getItem(id: string): Promise<PkmKnowledgeItem | null> {
    const item = this.items.get(id);
    return item ? clone(item) : null;
  }

  async listItems(
    workspaceId: string,
    options: { kinds?: PkmKnowledgeItem["kind"][]; status?: PkmRecordStatus; limit?: number } = {},
  ): Promise<PkmKnowledgeItem[]> {
    const kindSet = options.kinds ? new Set(options.kinds) : null;
    return [...this.items.values()]
      .filter((item) => item.workspaceId === workspaceId)
      .filter((item) => !kindSet || kindSet.has(item.kind))
      .filter((item) => !options.status || item.status === options.status)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, options.limit ?? 200)
      .map(clone);
  }

  async lexicalSearch(workspaceId: string, query: string, limit: number): Promise<PkmSearchHit[]> {
    const queryTokens = tokenize(query);
    if (queryTokens.size === 0) return [];

    return [...this.items.values()]
      .filter((item) => item.workspaceId === workspaceId && item.status === "approved")
      .map((item) => {
        const itemTokens = tokenize(`${item.title} ${item.body}`);
        const matches = [...queryTokens].filter((token) => itemTokens.has(token)).length;
        const score = matches / queryTokens.size;
        return { item, score };
      })
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((candidate, index) => ({
        item: clone(candidate.item),
        score: candidate.score,
        lexicalRank: index + 1,
        semanticRank: null,
        matchedBy: ["lexical"],
      }));
  }

  async saveRelation(relation: PkmRelation): Promise<void> {
    this.relations.set(relation.id, clone(relation));
  }

  async listRelations(workspaceId: string): Promise<PkmRelation[]> {
    return [...this.relations.values()]
      .filter((relation) => relation.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(clone);
  }

  async appendTimeline(event: PkmTimelineEvent): Promise<void> {
    this.timeline.push(clone(event));
  }

  async listTimeline(workspaceId: string, limit = 100): Promise<PkmTimelineEvent[]> {
    return this.timeline
      .filter((event) => event.workspaceId === workspaceId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, limit)
      .map(clone);
  }
}
