import { randomUUID } from "node:crypto";
import type { ContentRepository } from "./repository.js";
import type {
  ContentBrand,
  ContentBrief,
  ContentDraft,
  ContentEntity,
  ContentEntityType,
  ContentExperiment,
  ContentMissionContext,
  ContentPerformance,
  ContentPublicationPlan,
  ContentReviewStatus,
  ContentSource,
} from "./types.js";

export interface CreateContentBrandInput {
  id?: string;
  name: string;
  description?: string;
  owner: string;
  voicePrinciples?: string[];
  prohibitedClaims?: string[];
  requiredDisclosures?: string[];
  approvedPlatforms?: string[];
  metadata?: Record<string, unknown>;
}

export interface RegisterContentSourceInput {
  id?: string;
  brandId: string;
  title: string;
  publisher?: string;
  url?: string;
  locator: string;
  publishedAt?: string;
  summary: string;
  credibility?: ContentSource["credibility"];
  rights?: ContentSource["rights"];
  supportedClaims?: string[];
  metadata?: Record<string, unknown>;
  registeredBy: string;
}

export interface CreateContentBriefInput {
  id?: string;
  brandId: string;
  title: string;
  purpose: string;
  audience: string;
  platform: string;
  format: string;
  owner: string;
  goals?: string[];
  requiredSourceIds?: string[];
  requiredMessages?: string[];
  prohibitedMessages?: string[];
  maximumCharacters?: number;
}

export interface CreateContentDraftInput {
  id?: string;
  brandId: string;
  briefId: string;
  title: string;
  body: string;
  createdBy: string;
  sourceIds?: string[];
  claims?: Array<{ id?: string; claim: string; sourceId?: string; locator?: string; note?: string }>;
}

export interface CreatePublicationPlanInput {
  id?: string;
  brandId: string;
  draftId: string;
  platform: string;
  scheduledFor?: string;
  requestedBy: string;
  notes?: string[];
}

export interface RecordPerformanceInput {
  id?: string;
  brandId: string;
  publicationPlanId: string;
  observedAt: string;
  recordedBy: string;
  metrics: ContentPerformance["metrics"];
  metadata?: Record<string, unknown>;
}

export interface CreateContentExperimentInput {
  id?: string;
  brandId: string;
  name: string;
  hypothesis: string;
  platform: string;
  primaryMetric: string;
  variantDraftIds: string[];
  createdBy: string;
}

const unique = (values: string[] | undefined): string[] =>
  [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))].sort();

const requireText = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
};

const requireCount = (value: number, label: string): number => {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative finite number`);
  return value;
};

const ratio = (numerator: number, denominator: number): number | null =>
  denominator > 0 ? Math.round((numerator / denominator) * 1_000_000) / 1_000_000 : null;

export class ContentService {
  constructor(private readonly repository: ContentRepository) {}

  async createBrand(input: CreateContentBrandInput): Promise<ContentBrand> {
    const now = new Date().toISOString();
    const id = input.id?.trim() || randomUUID();
    const existing = await this.repository.get("brand", id);
    const brand: ContentBrand = {
      id,
      entityType: "brand",
      brandId: id,
      name: requireText(input.name, "Brand name"),
      description: input.description?.trim() || null,
      owner: requireText(input.owner, "Brand owner"),
      voicePrinciples: unique(input.voicePrinciples),
      prohibitedClaims: unique(input.prohibitedClaims),
      requiredDisclosures: unique(input.requiredDisclosures),
      approvedPlatforms: unique(input.approvedPlatforms),
      status: existing?.entityType === "brand" ? existing.status : "active",
      metadata: { ...(existing?.entityType === "brand" ? existing.metadata : {}), ...(input.metadata ?? {}) },
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.repository.save(brand);
    await this.event(brand, existing ? "brand.updated" : "brand.created", brand.owner, `Stored brand ${brand.name}`);
    return brand;
  }

  async registerSource(input: RegisterContentSourceInput): Promise<ContentSource> {
    await this.requireBrand(input.brandId);
    const now = new Date().toISOString();
    const source: ContentSource = {
      id: input.id?.trim() || randomUUID(),
      entityType: "source",
      brandId: input.brandId,
      title: requireText(input.title, "Source title"),
      publisher: input.publisher?.trim() || null,
      url: input.url?.trim() || null,
      locator: requireText(input.locator, "Source locator"),
      publishedAt: input.publishedAt ?? null,
      summary: requireText(input.summary, "Source summary"),
      credibility: input.credibility ?? "unknown",
      rights: input.rights ?? "link-only",
      status: "candidate",
      reviewedBy: null,
      reviewedAt: null,
      reviewReason: null,
      supportedClaims: unique(input.supportedClaims),
      metadata: structuredClone(input.metadata ?? {}),
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.save(source);
    await this.event(source, "source.registered", requireText(input.registeredBy, "Source registrar"), `Registered candidate source ${source.title}`);
    return source;
  }

  async reviewSource(sourceId: string, approved: boolean, reviewer: string, reason: string): Promise<ContentSource> {
    const source = await this.requireEntity("source", sourceId);
    if (source.status !== "candidate") throw new Error("Only candidate sources can be reviewed");
    source.status = approved ? "approved" : "rejected";
    source.reviewedBy = requireText(reviewer, "Source reviewer");
    source.reviewedAt = new Date().toISOString();
    source.reviewReason = requireText(reason, "Source review reason");
    source.updatedAt = source.reviewedAt;
    await this.repository.save(source);
    await this.event(source, approved ? "source.approved" : "source.rejected", source.reviewedBy, `${approved ? "Approved" : "Rejected"} source ${source.title}`, { reason: source.reviewReason });
    return source;
  }

  async createBrief(input: CreateContentBriefInput): Promise<ContentBrief> {
    const brand = await this.requireBrand(input.brandId);
    const platform = requireText(input.platform, "Brief platform");
    if (brand.approvedPlatforms.length > 0 && !brand.approvedPlatforms.includes(platform)) {
      throw new Error(`Platform ${platform} is not approved for this brand`);
    }
    for (const sourceId of unique(input.requiredSourceIds)) {
      const source = await this.requireEntity("source", sourceId);
      if (source.brandId !== input.brandId || source.status !== "approved") {
        throw new Error("Brief required sources must be approved and belong to the same brand");
      }
    }
    if (input.maximumCharacters !== undefined && (!Number.isInteger(input.maximumCharacters) || input.maximumCharacters <= 0)) {
      throw new Error("Maximum characters must be a positive integer");
    }
    const now = new Date().toISOString();
    const brief: ContentBrief = {
      id: input.id?.trim() || randomUUID(),
      entityType: "brief",
      brandId: input.brandId,
      title: requireText(input.title, "Brief title"),
      purpose: requireText(input.purpose, "Brief purpose"),
      audience: requireText(input.audience, "Brief audience"),
      platform,
      format: requireText(input.format, "Brief format"),
      owner: requireText(input.owner, "Brief owner"),
      goals: unique(input.goals),
      requiredSourceIds: unique(input.requiredSourceIds),
      requiredMessages: unique(input.requiredMessages),
      prohibitedMessages: unique(input.prohibitedMessages),
      maximumCharacters: input.maximumCharacters ?? null,
      status: "candidate",
      reviewedBy: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.save(brief);
    await this.event(brief, "brief.created", brief.owner, `Created candidate brief ${brief.title}`);
    return brief;
  }

  async reviewBrief(briefId: string, approved: boolean, reviewer: string): Promise<ContentBrief> {
    const brief = await this.requireEntity("brief", briefId);
    if (brief.status !== "candidate" && brief.status !== "changes-requested") {
      throw new Error("Only candidate or changes-requested briefs can be reviewed");
    }
    brief.status = approved ? "approved" : "changes-requested";
    brief.reviewedBy = requireText(reviewer, "Brief reviewer");
    brief.reviewedAt = new Date().toISOString();
    brief.updatedAt = brief.reviewedAt;
    await this.repository.save(brief);
    await this.event(brief, approved ? "brief.approved" : "brief.changes-requested", brief.reviewedBy, `${approved ? "Approved" : "Requested changes for"} brief ${brief.title}`);
    return brief;
  }

  async createDraft(input: CreateContentDraftInput): Promise<ContentDraft> {
    const brand = await this.requireBrand(input.brandId);
    const brief = await this.requireEntity("brief", input.briefId);
    if (brief.brandId !== input.brandId) throw new Error("Draft and brief must belong to the same brand");
    if (brief.status !== "approved") throw new Error("A draft requires an approved brief");
    const body = requireText(input.body, "Draft body");
    if (brief.maximumCharacters !== null && body.length > brief.maximumCharacters) {
      throw new Error(`Draft exceeds the ${brief.maximumCharacters} character limit`);
    }
    const prohibited = [...brand.prohibitedClaims, ...brief.prohibitedMessages]
      .filter((phrase) => body.toLowerCase().includes(phrase.toLowerCase()));
    if (prohibited.length > 0) throw new Error(`Draft contains prohibited language: ${prohibited.join(", ")}`);
    const sourceIds = unique([...(input.sourceIds ?? []), ...brief.requiredSourceIds]);
    const sourceMap = new Map<string, ContentSource>();
    for (const sourceId of sourceIds) {
      const source = await this.requireEntity("source", sourceId);
      if (source.brandId !== input.brandId || source.status !== "approved") {
        throw new Error("Draft sources must be approved and belong to the same brand");
      }
      sourceMap.set(source.id, source);
    }
    const claimChecks = (input.claims ?? []).map((claim) => {
      const claimText = requireText(claim.claim, "Draft claim");
      const sourceId = claim.sourceId?.trim() || null;
      const source = sourceId ? sourceMap.get(sourceId) : undefined;
      const supported = Boolean(source && (source.supportedClaims.length === 0 || source.supportedClaims.some((item) =>
        claimText.toLowerCase().includes(item.toLowerCase()) || item.toLowerCase().includes(claimText.toLowerCase()),
      )));
      return {
        id: claim.id?.trim() || randomUUID(),
        claim: claimText,
        sourceId,
        locator: claim.locator?.trim() || source?.locator || null,
        status: supported ? "supported" as const : "unsupported" as const,
        note: claim.note?.trim() || null,
      };
    });
    const now = new Date().toISOString();
    const draft: ContentDraft = {
      id: input.id?.trim() || randomUUID(),
      entityType: "draft",
      brandId: input.brandId,
      briefId: brief.id,
      title: requireText(input.title, "Draft title"),
      body,
      platform: brief.platform,
      format: brief.format,
      createdBy: requireText(input.createdBy, "Draft creator"),
      sourceIds,
      claimChecks,
      characterCount: body.length,
      status: "candidate",
      reviewNotes: [],
      reviewedBy: null,
      reviewedAt: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.save(draft);
    await this.event(draft, "draft.created", draft.createdBy, `Created candidate draft ${draft.title}`, {
      unsupportedClaims: claimChecks.filter((claim) => claim.status !== "supported").length,
    });
    return draft;
  }

  async reviewDraft(
    draftId: string,
    status: Extract<ContentReviewStatus, "approved" | "changes-requested" | "rejected">,
    reviewer: string,
    note: string,
  ): Promise<ContentDraft> {
    const draft = await this.requireEntity("draft", draftId);
    if (!["candidate", "changes-requested"].includes(draft.status)) throw new Error("Draft is not reviewable");
    const brand = await this.requireBrand(draft.brandId);
    const brief = await this.requireEntity("brief", draft.briefId);
    if (status === "approved") {
      const unsupported = draft.claimChecks.filter((claim) => claim.status !== "supported");
      if (unsupported.length > 0) throw new Error("Draft cannot be approved while claims remain unsupported or disputed");
      const missingDisclosures = brand.requiredDisclosures.filter((disclosure) =>
        !draft.body.toLowerCase().includes(disclosure.toLowerCase()),
      );
      if (missingDisclosures.length > 0) {
        throw new Error(`Draft is missing required disclosures: ${missingDisclosures.join(", ")}`);
      }
      const missingMessages = brief.requiredMessages.filter((message) =>
        !draft.body.toLowerCase().includes(message.toLowerCase()),
      );
      if (missingMessages.length > 0) throw new Error(`Draft is missing required messages: ${missingMessages.join(", ")}`);
    }
    draft.status = status;
    draft.reviewedBy = requireText(reviewer, "Draft reviewer");
    draft.reviewedAt = new Date().toISOString();
    draft.reviewNotes.push(requireText(note, "Draft review note"));
    draft.updatedAt = draft.reviewedAt;
    await this.repository.save(draft);
    await this.event(draft, `draft.${status}`, draft.reviewedBy, `${status} draft ${draft.title}`, { note: draft.reviewNotes.at(-1) });
    return draft;
  }

  async createPublicationPlan(input: CreatePublicationPlanInput): Promise<ContentPublicationPlan> {
    const brand = await this.requireBrand(input.brandId);
    const draft = await this.requireEntity("draft", input.draftId);
    if (draft.brandId !== brand.id || draft.status !== "approved") {
      throw new Error("Publication planning requires an approved draft from the same brand");
    }
    const platform = requireText(input.platform, "Publication platform");
    if (platform !== draft.platform) throw new Error("Publication platform must match the approved draft platform");
    const now = new Date().toISOString();
    const plan: ContentPublicationPlan = {
      id: input.id?.trim() || randomUUID(),
      entityType: "publication-plan",
      brandId: input.brandId,
      draftId: draft.id,
      platform,
      scheduledFor: input.scheduledFor ?? null,
      status: "planned",
      requestedBy: requireText(input.requestedBy, "Publication requester"),
      approvedBy: null,
      approvedAt: null,
      externalReference: null,
      publishedAt: null,
      notes: unique(input.notes),
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.save(plan);
    await this.event(plan, "publication.planned", plan.requestedBy, `Planned publication of ${draft.title} on ${platform}`);
    return plan;
  }

  async approvePublicationPlan(planId: string, approvedBy: string): Promise<ContentPublicationPlan> {
    const plan = await this.requireEntity("publication-plan", planId);
    if (plan.status !== "planned") throw new Error("Only planned publications can be approved");
    plan.status = "approved";
    plan.approvedBy = requireText(approvedBy, "Publication approver");
    plan.approvedAt = new Date().toISOString();
    plan.updatedAt = plan.approvedAt;
    await this.repository.save(plan);
    await this.event(plan, "publication.approved", plan.approvedBy, `Approved publication plan ${plan.id}`);
    return plan;
  }

  async recordManualPublication(
    planId: string,
    actor: string,
    externalReference: string,
    publishedAt: string,
  ): Promise<ContentPublicationPlan> {
    const plan = await this.requireEntity("publication-plan", planId);
    if (plan.status !== "approved") throw new Error("Publication must be approved before recording completion");
    plan.status = "published";
    plan.externalReference = requireText(externalReference, "External publication reference");
    plan.publishedAt = publishedAt;
    plan.updatedAt = new Date().toISOString();
    await this.repository.save(plan);
    await this.event(plan, "publication.recorded", requireText(actor, "Publication recorder"), `Recorded externally published content ${plan.externalReference}`);
    return plan;
  }

  async recordPerformance(input: RecordPerformanceInput): Promise<ContentPerformance> {
    await this.requireBrand(input.brandId);
    const plan = await this.requireEntity("publication-plan", input.publicationPlanId);
    if (plan.brandId !== input.brandId || plan.status !== "published") {
      throw new Error("Performance can only be recorded for a published plan from the same brand");
    }
    const metrics = {
      impressions: requireCount(input.metrics.impressions, "Impressions"),
      clicks: requireCount(input.metrics.clicks, "Clicks"),
      reactions: requireCount(input.metrics.reactions, "Reactions"),
      comments: requireCount(input.metrics.comments, "Comments"),
      shares: requireCount(input.metrics.shares, "Shares"),
      conversions: requireCount(input.metrics.conversions, "Conversions"),
      spend: requireCount(input.metrics.spend, "Spend"),
    };
    if (metrics.clicks > metrics.impressions || metrics.conversions > metrics.clicks) {
      throw new Error("Performance counts are internally inconsistent");
    }
    const now = new Date().toISOString();
    const performance: ContentPerformance = {
      id: input.id?.trim() || randomUUID(),
      entityType: "performance",
      brandId: input.brandId,
      publicationPlanId: plan.id,
      platform: plan.platform,
      observedAt: input.observedAt,
      recordedBy: requireText(input.recordedBy, "Performance recorder"),
      metrics,
      derived: {
        clickThroughRate: ratio(metrics.clicks, metrics.impressions),
        engagementRate: ratio(metrics.reactions + metrics.comments + metrics.shares, metrics.impressions),
        conversionRate: ratio(metrics.conversions, metrics.clicks),
        costPerConversion: metrics.conversions > 0 ? Math.round((metrics.spend / metrics.conversions) * 100) / 100 : null,
      },
      metadata: structuredClone(input.metadata ?? {}),
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.save(performance);
    await this.event(performance, "performance.recorded", performance.recordedBy, `Recorded performance for publication ${plan.id}`);
    return performance;
  }

  async createExperiment(input: CreateContentExperimentInput): Promise<ContentExperiment> {
    const brand = await this.requireBrand(input.brandId);
    const variants = unique(input.variantDraftIds);
    if (variants.length < 2) throw new Error("A content experiment requires at least two draft variants");
    for (const draftId of variants) {
      const draft = await this.requireEntity("draft", draftId);
      if (draft.brandId !== brand.id || draft.status !== "approved") {
        throw new Error("Experiment variants must be approved drafts from the same brand");
      }
    }
    const now = new Date().toISOString();
    const experiment: ContentExperiment = {
      id: input.id?.trim() || randomUUID(),
      entityType: "experiment",
      brandId: input.brandId,
      name: requireText(input.name, "Experiment name"),
      hypothesis: requireText(input.hypothesis, "Experiment hypothesis"),
      platform: requireText(input.platform, "Experiment platform"),
      primaryMetric: requireText(input.primaryMetric, "Experiment primary metric"),
      variantDraftIds: variants,
      status: "planned",
      startedAt: null,
      completedAt: null,
      conclusion: null,
      evidenceRefs: [],
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.save(experiment);
    await this.event(experiment, "experiment.planned", requireText(input.createdBy, "Experiment creator"), `Planned experiment ${experiment.name}`);
    return experiment;
  }

  async completeExperiment(
    experimentId: string,
    actor: string,
    conclusion: string,
    evidenceRefs: string[],
  ): Promise<ContentExperiment> {
    const experiment = await this.requireEntity("experiment", experimentId);
    if (!evidenceRefs.length) throw new Error("Experiment completion requires performance evidence");
    experiment.status = "completed";
    experiment.completedAt = new Date().toISOString();
    experiment.conclusion = requireText(conclusion, "Experiment conclusion");
    experiment.evidenceRefs = unique(evidenceRefs);
    experiment.updatedAt = experiment.completedAt;
    await this.repository.save(experiment);
    await this.event(experiment, "experiment.completed", requireText(actor, "Experiment reviewer"), `Completed experiment ${experiment.name}`);
    return experiment;
  }

  async getEntity<T extends ContentEntityType>(type: T, id: string): Promise<Extract<ContentEntity, { entityType: T }>> {
    return this.requireEntity(type, id);
  }

  async listEntities<T extends ContentEntityType>(
    type: T,
    brandId?: string,
    limit = 200,
  ): Promise<Array<Extract<ContentEntity, { entityType: T }>>> {
    return this.listOf(type, brandId, limit);
  }

  async listEvents(brandId?: string, entityId?: string, limit = 500) {
    return this.repository.listEvents({ brandId, entityId, limit });
  }

  async buildMissionContext(brandId?: string, draftId?: string): Promise<ContentMissionContext> {
    const brands = brandId ? [await this.requireBrand(brandId)] : await this.listOf("brand", undefined, 20);
    const selectedId = brandId ?? brands[0]?.id;
    if (!selectedId) return { summary: "No governed content brand is registered.", evidence: [], uncertainties: ["Content context is empty."] };
    const [sources, briefs, drafts, plans, performance] = await Promise.all([
      this.listOf("source", selectedId, 100),
      this.listOf("brief", selectedId, 50),
      this.listOf("draft", selectedId, 50),
      this.listOf("publication-plan", selectedId, 50),
      this.listOf("performance", selectedId, 50),
    ]);
    const brand = await this.requireBrand(selectedId);
    const requestedDraft = draftId ? await this.requireEntity("draft", draftId) : drafts[0];
    if (requestedDraft && requestedDraft.brandId !== selectedId) throw new Error("Requested draft belongs to another brand");
    const approvedSources = sources.filter((source) => source.status === "approved");
    const approvedDrafts = drafts.filter((draft) => draft.status === "approved");
    const pendingPlans = plans.filter((plan) => plan.status === "planned");
    const generatedAt = new Date().toISOString();
    const lines = [
      `Brand: ${brand.name} (${brand.id}); owner: ${brand.owner}.`,
      `Voice principles: ${brand.voicePrinciples.join("; ") || "not defined"}.`,
      `Approved platforms: ${brand.approvedPlatforms.join(", ") || "not restricted"}.`,
      `Approved sources: ${approvedSources.length}; candidate sources: ${sources.filter((source) => source.status === "candidate").length}.`,
      `Approved briefs: ${briefs.filter((brief) => brief.status === "approved").length}; approved drafts: ${approvedDrafts.length}; pending publication approvals: ${pendingPlans.length}.`,
      `Latest performance records: ${performance.slice(0, 5).map((item) => `${item.platform} CTR=${item.derived.clickThroughRate ?? "n/a"}, engagement=${item.derived.engagementRate ?? "n/a"}`).join("; ") || "none"}.`,
      requestedDraft ? `Selected draft: ${requestedDraft.title} [${requestedDraft.status}], unsupported claims: ${requestedDraft.claimChecks.filter((claim) => claim.status !== "supported").length}.` : "No draft selected.",
      "Publication is never automatic. A human-approved plan and externally completed publication record are required.",
    ];
    const entities: ContentEntity[] = [brand, ...approvedSources, ...briefs.filter((brief) => brief.status === "approved"), ...approvedDrafts, ...pendingPlans, ...performance.slice(0, 5)];
    if (requestedDraft && !entities.some((entity) => entity.entityType === "draft" && entity.id === requestedDraft.id)) entities.push(requestedDraft);
    return {
      summary: lines.join("\n"),
      evidence: entities.map((entity) => ({
        id: entity.id,
        source: `content:${entity.entityType}:${entity.id}`,
        locator: entity.brandId,
        retrievedAt: generatedAt,
      })),
      uncertainties: [
        ...(approvedSources.length === 0 ? ["No sources have been approved for reuse."] : []),
        ...(pendingPlans.length > 0 ? [`${pendingPlans.length} publication plans await approval.`] : []),
        ...(requestedDraft?.claimChecks.some((claim) => claim.status !== "supported") ? ["The selected draft contains unsupported or disputed claims."] : []),
      ],
    };
  }

  private async requireBrand(id: string): Promise<ContentBrand> {
    return this.requireEntity("brand", id);
  }

  private async requireEntity<T extends ContentEntityType>(
    type: T,
    id: string,
  ): Promise<Extract<ContentEntity, { entityType: T }>> {
    const entity = await this.repository.get(type, id);
    if (!entity || entity.entityType !== type) throw new Error(`${type} not found`);
    return entity as Extract<ContentEntity, { entityType: T }>;
  }

  private async listOf<T extends ContentEntityType>(
    type: T,
    brandId?: string,
    limit = 200,
  ): Promise<Array<Extract<ContentEntity, { entityType: T }>>> {
    const entities = await this.repository.list(type, { brandId, limit });
    return entities.filter((entity) => entity.entityType === type) as Array<Extract<ContentEntity, { entityType: T }>>;
  }

  private async event(
    entity: ContentEntity,
    type: string,
    actor: string,
    summary: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.repository.appendEvent({
      id: randomUUID(),
      brandId: entity.brandId,
      entityType: entity.entityType,
      entityId: entity.id,
      type,
      actor: actor.trim(),
      summary,
      occurredAt: new Date().toISOString(),
      metadata: structuredClone(metadata),
    });
  }
}
