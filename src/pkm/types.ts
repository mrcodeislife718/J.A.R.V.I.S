export const PKM_ITEM_KINDS = [
  "concept",
  "decision",
  "rationale",
  "correction",
  "standing-rule",
  "unresolved-question",
  "next-action",
  "evidence",
  "assumption",
  "contradiction",
  "project-state",
] as const;

export type PkmItemKind = (typeof PKM_ITEM_KINDS)[number];
export type PkmAuthorship = "user" | "assistant" | "external" | "system" | "mixed";
export type PkmSourceKind = "conversation" | "note" | "file" | "research" | "plan" | "import";
export type PkmRecordStatus = "candidate" | "approved" | "rejected" | "superseded";
export type PkmEvidenceState = "observed" | "sourced" | "inferred" | "assumed" | "disputed" | "unknown";

export interface PkmWorkspace {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface PkmSource {
  id: string;
  workspaceId: string;
  title: string;
  kind: PkmSourceKind;
  authorship: PkmAuthorship;
  externalUri: string | null;
  blobKey: string;
  contentHash: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PkmKnowledgeItem {
  id: string;
  workspaceId: string;
  sourceId: string;
  kind: PkmItemKind;
  title: string;
  body: string;
  authorship: PkmAuthorship;
  confidence: number;
  status: PkmRecordStatus;
  evidenceState: PkmEvidenceState;
  sourceStart: number | null;
  sourceEnd: number | null;
  validFrom: string | null;
  validUntil: string | null;
  supersedesId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PkmRelation {
  id: string;
  workspaceId: string;
  fromItemId: string;
  toItemId: string;
  type: "supports" | "contradicts" | "depends-on" | "supersedes" | "relates-to" | "implements";
  confidence: number;
  createdAt: string;
}

export interface PkmTimelineEvent {
  id: string;
  workspaceId: string;
  itemId: string | null;
  sourceId: string | null;
  type: string;
  summary: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export interface PkmIngestRequest {
  title: string;
  kind: PkmSourceKind;
  authorship: PkmAuthorship;
  content: string;
  externalUri?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  extractLabeledKnowledge?: boolean | undefined;
}

export interface PkmSearchHit {
  item: PkmKnowledgeItem;
  score: number;
  lexicalRank: number | null;
  semanticRank: number | null;
  matchedBy: Array<"lexical" | "semantic">;
}

export interface PkmResumePacket {
  workspace: PkmWorkspace;
  decisions: PkmKnowledgeItem[];
  standingRules: PkmKnowledgeItem[];
  corrections: PkmKnowledgeItem[];
  unresolvedQuestions: PkmKnowledgeItem[];
  nextActions: PkmKnowledgeItem[];
  projectState: PkmKnowledgeItem[];
  contradictions: PkmKnowledgeItem[];
  recentTimeline: PkmTimelineEvent[];
  generatedAt: string;
}
