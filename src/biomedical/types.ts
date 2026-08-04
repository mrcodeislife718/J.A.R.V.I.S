export type BiomedicalResearchArea =
  | "oncology"
  | "hiv-infectious-disease"
  | "regenerative-medicine"
  | "neuroscience"
  | "rare-disease"
  | "immunology"
  | "aging"
  | "diagnostics"
  | "drug-delivery"
  | "nanotechnology"
  | "synthetic-biology"
  | "platform-technology"
  | "other";

export type BiomedicalReviewStatus = "candidate" | "approved" | "rejected" | "retired";
export type BiomedicalEvidenceStatus = BiomedicalReviewStatus | "retracted" | "superseded";
export type BiomedicalConfidence = "very-low" | "low" | "moderate" | "high" | "very-high";
export type BiomedicalEvidenceKind =
  | "systematic-review"
  | "meta-analysis"
  | "randomized-trial"
  | "controlled-clinical-study"
  | "cohort-study"
  | "case-control-study"
  | "case-series"
  | "preclinical-in-vivo"
  | "preclinical-in-vitro"
  | "computational"
  | "patent"
  | "clinical-trial-registry"
  | "regulatory-record"
  | "external-lab-report"
  | "dataset"
  | "expert-opinion"
  | "market-intelligence"
  | "other";

export type BiomedicalEntityType =
  | "workspace"
  | "research-program"
  | "evidence-source"
  | "claim"
  | "contradiction"
  | "knowledge-node"
  | "knowledge-edge"
  | "hypothesis"
  | "development-plan"
  | "laboratory-partner"
  | "laboratory-engagement"
  | "regulatory-pathway"
  | "ip-asset"
  | "funding-opportunity"
  | "manufacturing-plan"
  | "commercialization-plan"
  | "decision-gate";

export interface BiomedicalBaseEntity {
  id: string;
  entityType: BiomedicalEntityType;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BiomedicalWorkspace extends BiomedicalBaseEntity {
  entityType: "workspace";
  workspaceId: string;
  name: string;
  owner: string;
  description: string | null;
  researchAreas: BiomedicalResearchArea[];
  objectives: string[];
  operatingRules: string[];
  revenueTargets: string[];
  status: "active" | "archived";
  metadata: Record<string, unknown>;
}

export interface BiomedicalResearchProgram extends BiomedicalBaseEntity {
  entityType: "research-program";
  name: string;
  researchArea: BiomedicalResearchArea;
  diseaseOrPlatform: string;
  subtype: string | null;
  problemStatement: string;
  intendedImpact: string;
  commercialThesis: string;
  stage:
    | "discovery"
    | "validation"
    | "translation"
    | "external-development"
    | "manufacturing-readiness"
    | "commercialization"
    | "paused"
    | "terminated";
  owner: string;
  eightNodeMap: {
    input: string[];
    process: string[];
    output: string[];
    feedback: string[];
    incentives: string[];
    bottlenecks: string[];
    dependencies: string[];
    failurePoints: string[];
  };
  successCriteria: string[];
  terminationCriteria: string[];
  evidenceSourceIds: string[];
  hypothesisIds: string[];
  nextActions: string[];
  uncertainties: string[];
}

export interface BiomedicalEvidenceSource extends BiomedicalBaseEntity {
  entityType: "evidence-source";
  programId: string;
  kind: BiomedicalEvidenceKind;
  title: string;
  authors: string[];
  publicationOrOwner: string;
  publishedAt: string | null;
  locator: string;
  persistentIdentifier: string | null;
  abstractOrSummary: string;
  methodsSummary: string | null;
  populationOrModel: string | null;
  sampleSize: number | null;
  endpoints: string[];
  keyFindings: string[];
  limitations: string[];
  conflictOfInterest: string | null;
  retractionStatus: "not-checked" | "clear" | "expression-of-concern" | "retracted";
  status: BiomedicalEvidenceStatus;
  qualityScore: number | null;
  confidence: BiomedicalConfidence | null;
  qualityReasons: string[];
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
  provenanceHash: string;
  metadata: Record<string, unknown>;
}

export interface BiomedicalClaim extends BiomedicalBaseEntity {
  entityType: "claim";
  programId: string;
  statement: string;
  claimType: "mechanism" | "association" | "causal" | "safety" | "efficacy" | "manufacturing" | "commercial" | "regulatory" | "other";
  direction: "supports" | "refutes" | "mixed" | "uncertain";
  sourceIds: string[];
  targetIds: string[];
  confidence: BiomedicalConfidence;
  status: BiomedicalReviewStatus;
  assumptions: string[];
  limitations: string[];
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
}

export interface BiomedicalContradiction extends BiomedicalBaseEntity {
  entityType: "contradiction";
  programId: string;
  claimIds: string[];
  description: string;
  possibleExplanations: string[];
  resolutionRequirements: string[];
  status: "open" | "partially-resolved" | "resolved" | "accepted-uncertainty";
  resolutionSummary: string | null;
  reviewedBy: string | null;
}

export interface BiomedicalKnowledgeNode extends BiomedicalBaseEntity {
  entityType: "knowledge-node";
  programId: string;
  nodeType:
    | "disease"
    | "subtype"
    | "gene"
    | "protein"
    | "cell"
    | "tissue"
    | "pathway"
    | "mechanism"
    | "biomarker"
    | "target"
    | "intervention"
    | "delivery-system"
    | "manufacturing-process"
    | "regulatory-concept"
    | "market"
    | "other";
  name: string;
  description: string;
  aliases: string[];
  evidenceSourceIds: string[];
  status: BiomedicalReviewStatus;
}

export interface BiomedicalKnowledgeEdge extends BiomedicalBaseEntity {
  entityType: "knowledge-edge";
  programId: string;
  fromNodeId: string;
  toNodeId: string;
  relation:
    | "activates"
    | "inhibits"
    | "expressed-in"
    | "associated-with"
    | "causes"
    | "targets"
    | "delivers"
    | "manufactured-by"
    | "measured-by"
    | "competes-with"
    | "depends-on"
    | "contradicts"
    | "other";
  description: string;
  sourceIds: string[];
  confidence: BiomedicalConfidence;
  status: BiomedicalReviewStatus;
}

export interface BiomedicalHypothesis extends BiomedicalBaseEntity {
  entityType: "hypothesis";
  programId: string;
  title: string;
  statement: string;
  rationale: string;
  mechanismNodeIds: string[];
  supportingClaimIds: string[];
  contradictingClaimIds: string[];
  assumptions: string[];
  uncertainties: string[];
  falsificationCriteria: string[];
  translationalPotential: string;
  commercialPotential: string;
  status: BiomedicalReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
}

export interface BiomedicalDevelopmentPlan extends BiomedicalBaseEntity {
  entityType: "development-plan";
  programId: string;
  hypothesisId: string;
  title: string;
  objective: string;
  developmentStage: "computational" | "assay-concept" | "preclinical-concept" | "analytical-validation" | "manufacturing-development" | "translational-planning";
  modelClass: string;
  controls: string[];
  endpoints: string[];
  successCriteria: string[];
  failureCriteria: string[];
  requiredCapabilities: string[];
  requiredQualitySystems: string[];
  externalExecutionRequired: boolean;
  estimatedBudgetRange: string | null;
  estimatedTimeline: string | null;
  risks: string[];
  status: BiomedicalReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
}

export interface BiomedicalLaboratoryPartner extends BiomedicalBaseEntity {
  entityType: "laboratory-partner";
  name: string;
  organizationType: "university" | "hbcu" | "cro" | "cdmo" | "core-facility" | "testing-lab" | "biobank" | "consultancy" | "other";
  location: string;
  website: string | null;
  capabilities: string[];
  equipment: string[];
  qualitySystems: string[];
  biosafetyLevels: string[];
  certifications: string[];
  scientificContacts: string[];
  pricingNotes: string | null;
  availabilityNotes: string | null;
  dataReturnPractices: string[];
  ipTermsNotes: string | null;
  confidentialityReady: boolean;
  qualificationStatus: "candidate" | "qualified" | "rejected" | "suspended";
  qualifiedBy: string | null;
  qualifiedAt: string | null;
  qualificationReason: string | null;
  riskFlags: string[];
}

export type BiomedicalEngagementStage =
  | "candidate"
  | "capability-review"
  | "nda-review"
  | "rfi"
  | "rfq"
  | "sow-review"
  | "contracted"
  | "authorized"
  | "in-progress"
  | "results-received"
  | "verified"
  | "closed"
  | "rejected"
  | "cancelled";

export interface BiomedicalLaboratoryEngagement extends BiomedicalBaseEntity {
  entityType: "laboratory-engagement";
  programId: string;
  laboratoryId: string;
  developmentPlanId: string;
  stage: BiomedicalEngagementStage;
  scopeSummary: string;
  requiredDeliverables: string[];
  requiredRawData: string[];
  qualityRequirements: string[];
  chainOfCustodyRequirements: string[];
  budgetCeiling: number | null;
  currency: string | null;
  timeline: string | null;
  ndaReference: string | null;
  rfiReference: string | null;
  rfqReference: string | null;
  sowReference: string | null;
  contractReference: string | null;
  authorizedBy: string | null;
  authorizedAt: string | null;
  authorizationScope: string | null;
  externalResultReferences: string[];
  verificationEvidence: string[];
  outcomeSummary: string | null;
  transitionHistory: Array<{
    from: BiomedicalEngagementStage | null;
    to: BiomedicalEngagementStage;
    actor: string;
    reason: string;
    occurredAt: string;
  }>;
}

export interface BiomedicalRegulatoryPathway extends BiomedicalBaseEntity {
  entityType: "regulatory-pathway";
  programId: string;
  jurisdiction: string;
  productClassification: string;
  intendedUse: string;
  pathway: string;
  agencies: string[];
  requiredEvidence: string[];
  requiredQualitySystems: string[];
  ethicsOrOversight: string[];
  majorRisks: string[];
  milestones: string[];
  status: BiomedicalReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface BiomedicalIpAsset extends BiomedicalBaseEntity {
  entityType: "ip-asset";
  programId: string;
  title: string;
  assetType: "composition" | "method-of-use" | "delivery-system" | "formulation" | "manufacturing-process" | "diagnostic" | "biomarker-panel" | "combination" | "software" | "device" | "data-asset" | "other";
  inventors: string[];
  description: string;
  differentiators: string[];
  evidenceSourceIds: string[];
  priorArtReferences: string[];
  enablementGaps: string[];
  ownershipNotes: string;
  status: "candidate" | "disclosure-ready" | "filed" | "licensed" | "abandoned";
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface BiomedicalFundingOpportunity extends BiomedicalBaseEntity {
  entityType: "funding-opportunity";
  programId: string;
  sponsor: string;
  title: string;
  mechanism: string;
  locator: string;
  eligibility: string[];
  strategicFit: string[];
  requiredPartners: string[];
  estimatedAward: string | null;
  deadline: string | null;
  status: "identified" | "qualified" | "planned" | "submitted" | "awarded" | "declined" | "expired";
  owner: string;
  nextActions: string[];
}

export interface BiomedicalManufacturingPlan extends BiomedicalBaseEntity {
  entityType: "manufacturing-plan";
  programId: string;
  title: string;
  modality: string;
  criticalQualityAttributes: string[];
  rawMaterialRequirements: string[];
  analyticalRequirements: string[];
  processDevelopmentNeeds: string[];
  stabilityRequirements: string[];
  packagingAndStorage: string[];
  technologyTransferNeeds: string[];
  costOfGoodsAssumptions: string[];
  scaleUpRisks: string[];
  externalPartnerRequirements: string[];
  readinessLevel: number;
  status: BiomedicalReviewStatus;
}

export interface BiomedicalCommercializationPlan extends BiomedicalBaseEntity {
  entityType: "commercialization-plan";
  programId: string;
  title: string;
  targetCustomers: string[];
  valueProposition: string;
  revenueModels: Array<
    | "patent-license"
    | "field-of-use-license"
    | "research-tool-license"
    | "white-label"
    | "co-development"
    | "diagnostic-service"
    | "laboratory-service"
    | "data-product"
    | "software-subscription"
    | "government-contract"
    | "product-sales"
    | "strategic-acquisition"
    | "spinout"
  >;
  earlyRevenueOptions: string[];
  marketEvidenceSourceIds: string[];
  competitors: string[];
  pricingAssumptions: string[];
  reimbursementOrProcurement: string[];
  partnershipTargets: string[];
  commercialRisks: string[];
  milestones: string[];
  status: BiomedicalReviewStatus;
}

export interface BiomedicalDecisionGate extends BiomedicalBaseEntity {
  entityType: "decision-gate";
  programId: string;
  name: string;
  gateType: "go" | "pause" | "pivot" | "terminate" | "license" | "partner" | "advance";
  recommendation: string;
  evidenceSourceIds: string[];
  unresolvedContradictionIds: string[];
  requiredConditions: string[];
  decision: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  verificationEvidence: string[];
  status: "recommendation" | "decided" | "verified";
}

export type BiomedicalEntity =
  | BiomedicalWorkspace
  | BiomedicalResearchProgram
  | BiomedicalEvidenceSource
  | BiomedicalClaim
  | BiomedicalContradiction
  | BiomedicalKnowledgeNode
  | BiomedicalKnowledgeEdge
  | BiomedicalHypothesis
  | BiomedicalDevelopmentPlan
  | BiomedicalLaboratoryPartner
  | BiomedicalLaboratoryEngagement
  | BiomedicalRegulatoryPathway
  | BiomedicalIpAsset
  | BiomedicalFundingOpportunity
  | BiomedicalManufacturingPlan
  | BiomedicalCommercializationPlan
  | BiomedicalDecisionGate;

export interface BiomedicalEvent {
  id: string;
  workspaceId: string;
  entityType: BiomedicalEntityType;
  entityId: string;
  type: string;
  actor: string;
  summary: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export interface BiomedicalMissionContext {
  summary: string;
  evidence: Array<{ id: string; source: string; locator: string; retrievedAt: string }>;
  uncertainties: string[];
}
