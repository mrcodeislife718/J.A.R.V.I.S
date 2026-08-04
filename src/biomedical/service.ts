import { createHash, randomUUID } from "node:crypto";
import type { BiomedicalRepository } from "./repository.js";
import type {
  BiomedicalClaim,
  BiomedicalCommercializationPlan,
  BiomedicalConfidence,
  BiomedicalContradiction,
  BiomedicalDecisionGate,
  BiomedicalDevelopmentPlan,
  BiomedicalEngagementStage,
  BiomedicalEntity,
  BiomedicalEntityType,
  BiomedicalEvidenceKind,
  BiomedicalEvidenceSource,
  BiomedicalFundingOpportunity,
  BiomedicalHypothesis,
  BiomedicalIpAsset,
  BiomedicalKnowledgeEdge,
  BiomedicalKnowledgeNode,
  BiomedicalLaboratoryEngagement,
  BiomedicalLaboratoryPartner,
  BiomedicalManufacturingPlan,
  BiomedicalMissionContext,
  BiomedicalRegulatoryPathway,
  BiomedicalResearchArea,
  BiomedicalResearchProgram,
  BiomedicalWorkspace,
} from "./types.js";

export interface CreateBiomedicalWorkspaceInput {
  id?: string | undefined;
  name: string;
  owner: string;
  description?: string | undefined;
  researchAreas?: BiomedicalResearchArea[] | undefined;
  objectives?: string[] | undefined;
  operatingRules?: string[] | undefined;
  revenueTargets?: string[] | undefined;
  metadata?: Record<string, unknown> | undefined;
}
export interface CreateBiomedicalProgramInput {
  id?: string | undefined; workspaceId: string; name: string; researchArea: BiomedicalResearchArea;
  diseaseOrPlatform: string; subtype?: string | undefined; problemStatement: string; intendedImpact: string;
  commercialThesis: string; owner: string; eightNodeMap: BiomedicalResearchProgram["eightNodeMap"];
  successCriteria: string[]; terminationCriteria: string[]; nextActions?: string[] | undefined; uncertainties?: string[] | undefined;
}
export interface CreateBiomedicalEvidenceInput {
  id?: string | undefined; workspaceId: string; programId: string; kind: BiomedicalEvidenceKind; title: string;
  authors?: string[] | undefined; publicationOrOwner: string; publishedAt?: string | undefined; locator: string;
  persistentIdentifier?: string | undefined; abstractOrSummary: string; methodsSummary?: string | undefined;
  populationOrModel?: string | undefined; sampleSize?: number | undefined; endpoints?: string[] | undefined;
  keyFindings?: string[] | undefined; limitations?: string[] | undefined; conflictOfInterest?: string | undefined;
  retractionStatus?: BiomedicalEvidenceSource["retractionStatus"] | undefined; metadata?: Record<string, unknown> | undefined;
}
export interface EvidenceReviewInput {
  status: "approved" | "rejected" | "retracted"; reviewedBy: string; reason: string;
  preregistered?: boolean | undefined; blinded?: boolean | undefined; adequateControls?: boolean | undefined;
  independentlyReplicated?: boolean | undefined; riskOfBias?: "low" | "moderate" | "high" | undefined;
}
export interface CreateBiomedicalClaimInput {
  id?: string | undefined; workspaceId: string; programId: string; statement: string; claimType: BiomedicalClaim["claimType"];
  direction: BiomedicalClaim["direction"]; sourceIds: string[]; targetIds?: string[] | undefined;
  confidence?: BiomedicalConfidence | undefined; assumptions?: string[] | undefined; limitations?: string[] | undefined;
}
export interface CreateBiomedicalContradictionInput {
  id?: string | undefined; workspaceId: string; programId: string; claimIds: string[]; description: string;
  possibleExplanations?: string[] | undefined; resolutionRequirements?: string[] | undefined;
}
export interface CreateBiomedicalNodeInput {
  id?: string | undefined; workspaceId: string; programId: string; nodeType: BiomedicalKnowledgeNode["nodeType"];
  name: string; description: string; aliases?: string[] | undefined; evidenceSourceIds?: string[] | undefined;
}
export interface CreateBiomedicalEdgeInput {
  id?: string | undefined; workspaceId: string; programId: string; fromNodeId: string; toNodeId: string;
  relation: BiomedicalKnowledgeEdge["relation"]; description: string; sourceIds: string[]; confidence?: BiomedicalConfidence | undefined;
}
export interface CreateBiomedicalHypothesisInput {
  id?: string | undefined; workspaceId: string; programId: string; title: string; statement: string; rationale: string;
  mechanismNodeIds?: string[] | undefined; supportingClaimIds: string[]; contradictingClaimIds?: string[] | undefined;
  assumptions?: string[] | undefined; uncertainties: string[]; falsificationCriteria: string[];
  translationalPotential: string; commercialPotential: string;
}
export interface CreateBiomedicalDevelopmentPlanInput {
  id?: string | undefined; workspaceId: string; programId: string; hypothesisId: string; title: string; objective: string;
  developmentStage: BiomedicalDevelopmentPlan["developmentStage"]; modelClass: string; controls: string[]; endpoints: string[];
  successCriteria: string[]; failureCriteria: string[]; requiredCapabilities: string[]; requiredQualitySystems?: string[] | undefined;
  externalExecutionRequired?: boolean | undefined; estimatedBudgetRange?: string | undefined;
  estimatedTimeline?: string | undefined; risks?: string[] | undefined;
}
export interface CreateBiomedicalLaboratoryInput {
  id?: string | undefined; workspaceId: string; name: string; organizationType: BiomedicalLaboratoryPartner["organizationType"];
  location: string; website?: string | undefined; capabilities: string[]; equipment?: string[] | undefined;
  qualitySystems?: string[] | undefined; biosafetyLevels?: string[] | undefined; certifications?: string[] | undefined;
  scientificContacts?: string[] | undefined; pricingNotes?: string | undefined; availabilityNotes?: string | undefined;
  dataReturnPractices?: string[] | undefined; ipTermsNotes?: string | undefined; confidentialityReady?: boolean | undefined;
  riskFlags?: string[] | undefined;
}
export interface CreateBiomedicalEngagementInput {
  id?: string | undefined; workspaceId: string; programId: string; laboratoryId: string; developmentPlanId: string;
  scopeSummary: string; requiredDeliverables: string[]; requiredRawData: string[]; qualityRequirements: string[];
  chainOfCustodyRequirements?: string[] | undefined; budgetCeiling?: number | undefined; currency?: string | undefined;
  timeline?: string | undefined;
}
export interface EngagementTransitionInput {
  to: BiomedicalEngagementStage; actor: string; reason: string; reference?: string | undefined;
  authorizationScope?: string | undefined; evidenceRefs?: string[] | undefined; outcomeSummary?: string | undefined;
}
export interface CreateBiomedicalRegulatoryInput {
  id?: string | undefined; workspaceId: string; programId: string; jurisdiction: string; productClassification: string;
  intendedUse: string; pathway: string; agencies: string[]; requiredEvidence: string[]; requiredQualitySystems: string[];
  ethicsOrOversight?: string[] | undefined; majorRisks?: string[] | undefined; milestones?: string[] | undefined;
}
export interface CreateBiomedicalIpInput {
  id?: string | undefined; workspaceId: string; programId: string; title: string; assetType: BiomedicalIpAsset["assetType"];
  inventors: string[]; description: string; differentiators: string[]; evidenceSourceIds?: string[] | undefined;
  priorArtReferences?: string[] | undefined; enablementGaps?: string[] | undefined; ownershipNotes: string;
}
export interface CreateBiomedicalFundingInput {
  id?: string | undefined; workspaceId: string; programId: string; sponsor: string; title: string; mechanism: string;
  locator: string; eligibility?: string[] | undefined; strategicFit?: string[] | undefined;
  requiredPartners?: string[] | undefined; estimatedAward?: string | undefined; deadline?: string | undefined;
  owner: string; nextActions?: string[] | undefined;
}
export interface CreateBiomedicalManufacturingInput {
  id?: string | undefined; workspaceId: string; programId: string; title: string; modality: string;
  criticalQualityAttributes: string[]; rawMaterialRequirements?: string[] | undefined;
  analyticalRequirements?: string[] | undefined; processDevelopmentNeeds?: string[] | undefined;
  stabilityRequirements?: string[] | undefined; packagingAndStorage?: string[] | undefined;
  technologyTransferNeeds?: string[] | undefined; costOfGoodsAssumptions?: string[] | undefined;
  scaleUpRisks?: string[] | undefined; externalPartnerRequirements?: string[] | undefined; readinessLevel?: number | undefined;
}
export interface CreateBiomedicalCommercializationInput {
  id?: string | undefined; workspaceId: string; programId: string; title: string; targetCustomers: string[];
  valueProposition: string; revenueModels: BiomedicalCommercializationPlan["revenueModels"];
  earlyRevenueOptions?: string[] | undefined; marketEvidenceSourceIds?: string[] | undefined;
  competitors?: string[] | undefined; pricingAssumptions?: string[] | undefined;
  reimbursementOrProcurement?: string[] | undefined; partnershipTargets?: string[] | undefined;
  commercialRisks?: string[] | undefined; milestones?: string[] | undefined;
}
export interface CreateBiomedicalDecisionGateInput {
  id?: string | undefined; workspaceId: string; programId: string; name: string; gateType: BiomedicalDecisionGate["gateType"];
  recommendation: string; evidenceSourceIds: string[]; unresolvedContradictionIds?: string[] | undefined;
  requiredConditions?: string[] | undefined;
}

const nowIso = (): string => new Date().toISOString();
const text = (value: string, label: string): string => { const normalized = value.trim(); if (!normalized) throw new Error(`${label} is required`); return normalized; };
const list = (values: string[] | undefined): string[] => [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
const idOrNew = (value: string | undefined): string => value?.trim() || randomUUID();
const hash = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const clamp = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));
const confidenceFor = (score: number): BiomedicalConfidence => score >= 85 ? "very-high" : score >= 70 ? "high" : score >= 50 ? "moderate" : score >= 30 ? "low" : "very-low";
const baseEvidenceScore: Record<BiomedicalEvidenceKind, number> = {
  "systematic-review": 88, "meta-analysis": 90, "randomized-trial": 85, "controlled-clinical-study": 76,
  "cohort-study": 66, "case-control-study": 60, "case-series": 42, "preclinical-in-vivo": 52,
  "preclinical-in-vitro": 40, computational: 32, patent: 25, "clinical-trial-registry": 55,
  "regulatory-record": 82, "external-lab-report": 62, dataset: 55, "expert-opinion": 22,
  "market-intelligence": 35, other: 30,
};
const prohibitedResearchPatterns: RegExp[] = [
  /self[- ]administer/iu, /human dosing schedule/iu, /bypass (?:irb|ethics|regulatory|biosafety)/iu,
  /evade (?:oversight|regulation|review)/iu, /enhance (?:a )?pathogen/iu,
  /increase pathogen (?:virulence|transmissibility)/iu, /execute wet[- ]lab work autonomously/iu,
];
const assertGovernedResearchScope = (...values: string[]): void => {
  if (prohibitedResearchPatterns.some((pattern) => pattern.test(values.join("\n")))) {
    throw new Error("The requested record crosses the governed biomedical boundary for self-use, oversight evasion, pathogen enhancement, or autonomous wet-lab execution");
  }
};
const engagementTransitions: Record<BiomedicalEngagementStage, BiomedicalEngagementStage[]> = {
  candidate: ["capability-review", "rejected", "cancelled"], "capability-review": ["nda-review", "rfi", "rejected", "cancelled"],
  "nda-review": ["rfi", "rfq", "rejected", "cancelled"], rfi: ["rfq", "rejected", "cancelled"],
  rfq: ["sow-review", "rejected", "cancelled"], "sow-review": ["contracted", "rejected", "cancelled"],
  contracted: ["authorized", "cancelled"], authorized: ["in-progress", "cancelled"],
  "in-progress": ["results-received", "cancelled"], "results-received": ["verified", "in-progress"],
  verified: ["closed"], closed: [], rejected: [], cancelled: [],
};

export class BiomedicalService {
  constructor(private readonly repository: BiomedicalRepository) {}

  private async event(entity: BiomedicalEntity, type: string, actor: string, summary: string, metadata: Record<string, unknown> = {}): Promise<void> {
    await this.repository.appendEvent({ id: randomUUID(), workspaceId: entity.workspaceId, entityType: entity.entityType,
      entityId: entity.id, type, actor: text(actor, "Actor"), summary: text(summary, "Summary"), occurredAt: nowIso(), metadata });
  }
  private async require<T extends BiomedicalEntity>(type: BiomedicalEntityType, id: string): Promise<T> {
    const entity = await this.repository.get(type, id); if (!entity) throw new Error(`${type} not found`); return entity as T;
  }
  private async requireWorkspace(id: string): Promise<BiomedicalWorkspace> {
    const workspace = await this.require<BiomedicalWorkspace>("workspace", id);
    if (workspace.status !== "active") throw new Error("Biomedical workspace is archived"); return workspace;
  }
  private async requireProgram(id: string, workspaceId?: string): Promise<BiomedicalResearchProgram> {
    const program = await this.require<BiomedicalResearchProgram>("research-program", id);
    if (workspaceId && program.workspaceId !== workspaceId) throw new Error("Research program belongs to another workspace"); return program;
  }

  async createWorkspace(input: CreateBiomedicalWorkspaceInput): Promise<BiomedicalWorkspace> {
    const id = idOrNew(input.id); const existing = await this.repository.get("workspace", id); const timestamp = nowIso();
    const entity: BiomedicalWorkspace = { id, entityType: "workspace", workspaceId: id, name: text(input.name, "Workspace name"), owner: text(input.owner, "Owner"),
      description: input.description?.trim() || null, researchAreas: [...new Set(input.researchAreas ?? [])], objectives: list(input.objectives),
      operatingRules: list(input.operatingRules), revenueTargets: list(input.revenueTargets),
      status: existing?.entityType === "workspace" ? existing.status : "active",
      metadata: { ...(existing?.entityType === "workspace" ? existing.metadata : {}), ...(input.metadata ?? {}) },
      createdAt: existing?.createdAt ?? timestamp, updatedAt: timestamp };
    await this.repository.save(entity); await this.event(entity, existing ? "workspace.updated" : "workspace.created", input.owner, entity.name); return entity;
  }
  async createProgram(input: CreateBiomedicalProgramInput): Promise<BiomedicalResearchProgram> {
    await this.requireWorkspace(input.workspaceId); assertGovernedResearchScope(input.problemStatement, input.intendedImpact); const timestamp = nowIso();
    const entity: BiomedicalResearchProgram = { id: idOrNew(input.id), entityType: "research-program", workspaceId: input.workspaceId,
      name: text(input.name, "Program name"), researchArea: input.researchArea, diseaseOrPlatform: text(input.diseaseOrPlatform, "Disease or platform"),
      subtype: input.subtype?.trim() || null, problemStatement: text(input.problemStatement, "Problem statement"),
      intendedImpact: text(input.intendedImpact, "Intended impact"), commercialThesis: text(input.commercialThesis, "Commercial thesis"),
      stage: "discovery", owner: text(input.owner, "Program owner"), eightNodeMap: {
        input: list(input.eightNodeMap.input), process: list(input.eightNodeMap.process), output: list(input.eightNodeMap.output), feedback: list(input.eightNodeMap.feedback),
        incentives: list(input.eightNodeMap.incentives), bottlenecks: list(input.eightNodeMap.bottlenecks), dependencies: list(input.eightNodeMap.dependencies), failurePoints: list(input.eightNodeMap.failurePoints) },
      successCriteria: list(input.successCriteria), terminationCriteria: list(input.terminationCriteria), evidenceSourceIds: [], hypothesisIds: [],
      nextActions: list(input.nextActions), uncertainties: list(input.uncertainties), createdAt: timestamp, updatedAt: timestamp };
    await this.repository.save(entity); await this.event(entity, "research-program.created", input.owner, entity.name); return entity;
  }
  async createEvidence(input: CreateBiomedicalEvidenceInput): Promise<BiomedicalEvidenceSource> {
    await this.requireProgram(input.programId, input.workspaceId); const timestamp = nowIso();
    const entity: BiomedicalEvidenceSource = { id: idOrNew(input.id), entityType: "evidence-source", workspaceId: input.workspaceId, programId: input.programId,
      kind: input.kind, title: text(input.title, "Evidence title"), authors: list(input.authors), publicationOrOwner: text(input.publicationOrOwner, "Publication or owner"),
      publishedAt: input.publishedAt?.trim() || null, locator: text(input.locator, "Evidence locator"), persistentIdentifier: input.persistentIdentifier?.trim() || null,
      abstractOrSummary: text(input.abstractOrSummary, "Evidence summary"), methodsSummary: input.methodsSummary?.trim() || null,
      populationOrModel: input.populationOrModel?.trim() || null, sampleSize: input.sampleSize ?? null, endpoints: list(input.endpoints), keyFindings: list(input.keyFindings),
      limitations: list(input.limitations), conflictOfInterest: input.conflictOfInterest?.trim() || null, retractionStatus: input.retractionStatus ?? "not-checked",
      status: "candidate", qualityScore: null, confidence: null, qualityReasons: [], reviewedBy: null, reviewedAt: null, reviewReason: null,
      provenanceHash: hash({ kind: input.kind, title: input.title, locator: input.locator, persistentIdentifier: input.persistentIdentifier ?? null }),
      metadata: input.metadata ?? {}, createdAt: timestamp, updatedAt: timestamp };
    await this.repository.save(entity); const program = await this.requireProgram(input.programId);
    await this.repository.save({ ...program, evidenceSourceIds: list([...program.evidenceSourceIds, entity.id]), updatedAt: timestamp });
    await this.event(entity, "evidence.created", "biomedical-system", entity.title); return entity;
  }
  async reviewEvidence(id: string, input: EvidenceReviewInput): Promise<BiomedicalEvidenceSource> {
    const entity = await this.require<BiomedicalEvidenceSource>("evidence-source", id);
    if (!["candidate", "approved"].includes(entity.status)) throw new Error("Evidence is not reviewable in its current state");
    const reasons = [`Base score ${baseEvidenceScore[entity.kind]} for ${entity.kind}`]; let score = baseEvidenceScore[entity.kind];
    if (input.preregistered) { score += 5; reasons.push("Preregistration documented"); }
    if (input.blinded) { score += 5; reasons.push("Blinding documented"); }
    if (input.adequateControls) { score += 8; reasons.push("Adequate controls documented"); }
    if (input.independentlyReplicated) { score += 10; reasons.push("Independent replication documented"); }
    if (entity.sampleSize !== null && entity.sampleSize < 10) { score -= 10; reasons.push("Very small sample or model count"); }
    if (entity.conflictOfInterest) { score -= 4; reasons.push("Conflict-of-interest disclosure requires interpretation"); }
    if (input.riskOfBias === "moderate") { score -= 10; reasons.push("Moderate risk of bias"); }
    if (input.riskOfBias === "high") { score -= 22; reasons.push("High risk of bias"); }
    if (entity.retractionStatus === "expression-of-concern") { score -= 35; reasons.push("Expression of concern recorded"); }
    if (entity.retractionStatus === "retracted" || input.status === "retracted") { score = 0; reasons.push("Source is retracted"); }
    const qualityScore = clamp(score); const timestamp = nowIso();
    const updated: BiomedicalEvidenceSource = { ...entity, status: input.status, qualityScore, confidence: confidenceFor(qualityScore), qualityReasons: reasons,
      reviewedBy: text(input.reviewedBy, "Reviewer"), reviewedAt: timestamp, reviewReason: text(input.reason, "Review reason"),
      retractionStatus: input.status === "retracted" ? "retracted" : entity.retractionStatus, updatedAt: timestamp };
    await this.repository.save(updated); await this.event(updated, `evidence.${input.status}`, input.reviewedBy, input.reason, { qualityScore, confidence: updated.confidence }); return updated;
  }
  async createClaim(input: CreateBiomedicalClaimInput): Promise<BiomedicalClaim> {
    await this.requireProgram(input.programId, input.workspaceId); if (input.sourceIds.length === 0) throw new Error("Biomedical claims require at least one evidence source");
    for (const sourceId of input.sourceIds) { const source = await this.require<BiomedicalEvidenceSource>("evidence-source", sourceId);
      if (source.programId !== input.programId || source.status !== "approved") throw new Error("Claims may use only approved evidence from the same program"); }
    assertGovernedResearchScope(input.statement); const timestamp = nowIso();
    const entity: BiomedicalClaim = { id: idOrNew(input.id), entityType: "claim", workspaceId: input.workspaceId, programId: input.programId,
      statement: text(input.statement, "Claim statement"), claimType: input.claimType, direction: input.direction, sourceIds: list(input.sourceIds), targetIds: list(input.targetIds),
      confidence: input.confidence ?? "moderate", status: "candidate", assumptions: list(input.assumptions), limitations: list(input.limitations),
      reviewedBy: null, reviewedAt: null, reviewReason: null, createdAt: timestamp, updatedAt: timestamp };
    await this.repository.save(entity); await this.event(entity, "claim.created", "biomedical-system", entity.statement); return entity;
  }
  async reviewClaim(id: string, status: "approved" | "rejected", reviewedBy: string, reason: string): Promise<BiomedicalClaim> {
    const entity = await this.require<BiomedicalClaim>("claim", id); if (entity.status !== "candidate") throw new Error("Only candidate claims can be reviewed");
    const timestamp = nowIso(); const updated: BiomedicalClaim = { ...entity, status, reviewedBy: text(reviewedBy, "Reviewer"), reviewedAt: timestamp,
      reviewReason: text(reason, "Review reason"), updatedAt: timestamp };
    await this.repository.save(updated); await this.event(updated, `claim.${status}`, reviewedBy, reason); return updated;
  }
  async createContradiction(input: CreateBiomedicalContradictionInput): Promise<BiomedicalContradiction> {
    await this.requireProgram(input.programId, input.workspaceId); if (new Set(input.claimIds).size < 2) throw new Error("A contradiction requires at least two distinct claims");
    for (const claimId of input.claimIds) { const claim = await this.require<BiomedicalClaim>("claim", claimId); if (claim.programId !== input.programId) throw new Error("Contradiction claims must belong to the same program"); }
    const timestamp = nowIso(); const entity: BiomedicalContradiction = { id: idOrNew(input.id), entityType: "contradiction", workspaceId: input.workspaceId, programId: input.programId,
      claimIds: list(input.claimIds), description: text(input.description, "Contradiction description"), possibleExplanations: list(input.possibleExplanations),
      resolutionRequirements: list(input.resolutionRequirements), status: "open", resolutionSummary: null, reviewedBy: null, createdAt: timestamp, updatedAt: timestamp };
    await this.repository.save(entity); await this.event(entity, "contradiction.created", "biomedical-system", entity.description); return entity;
  }
  async resolveContradiction(id: string, status: Exclude<BiomedicalContradiction["status"], "open">, reviewedBy: string, summary: string): Promise<BiomedicalContradiction> {
    const entity = await this.require<BiomedicalContradiction>("contradiction", id);
    const updated: BiomedicalContradiction = { ...entity, status, reviewedBy: text(reviewedBy, "Reviewer"), resolutionSummary: text(summary, "Resolution summary"), updatedAt: nowIso() };
    await this.repository.save(updated); await this.event(updated, `contradiction.${status}`, reviewedBy, summary); return updated;
  }
  async createNode(input: CreateBiomedicalNodeInput): Promise<BiomedicalKnowledgeNode> {
    await this.requireProgram(input.programId, input.workspaceId); const timestamp = nowIso();
    const entity: BiomedicalKnowledgeNode = { id: idOrNew(input.id), entityType: "knowledge-node", workspaceId: input.workspaceId, programId: input.programId,
      nodeType: input.nodeType, name: text(input.name, "Node name"), description: text(input.description, "Node description"), aliases: list(input.aliases),
      evidenceSourceIds: list(input.evidenceSourceIds), status: "candidate", createdAt: timestamp, updatedAt: timestamp };
    await this.repository.save(entity); await this.event(entity, "knowledge-node.created", "biomedical-system", entity.name); return entity;
  }
  async reviewNode(id: string, status: "approved" | "rejected", reviewer: string): Promise<BiomedicalKnowledgeNode> {
    const entity = await this.require<BiomedicalKnowledgeNode>("knowledge-node", id); const updated: BiomedicalKnowledgeNode = { ...entity, status, updatedAt: nowIso() };
    await this.repository.save(updated); await this.event(updated, `knowledge-node.${status}`, reviewer, entity.name); return updated;
  }
  async createEdge(input: CreateBiomedicalEdgeInput): Promise<BiomedicalKnowledgeEdge> {
    await this.requireProgram(input.programId, input.workspaceId); const from = await this.require<BiomedicalKnowledgeNode>("knowledge-node", input.fromNodeId);
    const to = await this.require<BiomedicalKnowledgeNode>("knowledge-node", input.toNodeId);
    if (from.programId !== input.programId || to.programId !== input.programId) throw new Error("Graph nodes must belong to the same program");
    if (input.sourceIds.length === 0) throw new Error("Knowledge edges require evidence sources"); const timestamp = nowIso();
    const entity: BiomedicalKnowledgeEdge = { id: idOrNew(input.id), entityType: "knowledge-edge", workspaceId: input.workspaceId, programId: input.programId,
      fromNodeId: input.fromNodeId, toNodeId: input.toNodeId, relation: input.relation, description: text(input.description, "Edge description"),
      sourceIds: list(input.sourceIds), confidence: input.confidence ?? "moderate", status: "candidate", createdAt: timestamp, updatedAt: timestamp };
    await this.repository.save(entity); await this.event(entity, "knowledge-edge.created", "biomedical-system", `${from.name} ${entity.relation} ${to.name}`); return entity;
  }
  async reviewEdge(id: string, status: "approved" | "rejected", reviewer: string): Promise<BiomedicalKnowledgeEdge> {
    const entity = await this.require<BiomedicalKnowledgeEdge>("knowledge-edge", id); const updated: BiomedicalKnowledgeEdge = { ...entity, status, updatedAt: nowIso() };
    await this.repository.save(updated); await this.event(updated, `knowledge-edge.${status}`, reviewer, entity.description); return updated;
  }
  async createHypothesis(input: CreateBiomedicalHypothesisInput): Promise<BiomedicalHypothesis> {
    const program = await this.requireProgram(input.programId, input.workspaceId); if (input.supportingClaimIds.length === 0) throw new Error("Hypotheses require approved supporting claims");
    for (const claimId of input.supportingClaimIds) { const claim = await this.require<BiomedicalClaim>("claim", claimId);
      if (claim.programId !== input.programId || claim.status !== "approved") throw new Error("Hypotheses may use only approved claims from the same program"); }
    if (input.uncertainties.length === 0 || input.falsificationCriteria.length === 0) throw new Error("Hypotheses require uncertainties and falsification criteria");
    assertGovernedResearchScope(input.statement, input.rationale); const timestamp = nowIso();
    const entity: BiomedicalHypothesis = { id: idOrNew(input.id), entityType: "hypothesis", workspaceId: input.workspaceId, programId: input.programId,
      title: text(input.title, "Hypothesis title"), statement: text(input.statement, "Hypothesis statement"), rationale: text(input.rationale, "Rationale"),
      mechanismNodeIds: list(input.mechanismNodeIds), supportingClaimIds: list(input.supportingClaimIds), contradictingClaimIds: list(input.contradictingClaimIds),
      assumptions: list(input.assumptions), uncertainties: list(input.uncertainties), falsificationCriteria: list(input.falsificationCriteria),
      translationalPotential: text(input.translationalPotential, "Translational potential"), commercialPotential: text(input.commercialPotential, "Commercial potential"),
      status: "candidate", reviewedBy: null, reviewedAt: null, reviewReason: null, createdAt: timestamp, updatedAt: timestamp };
    await this.repository.save(entity); await this.repository.save({ ...program, hypothesisIds: list([...program.hypothesisIds, entity.id]), updatedAt: timestamp });
    await this.event(entity, "hypothesis.created", "biomedical-system", entity.title); return entity;
  }
  async reviewHypothesis(id: string, status: "approved" | "rejected", reviewedBy: string, reason: string): Promise<BiomedicalHypothesis> {
    const entity = await this.require<BiomedicalHypothesis>("hypothesis", id); if (entity.status !== "candidate") throw new Error("Only candidate hypotheses can be reviewed");
    const timestamp = nowIso(); const updated: BiomedicalHypothesis = { ...entity, status, reviewedBy: text(reviewedBy, "Reviewer"), reviewedAt: timestamp,
      reviewReason: text(reason, "Review reason"), updatedAt: timestamp };
    await this.repository.save(updated); await this.event(updated, `hypothesis.${status}`, reviewedBy, reason); return updated;
  }
  async createDevelopmentPlan(input: CreateBiomedicalDevelopmentPlanInput): Promise<BiomedicalDevelopmentPlan> {
    await this.requireProgram(input.programId, input.workspaceId); const hypothesis = await this.require<BiomedicalHypothesis>("hypothesis", input.hypothesisId);
    if (hypothesis.programId !== input.programId || hypothesis.status !== "approved") throw new Error("Development plans require an approved hypothesis from the same program");
    if (input.controls.length === 0 || input.endpoints.length === 0 || input.successCriteria.length === 0 || input.failureCriteria.length === 0) throw new Error("Development plans require controls, endpoints, success criteria, and failure criteria");
    assertGovernedResearchScope(input.objective); const timestamp = nowIso();
    const entity: BiomedicalDevelopmentPlan = { id: idOrNew(input.id), entityType: "development-plan", workspaceId: input.workspaceId, programId: input.programId,
      hypothesisId: input.hypothesisId, title: text(input.title, "Development plan title"), objective: text(input.objective, "Development objective"),
      developmentStage: input.developmentStage, modelClass: text(input.modelClass, "Model class"), controls: list(input.controls), endpoints: list(input.endpoints),
      successCriteria: list(input.successCriteria), failureCriteria: list(input.failureCriteria), requiredCapabilities: list(input.requiredCapabilities),
      requiredQualitySystems: list(input.requiredQualitySystems), externalExecutionRequired: input.externalExecutionRequired ?? true,
      estimatedBudgetRange: input.estimatedBudgetRange?.trim() || null, estimatedTimeline: input.estimatedTimeline?.trim() || null,
      risks: list(input.risks), status: "candidate", reviewedBy: null, reviewedAt: null, reviewReason: null, createdAt: timestamp, updatedAt: timestamp };
    await this.repository.save(entity); await this.event(entity, "development-plan.created", "biomedical-system", entity.title); return entity;
  }
  async reviewDevelopmentPlan(id: string, status: "approved" | "rejected", reviewedBy: string, reason: string): Promise<BiomedicalDevelopmentPlan> {
    const entity = await this.require<BiomedicalDevelopmentPlan>("development-plan", id); if (entity.status !== "candidate") throw new Error("Only candidate development plans can be reviewed");
    const timestamp = nowIso(); const updated: BiomedicalDevelopmentPlan = { ...entity, status, reviewedBy: text(reviewedBy, "Reviewer"), reviewedAt: timestamp,
      reviewReason: text(reason, "Review reason"), updatedAt: timestamp };
    await this.repository.save(updated); await this.event(updated, `development-plan.${status}`, reviewedBy, reason); return updated;
  }
  async createLaboratory(input: CreateBiomedicalLaboratoryInput): Promise<BiomedicalLaboratoryPartner> {
    await this.requireWorkspace(input.workspaceId); const timestamp = nowIso();
    const entity: BiomedicalLaboratoryPartner = { id: idOrNew(input.id), entityType: "laboratory-partner", workspaceId: input.workspaceId,
      name: text(input.name, "Laboratory name"), organizationType: input.organizationType, location: text(input.location, "Location"), website: input.website?.trim() || null,
      capabilities: list(input.capabilities), equipment: list(input.equipment), qualitySystems: list(input.qualitySystems), biosafetyLevels: list(input.biosafetyLevels),
      certifications: list(input.certifications), scientificContacts: list(input.scientificContacts), pricingNotes: input.pricingNotes?.trim() || null,
      availabilityNotes: input.availabilityNotes?.trim() || null, dataReturnPractices: list(input.dataReturnPractices), ipTermsNotes: input.ipTermsNotes?.trim() || null,
      confidentialityReady: input.confidentialityReady ?? false, qualificationStatus: "candidate", qualifiedBy: null, qualifiedAt: null, qualificationReason: null,
      riskFlags: list(input.riskFlags), createdAt: timestamp, updatedAt: timestamp };
    await this.repository.save(entity); await this.event(entity, "laboratory.created", "biomedical-system", entity.name); return entity;
  }
  async qualifyLaboratory(id: string, status: "qualified" | "rejected" | "suspended", qualifiedBy: string, reason: string): Promise<BiomedicalLaboratoryPartner> {
    const entity = await this.require<BiomedicalLaboratoryPartner>("laboratory-partner", id);
    if (status === "qualified" && (entity.capabilities.length === 0 || entity.dataReturnPractices.length === 0)) throw new Error("Laboratory qualification requires capabilities and data-return practices");
    const timestamp = nowIso(); const updated: BiomedicalLaboratoryPartner = { ...entity, qualificationStatus: status, qualifiedBy: text(qualifiedBy, "Qualifier"), qualifiedAt: timestamp,
      qualificationReason: text(reason, "Qualification reason"), updatedAt: timestamp };
    await this.repository.save(updated); await this.event(updated, `laboratory.${status}`, qualifiedBy, reason); return updated;
  }
  async createEngagement(input: CreateBiomedicalEngagementInput): Promise<BiomedicalLaboratoryEngagement> {
    await this.requireProgram(input.programId, input.workspaceId); const laboratory = await this.require<BiomedicalLaboratoryPartner>("laboratory-partner", input.laboratoryId);
    const plan = await this.require<BiomedicalDevelopmentPlan>("development-plan", input.developmentPlanId);
    if (laboratory.workspaceId !== input.workspaceId || plan.programId !== input.programId) throw new Error("Laboratory and development plan must match the engagement workspace and program");
    if (laboratory.qualificationStatus !== "qualified") throw new Error("External engagements require a qualified laboratory");
    if (plan.status !== "approved") throw new Error("External engagements require an approved development plan"); assertGovernedResearchScope(input.scopeSummary); const timestamp = nowIso();
    const entity: BiomedicalLaboratoryEngagement = { id: idOrNew(input.id), entityType: "laboratory-engagement", workspaceId: input.workspaceId, programId: input.programId,
      laboratoryId: input.laboratoryId, developmentPlanId: input.developmentPlanId, stage: "candidate", scopeSummary: text(input.scopeSummary, "Engagement scope"),
      requiredDeliverables: list(input.requiredDeliverables), requiredRawData: list(input.requiredRawData), qualityRequirements: list(input.qualityRequirements),
      chainOfCustodyRequirements: list(input.chainOfCustodyRequirements), budgetCeiling: input.budgetCeiling ?? null, currency: input.currency?.trim().toUpperCase() || null,
      timeline: input.timeline?.trim() || null, ndaReference: null, rfiReference: null, rfqReference: null, sowReference: null, contractReference: null,
      authorizedBy: null, authorizedAt: null, authorizationScope: null, externalResultReferences: [], verificationEvidence: [], outcomeSummary: null,
      transitionHistory: [{ from: null, to: "candidate", actor: "biomedical-system", reason: "Engagement created", occurredAt: timestamp }], createdAt: timestamp, updatedAt: timestamp };
    await this.repository.save(entity); await this.event(entity, "laboratory-engagement.created", "biomedical-system", entity.scopeSummary); return entity;
  }
  async transitionEngagement(id: string, input: EngagementTransitionInput): Promise<BiomedicalLaboratoryEngagement> {
    const entity = await this.require<BiomedicalLaboratoryEngagement>("laboratory-engagement", id);
    if (!engagementTransitions[entity.stage].includes(input.to)) throw new Error(`Invalid laboratory engagement transition from ${entity.stage} to ${input.to}`);
    if (input.to === "authorized" && (!input.authorizationScope?.trim() || !["owner", "principal investigator", "authorized executive"].some((term) => input.reason.toLowerCase().includes(term)))) {
      throw new Error("Laboratory authorization requires a bounded authorization scope and explicit owner, principal-investigator, or authorized-executive reasoning");
    }
    if (input.to === "results-received" && list(input.evidenceRefs).length === 0) throw new Error("Received laboratory results require external result references");
    if (input.to === "verified" && list(input.evidenceRefs).length === 0) throw new Error("Result verification requires evidence references");
    const timestamp = nowIso(); const reference = input.reference?.trim() || null; const evidenceRefs = list(input.evidenceRefs);
    const updated: BiomedicalLaboratoryEngagement = { ...entity, stage: input.to,
      ndaReference: input.to === "nda-review" && reference ? reference : entity.ndaReference,
      rfiReference: input.to === "rfi" && reference ? reference : entity.rfiReference,
      rfqReference: input.to === "rfq" && reference ? reference : entity.rfqReference,
      sowReference: input.to === "sow-review" && reference ? reference : entity.sowReference,
      contractReference: input.to === "contracted" && reference ? reference : entity.contractReference,
      authorizedBy: input.to === "authorized" ? text(input.actor, "Authorizer") : entity.authorizedBy,
      authorizedAt: input.to === "authorized" ? timestamp : entity.authorizedAt,
      authorizationScope: input.to === "authorized" ? text(input.authorizationScope ?? "", "Authorization scope") : entity.authorizationScope,
      externalResultReferences: input.to === "results-received" ? list([...entity.externalResultReferences, ...evidenceRefs]) : entity.externalResultReferences,
      verificationEvidence: input.to === "verified" ? list([...entity.verificationEvidence, ...evidenceRefs]) : entity.verificationEvidence,
      outcomeSummary: input.outcomeSummary?.trim() || entity.outcomeSummary,
      transitionHistory: [...entity.transitionHistory, { from: entity.stage, to: input.to, actor: text(input.actor, "Actor"), reason: text(input.reason, "Transition reason"), occurredAt: timestamp }], updatedAt: timestamp };
    await this.repository.save(updated); await this.event(updated, `laboratory-engagement.${input.to}`, input.actor, input.reason, { reference, evidenceRefs }); return updated;
  }
  async createRegulatoryPathway(input: CreateBiomedicalRegulatoryInput): Promise<BiomedicalRegulatoryPathway> {
    await this.requireProgram(input.programId, input.workspaceId); const timestamp = nowIso();
    const entity: BiomedicalRegulatoryPathway = { id: idOrNew(input.id), entityType: "regulatory-pathway", workspaceId: input.workspaceId, programId: input.programId,
      jurisdiction: text(input.jurisdiction, "Jurisdiction"), productClassification: text(input.productClassification, "Product classification"), intendedUse: text(input.intendedUse, "Intended use"),
      pathway: text(input.pathway, "Pathway"), agencies: list(input.agencies), requiredEvidence: list(input.requiredEvidence), requiredQualitySystems: list(input.requiredQualitySystems),
      ethicsOrOversight: list(input.ethicsOrOversight), majorRisks: list(input.majorRisks), milestones: list(input.milestones), status: "candidate",
      reviewedBy: null, reviewedAt: null, createdAt: timestamp, updatedAt: timestamp };
    await this.repository.save(entity); await this.event(entity, "regulatory-pathway.created", "biomedical-system", `${entity.jurisdiction}: ${entity.pathway}`); return entity;
  }
  async reviewRegulatoryPathway(id: string, status: "approved" | "rejected", reviewer: string): Promise<BiomedicalRegulatoryPathway> {
    const entity = await this.require<BiomedicalRegulatoryPathway>("regulatory-pathway", id); const timestamp = nowIso();
    const updated: BiomedicalRegulatoryPathway = { ...entity, status, reviewedBy: text(reviewer, "Reviewer"), reviewedAt: timestamp, updatedAt: timestamp };
    await this.repository.save(updated); await this.event(updated, `regulatory-pathway.${status}`, reviewer, entity.pathway); return updated;
  }
  async createIpAsset(input: CreateBiomedicalIpInput): Promise<BiomedicalIpAsset> {
    await this.requireProgram(input.programId, input.workspaceId); const timestamp = nowIso();
    const entity: BiomedicalIpAsset = { id: idOrNew(input.id), entityType: "ip-asset", workspaceId: input.workspaceId, programId: input.programId,
      title: text(input.title, "IP asset title"), assetType: input.assetType, inventors: list(input.inventors), description: text(input.description, "IP description"),
      differentiators: list(input.differentiators), evidenceSourceIds: list(input.evidenceSourceIds), priorArtReferences: list(input.priorArtReferences),
      enablementGaps: list(input.enablementGaps), ownershipNotes: text(input.ownershipNotes, "Ownership notes"), status: "candidate", reviewedBy: null, reviewedAt: null,
      createdAt: timestamp, updatedAt: timestamp };
    await this.repository.save(entity); await this.event(entity, "ip-asset.created", "biomedical-system", entity.title); return entity;
  }
  async advanceIpAsset(id: string, status: BiomedicalIpAsset["status"], reviewer: string): Promise<BiomedicalIpAsset> {
    const entity = await this.require<BiomedicalIpAsset>("ip-asset", id);
    if (status === "disclosure-ready" && (entity.inventors.length === 0 || entity.differentiators.length === 0)) throw new Error("Disclosure-ready IP requires inventors and differentiators");
    const updated: BiomedicalIpAsset = { ...entity, status, reviewedBy: text(reviewer, "Reviewer"), reviewedAt: nowIso(), updatedAt: nowIso() };
    await this.repository.save(updated); await this.event(updated, `ip-asset.${status}`, reviewer, entity.title); return updated;
  }
  async createFundingOpportunity(input: CreateBiomedicalFundingInput): Promise<BiomedicalFundingOpportunity> {
    await this.requireProgram(input.programId, input.workspaceId); const timestamp = nowIso();
    const entity: BiomedicalFundingOpportunity = { id: idOrNew(input.id), entityType: "funding-opportunity", workspaceId: input.workspaceId, programId: input.programId,
      sponsor: text(input.sponsor, "Sponsor"), title: text(input.title, "Funding title"), mechanism: text(input.mechanism, "Funding mechanism"), locator: text(input.locator, "Funding locator"),
      eligibility: list(input.eligibility), strategicFit: list(input.strategicFit), requiredPartners: list(input.requiredPartners), estimatedAward: input.estimatedAward?.trim() || null,
      deadline: input.deadline?.trim() || null, status: "identified", owner: text(input.owner, "Funding owner"), nextActions: list(input.nextActions), createdAt: timestamp, updatedAt: timestamp };
    await this.repository.save(entity); await this.event(entity, "funding-opportunity.created", input.owner, entity.title); return entity;
  }
  async createManufacturingPlan(input: CreateBiomedicalManufacturingInput): Promise<BiomedicalManufacturingPlan> {
    await this.requireProgram(input.programId, input.workspaceId); const readinessLevel = input.readinessLevel ?? 1;
    if (!Number.isInteger(readinessLevel) || readinessLevel < 1 || readinessLevel > 9) throw new Error("Manufacturing readiness level must be an integer from 1 to 9");
    const timestamp = nowIso(); const entity: BiomedicalManufacturingPlan = { id: idOrNew(input.id), entityType: "manufacturing-plan", workspaceId: input.workspaceId, programId: input.programId,
      title: text(input.title, "Manufacturing plan title"), modality: text(input.modality, "Modality"), criticalQualityAttributes: list(input.criticalQualityAttributes),
      rawMaterialRequirements: list(input.rawMaterialRequirements), analyticalRequirements: list(input.analyticalRequirements), processDevelopmentNeeds: list(input.processDevelopmentNeeds),
      stabilityRequirements: list(input.stabilityRequirements), packagingAndStorage: list(input.packagingAndStorage), technologyTransferNeeds: list(input.technologyTransferNeeds),
      costOfGoodsAssumptions: list(input.costOfGoodsAssumptions), scaleUpRisks: list(input.scaleUpRisks), externalPartnerRequirements: list(input.externalPartnerRequirements),
      readinessLevel, status: "candidate", createdAt: timestamp, updatedAt: timestamp };
    await this.repository.save(entity); await this.event(entity, "manufacturing-plan.created", "biomedical-system", entity.title); return entity;
  }
  async createCommercializationPlan(input: CreateBiomedicalCommercializationInput): Promise<BiomedicalCommercializationPlan> {
    await this.requireProgram(input.programId, input.workspaceId); if (input.revenueModels.length === 0) throw new Error("Commercialization plans require at least one revenue model");
    const timestamp = nowIso(); const entity: BiomedicalCommercializationPlan = { id: idOrNew(input.id), entityType: "commercialization-plan", workspaceId: input.workspaceId, programId: input.programId,
      title: text(input.title, "Commercialization plan title"), targetCustomers: list(input.targetCustomers), valueProposition: text(input.valueProposition, "Value proposition"),
      revenueModels: [...new Set(input.revenueModels)], earlyRevenueOptions: list(input.earlyRevenueOptions), marketEvidenceSourceIds: list(input.marketEvidenceSourceIds),
      competitors: list(input.competitors), pricingAssumptions: list(input.pricingAssumptions), reimbursementOrProcurement: list(input.reimbursementOrProcurement),
      partnershipTargets: list(input.partnershipTargets), commercialRisks: list(input.commercialRisks), milestones: list(input.milestones), status: "candidate",
      createdAt: timestamp, updatedAt: timestamp };
    await this.repository.save(entity); await this.event(entity, "commercialization-plan.created", "biomedical-system", entity.title); return entity;
  }
  async createDecisionGate(input: CreateBiomedicalDecisionGateInput): Promise<BiomedicalDecisionGate> {
    await this.requireProgram(input.programId, input.workspaceId);
    for (const sourceId of input.evidenceSourceIds) { const source = await this.require<BiomedicalEvidenceSource>("evidence-source", sourceId); if (source.status !== "approved") throw new Error("Decision gates may cite only approved evidence"); }
    const timestamp = nowIso(); const entity: BiomedicalDecisionGate = { id: idOrNew(input.id), entityType: "decision-gate", workspaceId: input.workspaceId, programId: input.programId,
      name: text(input.name, "Decision gate name"), gateType: input.gateType, recommendation: text(input.recommendation, "Recommendation"), evidenceSourceIds: list(input.evidenceSourceIds),
      unresolvedContradictionIds: list(input.unresolvedContradictionIds), requiredConditions: list(input.requiredConditions), decision: null, decidedBy: null, decidedAt: null,
      verificationEvidence: [], status: "recommendation", createdAt: timestamp, updatedAt: timestamp };
    await this.repository.save(entity); await this.event(entity, "decision-gate.recommended", "biomedical-system", entity.recommendation); return entity;
  }
  async decideGate(id: string, decidedBy: string, decision: string): Promise<BiomedicalDecisionGate> {
    const entity = await this.require<BiomedicalDecisionGate>("decision-gate", id); if (entity.status !== "recommendation") throw new Error("Only recommendation-stage gates can be decided");
    const timestamp = nowIso(); const updated: BiomedicalDecisionGate = { ...entity, decision: text(decision, "Decision"), decidedBy: text(decidedBy, "Decision maker"), decidedAt: timestamp, status: "decided", updatedAt: timestamp };
    await this.repository.save(updated); await this.event(updated, "decision-gate.decided", decidedBy, decision); return updated;
  }
  async verifyGate(id: string, actor: string, evidenceRefs: string[]): Promise<BiomedicalDecisionGate> {
    const entity = await this.require<BiomedicalDecisionGate>("decision-gate", id); if (entity.status !== "decided") throw new Error("Only decided gates can be verified");
    const evidence = list(evidenceRefs); if (evidence.length === 0) throw new Error("Decision verification requires evidence");
    const updated: BiomedicalDecisionGate = { ...entity, verificationEvidence: evidence, status: "verified", updatedAt: nowIso() };
    await this.repository.save(updated); await this.event(updated, "decision-gate.verified", actor, entity.decision ?? entity.recommendation, { evidenceRefs: evidence }); return updated;
  }
  async listEntities(type: BiomedicalEntityType, workspaceId?: string, limit = 500): Promise<BiomedicalEntity[]> { return this.repository.list(type, { workspaceId, limit }); }
  async listEvents(workspaceId?: string, entityId?: string, limit = 500) { return this.repository.listEvents({ workspaceId, entityId, limit }); }
  async buildMissionContext(workspaceId?: string, programId?: string): Promise<BiomedicalMissionContext> {
    const generatedAt = nowIso(); if (!workspaceId) return { summary: "Biomedical workspace: not specified", evidence: [], uncertainties: ["No biomedical workspace was supplied"] };
    await this.requireWorkspace(workspaceId);
    const programs = (await this.repository.list("research-program", { workspaceId, limit: 200 })).filter((item): item is BiomedicalResearchProgram => item.entityType === "research-program");
    const selected = programId ? await this.requireProgram(programId, workspaceId) : null;
    const sources = (await this.repository.list("evidence-source", { workspaceId, limit: 1000 })).filter((item): item is BiomedicalEvidenceSource => item.entityType === "evidence-source" && item.status === "approved" && (!programId || item.programId === programId));
    const claims = (await this.repository.list("claim", { workspaceId, limit: 1000 })).filter((item): item is BiomedicalClaim => item.entityType === "claim" && item.status === "approved" && (!programId || item.programId === programId));
    const contradictions = (await this.repository.list("contradiction", { workspaceId, limit: 500 })).filter((item): item is BiomedicalContradiction => item.entityType === "contradiction" && item.status === "open" && (!programId || item.programId === programId));
    const hypotheses = (await this.repository.list("hypothesis", { workspaceId, limit: 500 })).filter((item): item is BiomedicalHypothesis => item.entityType === "hypothesis" && item.status === "approved" && (!programId || item.programId === programId));
    const labs = (await this.repository.list("laboratory-partner", { workspaceId, limit: 500 })).filter((item): item is BiomedicalLaboratoryPartner => item.entityType === "laboratory-partner" && item.qualificationStatus === "qualified");
    const engagements = (await this.repository.list("laboratory-engagement", { workspaceId, limit: 500 })).filter((item): item is BiomedicalLaboratoryEngagement => item.entityType === "laboratory-engagement" && !["closed", "rejected", "cancelled"].includes(item.stage) && (!programId || item.programId === programId));
    const funding = (await this.repository.list("funding-opportunity", { workspaceId, limit: 500 })).filter((item): item is BiomedicalFundingOpportunity => item.entityType === "funding-opportunity" && !["declined", "expired"].includes(item.status) && (!programId || item.programId === programId));
    const ip = (await this.repository.list("ip-asset", { workspaceId, limit: 500 })).filter((item): item is BiomedicalIpAsset => item.entityType === "ip-asset" && item.status !== "abandoned" && (!programId || item.programId === programId));
    const commercial = (await this.repository.list("commercialization-plan", { workspaceId, limit: 200 })).filter((item): item is BiomedicalCommercializationPlan => item.entityType === "commercialization-plan" && (!programId || item.programId === programId));
    const sections = [`Biomedical workspace: ${workspaceId}`, `Research programs: ${programs.length}; selected: ${selected?.name ?? "none"}`,
      `Approved evidence sources: ${sources.length}; approved claims: ${claims.length}; open contradictions: ${contradictions.length}`,
      `Approved hypotheses: ${hypotheses.length}; qualified laboratories: ${labs.length}; active external engagements: ${engagements.length}`,
      `Active funding opportunities: ${funding.length}; IP assets: ${ip.length}; commercialization plans: ${commercial.length}`,
      selected ? `Selected program ${selected.id}: ${selected.problemStatement}\nCommercial thesis: ${selected.commercialThesis}\nNext actions: ${selected.nextActions.join("; ") || "none"}` : "",
      claims.slice(0, 12).map((claim) => `Claim ${claim.id}: ${claim.statement} [${claim.confidence}]`).join("\n"),
      contradictions.slice(0, 8).map((item) => `Open contradiction ${item.id}: ${item.description}`).join("\n"),
      hypotheses.slice(0, 8).map((item) => `Hypothesis ${item.id}: ${item.statement}`).join("\n"),
      engagements.slice(0, 8).map((item) => `Lab engagement ${item.id}: ${item.stage}; ${item.scopeSummary}`).join("\n"),
      funding.slice(0, 8).map((item) => `Funding ${item.id}: ${item.sponsor} — ${item.title} [${item.status}]`).join("\n"),
      ip.slice(0, 8).map((item) => `IP ${item.id}: ${item.title} [${item.status}]`).join("\n")].filter(Boolean);
    const evidence = sources.map((source) => ({ id: source.id, source: `biomedical-evidence:${source.programId}`, locator: `${source.locator}#${source.provenanceHash}`, retrievedAt: generatedAt }));
    const uncertainties: string[] = []; if (sources.length === 0) uncertainties.push("No approved evidence sources were found for this scope");
    if (contradictions.length > 0) uncertainties.push(`${contradictions.length} unresolved evidence contradictions remain`);
    if (selected && selected.uncertainties.length > 0) uncertainties.push(...selected.uncertainties);
    if (selected && hypotheses.length === 0) uncertainties.push("The selected program has no approved hypothesis");
    return { summary: sections.join("\n\n").slice(0, 24000), evidence, uncertainties };
  }
}
