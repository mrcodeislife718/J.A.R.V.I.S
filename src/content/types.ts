export const CONTENT_ENTITY_TYPES = [
  "brand",
  "source",
  "brief",
  "draft",
  "publication-plan",
  "performance",
  "experiment",
] as const;

export type ContentEntityType = (typeof CONTENT_ENTITY_TYPES)[number];
export type ContentReviewStatus = "candidate" | "approved" | "changes-requested" | "rejected" | "archived";
export type ContentSourceStatus = "candidate" | "approved" | "rejected";
export type ContentPublicationStatus = "planned" | "approved" | "cancelled" | "published";

export interface ContentBaseEntity {
  id: string;
  entityType: ContentEntityType;
  brandId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentBrand extends ContentBaseEntity {
  entityType: "brand";
  name: string;
  description: string | null;
  owner: string;
  voicePrinciples: string[];
  prohibitedClaims: string[];
  requiredDisclosures: string[];
  approvedPlatforms: string[];
  status: "active" | "archived";
  metadata: Record<string, unknown>;
}

export interface ContentSource extends ContentBaseEntity {
  entityType: "source";
  title: string;
  publisher: string | null;
  url: string | null;
  locator: string;
  publishedAt: string | null;
  summary: string;
  credibility: "high" | "medium" | "low" | "unknown";
  rights: "link-only" | "quote-limited" | "licensed" | "owned";
  status: ContentSourceStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
  supportedClaims: string[];
  metadata: Record<string, unknown>;
}

export interface ContentBrief extends ContentBaseEntity {
  entityType: "brief";
  title: string;
  purpose: string;
  audience: string;
  platform: string;
  format: string;
  owner: string;
  goals: string[];
  requiredSourceIds: string[];
  requiredMessages: string[];
  prohibitedMessages: string[];
  maximumCharacters: number | null;
  status: ContentReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface ContentClaimCheck {
  id: string;
  claim: string;
  sourceId: string | null;
  locator: string | null;
  status: "supported" | "unsupported" | "disputed";
  note: string | null;
}

export interface ContentDraft extends ContentBaseEntity {
  entityType: "draft";
  briefId: string;
  title: string;
  body: string;
  platform: string;
  format: string;
  createdBy: string;
  sourceIds: string[];
  claimChecks: ContentClaimCheck[];
  characterCount: number;
  status: ContentReviewStatus;
  reviewNotes: string[];
  reviewedBy: string | null;
  reviewedAt: string | null;
  version: number;
}

export interface ContentPublicationPlan extends ContentBaseEntity {
  entityType: "publication-plan";
  draftId: string;
  platform: string;
  scheduledFor: string | null;
  status: ContentPublicationStatus;
  requestedBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  externalReference: string | null;
  publishedAt: string | null;
  notes: string[];
}

export interface ContentPerformance extends ContentBaseEntity {
  entityType: "performance";
  publicationPlanId: string;
  platform: string;
  observedAt: string;
  recordedBy: string;
  metrics: {
    impressions: number;
    clicks: number;
    reactions: number;
    comments: number;
    shares: number;
    conversions: number;
    spend: number;
  };
  derived: {
    clickThroughRate: number | null;
    engagementRate: number | null;
    conversionRate: number | null;
    costPerConversion: number | null;
  };
  metadata: Record<string, unknown>;
}

export interface ContentExperiment extends ContentBaseEntity {
  entityType: "experiment";
  name: string;
  hypothesis: string;
  platform: string;
  primaryMetric: string;
  variantDraftIds: string[];
  status: "planned" | "running" | "completed" | "cancelled";
  startedAt: string | null;
  completedAt: string | null;
  conclusion: string | null;
  evidenceRefs: string[];
}

export type ContentEntity =
  | ContentBrand
  | ContentSource
  | ContentBrief
  | ContentDraft
  | ContentPublicationPlan
  | ContentPerformance
  | ContentExperiment;

export interface ContentEvent {
  id: string;
  brandId: string;
  entityType: ContentEntityType;
  entityId: string;
  type: string;
  actor: string;
  summary: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export interface ContentMissionContext {
  summary: string;
  evidence: Array<{
    id: string;
    source: string;
    locator: string;
    retrievedAt: string;
  }>;
  uncertainties: string[];
}
