import type {
  PkmKnowledgeItem,
  PkmRecordStatus,
  PkmRelation,
  PkmSearchHit,
  PkmSource,
  PkmTimelineEvent,
  PkmWorkspace,
} from "./types.js";

export interface PkmRepository {
  createWorkspace(workspace: PkmWorkspace): Promise<void>;
  getWorkspace(id: string): Promise<PkmWorkspace | null>;
  listWorkspaces(): Promise<PkmWorkspace[]>;
  saveWorkspace(workspace: PkmWorkspace): Promise<void>;

  saveSource(source: PkmSource): Promise<void>;
  getSource(id: string): Promise<PkmSource | null>;
  listSources(workspaceId: string, limit?: number): Promise<PkmSource[]>;

  saveItem(item: PkmKnowledgeItem): Promise<void>;
  getItem(id: string): Promise<PkmKnowledgeItem | null>;
  listItems(
    workspaceId: string,
    options?: { kinds?: PkmKnowledgeItem["kind"][]; status?: PkmRecordStatus; limit?: number },
  ): Promise<PkmKnowledgeItem[]>;
  lexicalSearch(workspaceId: string, query: string, limit: number): Promise<PkmSearchHit[]>;

  saveRelation(relation: PkmRelation): Promise<void>;
  listRelations(workspaceId: string): Promise<PkmRelation[]>;

  appendTimeline(event: PkmTimelineEvent): Promise<void>;
  listTimeline(workspaceId: string, limit?: number): Promise<PkmTimelineEvent[]>;
}
