import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../../src/app.js";
import { InMemoryBiomedicalRepository } from "../../src/biomedical/in-memory-repository.js";
import type { ModelClient, ModelRequest, ModelResponse } from "../../src/core/types.js";

class CapturingModelClient implements ModelClient {
  prompts: string[] = [];

  async generate(request: ModelRequest): Promise<ModelResponse> {
    this.prompts.push(request.prompt);
    return {
      text: "Known: approved biomedical evidence, program state, and governed external-laboratory records were supplied. Missing: no new experimental results were asserted.",
      model: request.model,
      inputTokens: 180,
      outputTokens: 28,
      totalDurationMs: 5,
    };
  }
}

const createWorkspaceAndProgram = async (app: ReturnType<typeof buildApp>) => {
  const workspace = await app.inject({
    method: "POST",
    url: "/v1/biomedical/workspaces",
    payload: {
      id: "bio-gene-rd",
      name: "BIO-GENE Research and Development",
      owner: "Charles Castillo",
      researchAreas: ["oncology", "hiv-infectious-disease", "regenerative-medicine", "nanotechnology"],
      objectives: ["Create defensible biomedical assets", "Coordinate qualified external laboratories"],
      operatingRules: ["Owner final authority", "Evidence before advancement", "Raw data required"],
      revenueTargets: ["Licensing", "Research tools", "Co-development", "Government contracts"],
    },
  });
  assert.equal(workspace.statusCode, 201);

  const program = await app.inject({
    method: "POST",
    url: "/v1/biomedical/programs",
    payload: {
      id: "program-oncology-1",
      workspaceId: "bio-gene-rd",
      name: "Subtype-specific oncology platform",
      researchArea: "oncology",
      diseaseOrPlatform: "Subtype-specific tumor pathway intervention",
      subtype: "defined molecular subtype",
      problemStatement: "Identify a selective intervention strategy that preserves useful signaling while blocking a validated disease mechanism.",
      intendedImpact: "Create a translational and licensable oncology asset.",
      commercialThesis: "Develop a protected platform for licensing, co-development, and companion research tools.",
      owner: "Charles Castillo",
      eightNodeMap: {
        input: ["literature", "patents", "assay data"],
        process: ["evidence review", "mechanism mapping", "external validation"],
        output: ["validated claims", "candidate asset", "IP package"],
        feedback: ["laboratory results", "expert review", "partner feedback"],
        incentives: ["patient need", "licensing value"],
        bottlenecks: ["delivery", "selectivity", "manufacturing"],
        dependencies: ["qualified laboratories", "funding", "data rights"],
        failurePoints: ["invalid mechanism", "poor reproducibility", "blocked IP"],
      },
      successCriteria: ["Reproducible mechanism evidence", "Qualified external validation", "Defensible IP position"],
      terminationCriteria: ["Mechanism falsified", "Unacceptable translation risk"],
      nextActions: ["Review source evidence", "Build target graph"],
      uncertainties: ["Human translation remains unverified"],
    },
  });
  assert.equal(program.statusCode, 201);
};

test("biomedical workforce governs evidence, hypotheses, external laboratories, IP, funding, manufacturing, and commercialization", async () => {
  const model = new CapturingModelClient();
  const app = buildApp({ modelClient: model, biomedicalRepository: new InMemoryBiomedicalRepository(), logger: false });
  await createWorkspaceAndProgram(app);

  const evidence = await app.inject({
    method: "POST",
    url: "/v1/biomedical/evidence",
    payload: {
      id: "evidence-1",
      workspaceId: "bio-gene-rd",
      programId: "program-oncology-1",
      kind: "preclinical-in-vivo",
      title: "Selective pathway interruption study",
      authors: ["Research Team"],
      publicationOrOwner: "Peer-reviewed journal",
      publishedAt: "2026-01-10T00:00:00.000Z",
      locator: "doi:10.example/selective-pathway",
      persistentIdentifier: "doi:10.example/selective-pathway",
      abstractOrSummary: "The study reports selective pathway interruption with preserved canonical signaling in preclinical models.",
      methodsSummary: "Controlled preclinical comparison with blinded outcome review.",
      populationOrModel: "Validated disease model",
      sampleSize: 48,
      endpoints: ["primary tumor burden", "metastatic burden"],
      keyFindings: ["Dose-dependent target engagement", "Reduced disease progression"],
      limitations: ["Preclinical model", "Independent replication required"],
      retractionStatus: "clear",
    },
  });
  assert.equal(evidence.statusCode, 201);

  const prematureClaim = await app.inject({
    method: "POST",
    url: "/v1/biomedical/claims",
    payload: {
      workspaceId: "bio-gene-rd",
      programId: "program-oncology-1",
      statement: "The intervention selectively blocks the disease mechanism.",
      claimType: "mechanism",
      direction: "supports",
      sourceIds: ["evidence-1"],
      confidence: "moderate",
    },
  });
  assert.equal(prematureClaim.statusCode, 400);

  const evidenceReview = await app.inject({
    method: "POST",
    url: "/v1/biomedical/evidence/evidence-1/review",
    payload: {
      status: "approved",
      reviewedBy: "Scientific Review Lead",
      reason: "Methods, controls, provenance, and limitations were reviewed.",
      preregistered: true,
      blinded: true,
      adequateControls: true,
      independentlyReplicated: false,
      riskOfBias: "low",
    },
  });
  assert.equal(evidenceReview.statusCode, 200);
  assert.ok(evidenceReview.json().evidence.qualityScore >= 60);
  assert.equal(evidenceReview.json().evidence.status, "approved");

  for (const claim of [
    {
      id: "claim-support",
      statement: "The evidence supports selective interruption of the disease mechanism in the tested preclinical model.",
      direction: "supports",
    },
    {
      id: "claim-limit",
      statement: "The evidence does not establish clinical efficacy in humans.",
      direction: "refutes",
    },
  ]) {
    const created = await app.inject({
      method: "POST",
      url: "/v1/biomedical/claims",
      payload: {
        id: claim.id,
        workspaceId: "bio-gene-rd",
        programId: "program-oncology-1",
        statement: claim.statement,
        claimType: claim.id === "claim-support" ? "mechanism" : "efficacy",
        direction: claim.direction,
        sourceIds: ["evidence-1"],
        confidence: "moderate",
        limitations: ["Preclinical evidence only"],
      },
    });
    assert.equal(created.statusCode, 201);
    const reviewed = await app.inject({
      method: "POST",
      url: `/v1/biomedical/claims/${claim.id}/review`,
      payload: { status: "approved", reviewedBy: "Scientific Review Lead", reason: "Claim is bounded to the evidence." },
    });
    assert.equal(reviewed.statusCode, 200);
  }

  const contradiction = await app.inject({
    method: "POST",
    url: "/v1/biomedical/contradictions",
    payload: {
      id: "contradiction-1",
      workspaceId: "bio-gene-rd",
      programId: "program-oncology-1",
      claimIds: ["claim-support", "claim-limit"],
      description: "Strong preclinical mechanism evidence coexists with unresolved human translation.",
      possibleExplanations: ["Species and model differences", "Delivery limitations"],
      resolutionRequirements: ["Independent replication", "Translational validation"],
    },
  });
  assert.equal(contradiction.statusCode, 201);

  for (const node of [
    { id: "node-target", nodeType: "target", name: "Selective disease target" },
    { id: "node-intervention", nodeType: "intervention", name: "Targeted intervention concept" },
  ]) {
    const created = await app.inject({
      method: "POST",
      url: "/v1/biomedical/graph/nodes",
      payload: {
        ...node,
        workspaceId: "bio-gene-rd",
        programId: "program-oncology-1",
        description: `${node.name} in the governed mechanism graph.`,
        evidenceSourceIds: ["evidence-1"],
      },
    });
    assert.equal(created.statusCode, 201);
    const reviewed = await app.inject({
      method: "POST",
      url: `/v1/biomedical/graph/nodes/${node.id}/review`,
      payload: { status: "approved", reviewedBy: "Scientific Review Lead", reason: "Node is evidence-linked." },
    });
    assert.equal(reviewed.statusCode, 200);
  }

  const edge = await app.inject({
    method: "POST",
    url: "/v1/biomedical/graph/edges",
    payload: {
      id: "edge-targeting",
      workspaceId: "bio-gene-rd",
      programId: "program-oncology-1",
      fromNodeId: "node-intervention",
      toNodeId: "node-target",
      relation: "targets",
      description: "The intervention concept is designed to target the selective disease mechanism.",
      sourceIds: ["evidence-1"],
      confidence: "moderate",
    },
  });
  assert.equal(edge.statusCode, 201);

  const hypothesis = await app.inject({
    method: "POST",
    url: "/v1/biomedical/hypotheses",
    payload: {
      id: "hypothesis-1",
      workspaceId: "bio-gene-rd",
      programId: "program-oncology-1",
      title: "Selective pathway hypothesis",
      statement: "A selective intervention may reduce disease progression while preserving useful canonical signaling.",
      rationale: "Approved preclinical evidence supports the mechanism while translation remains explicitly uncertain.",
      mechanismNodeIds: ["node-target", "node-intervention"],
      supportingClaimIds: ["claim-support"],
      contradictingClaimIds: ["claim-limit"],
      assumptions: ["Target biology remains relevant in the intended subtype"],
      uncertainties: ["Human translation", "Delivery", "Long-term safety"],
      falsificationCriteria: ["No target engagement", "No improvement against control", "Loss of useful signaling"],
      translationalPotential: "Potential subtype-specific development program after external validation.",
      commercialPotential: "Potential composition, method, delivery, diagnostic, and licensing assets.",
    },
  });
  assert.equal(hypothesis.statusCode, 201);
  const hypothesisReview = await app.inject({
    method: "POST",
    url: "/v1/biomedical/hypotheses/hypothesis-1/review",
    payload: { status: "approved", reviewedBy: "Charles Castillo", reason: "Hypothesis is falsifiable, evidence-linked, and commercially relevant." },
  });
  assert.equal(hypothesisReview.statusCode, 200);

  const plan = await app.inject({
    method: "POST",
    url: "/v1/biomedical/development-plans",
    payload: {
      id: "development-plan-1",
      workspaceId: "bio-gene-rd",
      programId: "program-oncology-1",
      hypothesisId: "hypothesis-1",
      title: "External validation package",
      objective: "Evaluate target engagement, selectivity, and reproducibility through a qualified professional laboratory.",
      developmentStage: "preclinical-concept",
      modelClass: "Qualified disease-relevant preclinical model selected by the external laboratory and principal investigator.",
      controls: ["negative control", "positive control", "vehicle or matched control"],
      endpoints: ["target engagement", "selectivity", "disease-relevant outcome", "safety signals"],
      successCriteria: ["Predefined target engagement", "Improvement against matched control", "Reproducible raw data"],
      failureCriteria: ["No target engagement", "Unacceptable selectivity loss", "Non-reproducible result"],
      requiredCapabilities: ["assay development", "disease-model execution", "raw-data delivery"],
      requiredQualitySystems: ["documented quality system", "chain of custody", "deviation reporting"],
      externalExecutionRequired: true,
      estimatedBudgetRange: "$50,000-$150,000",
      estimatedTimeline: "12-24 weeks",
      risks: ["Model relevance", "Assay transfer", "Schedule and funding"],
    },
  });
  assert.equal(plan.statusCode, 201);
  const planReview = await app.inject({
    method: "POST",
    url: "/v1/biomedical/development-plans/development-plan-1/review",
    payload: { status: "approved", reviewedBy: "Charles Castillo", reason: "The plan defines controls, endpoints, decision criteria, and professional external execution." },
  });
  assert.equal(planReview.statusCode, 200);

  const laboratory = await app.inject({
    method: "POST",
    url: "/v1/biomedical/laboratories",
    payload: {
      id: "qualified-lab-1",
      workspaceId: "bio-gene-rd",
      name: "Qualified Translational Laboratory",
      organizationType: "cro",
      location: "United States",
      capabilities: ["assay development", "preclinical validation", "analytical characterization"],
      equipment: ["validated analytical platforms"],
      qualitySystems: ["documented quality management system"],
      biosafetyLevels: ["appropriate facility controls"],
      certifications: ["credential records on file"],
      scientificContacts: ["Scientific Director"],
      dataReturnPractices: ["raw data", "analysis files", "deviation records", "final report"],
      ipTermsNotes: "Background and foreground IP terms require contract review.",
      confidentialityReady: true,
    },
  });
  assert.equal(laboratory.statusCode, 201);
  const qualification = await app.inject({
    method: "POST",
    url: "/v1/biomedical/laboratories/qualified-lab-1/qualify",
    payload: { status: "qualified", qualifiedBy: "Charles Castillo", reason: "Capabilities, quality systems, data return, confidentiality, and IP review requirements were verified." },
  });
  assert.equal(qualification.statusCode, 200);

  const engagement = await app.inject({
    method: "POST",
    url: "/v1/biomedical/laboratory-engagements",
    payload: {
      id: "engagement-1",
      workspaceId: "bio-gene-rd",
      programId: "program-oncology-1",
      laboratoryId: "qualified-lab-1",
      developmentPlanId: "development-plan-1",
      scopeSummary: "Professional external validation of the approved development plan with predefined controls, endpoints, raw-data return, and deviation reporting.",
      requiredDeliverables: ["approved study plan", "raw data", "analysis files", "deviation log", "final report"],
      requiredRawData: ["instrument exports", "sample-level results", "quality-control results"],
      qualityRequirements: ["document control", "chain of custody", "deviation reporting"],
      chainOfCustodyRequirements: ["sample receipt", "sample disposition", "material transfer records"],
      budgetCeiling: 150000,
      currency: "USD",
      timeline: "24 weeks",
    },
  });
  assert.equal(engagement.statusCode, 201);

  const transitions = [
    { to: "capability-review", actor: "Alliance", reason: "Laboratory capabilities are under documented review." },
    { to: "nda-review", actor: "Alliance", reason: "Confidentiality terms are under review.", reference: "nda:draft-1" },
    { to: "rfi", actor: "Alliance", reason: "Capability questions were issued.", reference: "rfi:1" },
    { to: "rfq", actor: "Alliance", reason: "A bounded request for quotation was issued.", reference: "rfq:1" },
    { to: "sow-review", actor: "Alliance", reason: "Technical scope and deliverables are under review.", reference: "sow:draft-1" },
    { to: "contracted", actor: "Business Operations", reason: "Contract terms were executed by authorized parties.", reference: "contract:1" },
    { to: "authorized", actor: "Charles Castillo", reason: "Owner and principal investigator authorizes the bounded external laboratory scope.", authorizationScope: "Execute only development-plan-1 under contract:1 and return all required raw data." },
    { to: "in-progress", actor: "Qualified Translational Laboratory", reason: "The authorized external work began under the approved scope." },
    { to: "results-received", actor: "Veritas", reason: "External results and raw data were received.", evidenceRefs: ["lab-report:1", "raw-data:1"] },
    { to: "verified", actor: "Veritas", reason: "Deliverables, raw data, and decision criteria were independently checked.", evidenceRefs: ["verification:1"], outcomeSummary: "Results were received and verified against the approved scope." },
    { to: "closed", actor: "Charles Castillo", reason: "The engagement is complete and the verified result package is preserved." },
  ];
  for (const transition of transitions) {
    const response = await app.inject({ method: "POST", url: "/v1/biomedical/laboratory-engagements/engagement-1/transitions", payload: transition });
    assert.equal(response.statusCode, 200, JSON.stringify(response.json()));
  }

  const regulatory = await app.inject({
    method: "POST",
    url: "/v1/biomedical/regulatory-pathways",
    payload: {
      id: "regulatory-1", workspaceId: "bio-gene-rd", programId: "program-oncology-1", jurisdiction: "United States",
      productClassification: "To be determined through formal regulatory review", intendedUse: "Subtype-specific therapeutic development concept",
      pathway: "Pre-submission regulatory strategy", agencies: ["FDA"], requiredEvidence: ["quality", "nonclinical", "clinical strategy"],
      requiredQualitySystems: ["GxP planning"], ethicsOrOversight: ["institutional and regulatory review as applicable"],
      majorRisks: ["classification uncertainty", "evidence gaps"], milestones: ["classification review", "pre-submission meeting"],
    },
  });
  assert.equal(regulatory.statusCode, 201);

  const ip = await app.inject({
    method: "POST",
    url: "/v1/biomedical/ip-assets",
    payload: {
      id: "ip-1", workspaceId: "bio-gene-rd", programId: "program-oncology-1", title: "Selective intervention platform",
      assetType: "method-of-use", inventors: ["Charles Castillo"], description: "A candidate invention record for selective disease-mechanism intervention.",
      differentiators: ["subtype specificity", "preservation of useful signaling"], evidenceSourceIds: ["evidence-1"],
      priorArtReferences: ["prior-art-search:pending"], enablementGaps: ["additional validation"], ownershipNotes: "BIO-GENE ownership and external contributor terms require documented review.",
    },
  });
  assert.equal(ip.statusCode, 201);
  const ipStatus = await app.inject({ method: "POST", url: "/v1/biomedical/ip-assets/ip-1/status", payload: { status: "disclosure-ready", reviewer: "Charles Castillo" } });
  assert.equal(ipStatus.statusCode, 200);

  const funding = await app.inject({
    method: "POST",
    url: "/v1/biomedical/funding-opportunities",
    payload: {
      id: "funding-1", workspaceId: "bio-gene-rd", programId: "program-oncology-1", sponsor: "Government biomedical funder",
      title: "Translational oncology opportunity", mechanism: "grant or contract", locator: "funding:opportunity:1",
      eligibility: ["small business", "research partnership"], strategicFit: ["oncology", "translation"], requiredPartners: ["qualified laboratory"],
      estimatedAward: "$500,000-$2,000,000", owner: "Charles Castillo", nextActions: ["Confirm eligibility", "Build budget", "Request laboratory quotation"],
    },
  });
  assert.equal(funding.statusCode, 201);

  const manufacturing = await app.inject({
    method: "POST",
    url: "/v1/biomedical/manufacturing-plans",
    payload: {
      id: "manufacturing-1", workspaceId: "bio-gene-rd", programId: "program-oncology-1", title: "Manufacturing readiness map", modality: "Biological or molecular intervention candidate",
      criticalQualityAttributes: ["identity", "purity", "potency", "stability"], rawMaterialRequirements: ["qualified materials"],
      analyticalRequirements: ["identity method", "purity method", "potency method"], processDevelopmentNeeds: ["scalable process definition"],
      stabilityRequirements: ["real-time and accelerated strategy"], packagingAndStorage: ["container and storage requirements"],
      technologyTransferNeeds: ["controlled transfer package"], costOfGoodsAssumptions: ["partner quotations required"],
      scaleUpRisks: ["yield", "consistency", "analytical transfer"], externalPartnerRequirements: ["qualified CDMO"], readinessLevel: 2,
    },
  });
  assert.equal(manufacturing.statusCode, 201);

  const commercialization = await app.inject({
    method: "POST",
    url: "/v1/biomedical/commercialization-plans",
    payload: {
      id: "commercial-1", workspaceId: "bio-gene-rd", programId: "program-oncology-1", title: "Commercial value architecture",
      targetCustomers: ["biopharma partners", "research laboratories", "government programs"],
      valueProposition: "Evidence-governed subtype-specific platform with external validation, IP, and multiple revenue paths.",
      revenueModels: ["patent-license", "co-development", "research-tool-license", "government-contract", "spinout"],
      earlyRevenueOptions: ["research tools", "data products", "analysis services"], marketEvidenceSourceIds: ["evidence-1"],
      competitors: ["existing broad pathway approaches"], pricingAssumptions: ["Partner and customer discovery required"],
      reimbursementOrProcurement: ["future reimbursement and government procurement analysis"], partnershipTargets: ["biopharma", "HBCU and university laboratories"],
      commercialRisks: ["validation timing", "IP scope", "capital requirements"], milestones: ["invention disclosure", "external validation", "partner outreach"],
    },
  });
  assert.equal(commercialization.statusCode, 201);

  const gate = await app.inject({
    method: "POST",
    url: "/v1/biomedical/decision-gates",
    payload: {
      id: "gate-1", workspaceId: "bio-gene-rd", programId: "program-oncology-1", name: "Advance external validation package",
      gateType: "advance", recommendation: "Advance the verified research package into the next evidence-building stage.",
      evidenceSourceIds: ["evidence-1"], unresolvedContradictionIds: ["contradiction-1"], requiredConditions: ["Preserve translation uncertainty", "Secure funding"],
    },
  });
  assert.equal(gate.statusCode, 201);
  const decided = await app.inject({ method: "POST", url: "/v1/biomedical/decision-gates/gate-1/decide", payload: { decidedBy: "Charles Castillo", decision: "Advance only under the approved external-laboratory and funding constraints." } });
  assert.equal(decided.statusCode, 200);
  const verified = await app.inject({ method: "POST", url: "/v1/biomedical/decision-gates/gate-1/verify", payload: { actor: "Veritas", evidenceRefs: ["decision-record:1", "verification:1"] } });
  assert.equal(verified.statusCode, 200);

  const mission = await app.inject({
    method: "POST",
    url: "/v1/missions",
    payload: {
      domain: "biomedical-research",
      objective: "Review the governed program, evidence, laboratory result package, IP, funding, manufacturing, and commercialization state.",
      requestedCapabilities: ["biomedical.program-manage"],
      inputs: { workspaceId: "bio-gene-rd", programId: "program-oncology-1" },
    },
  });
  assert.equal(mission.statusCode, 201);
  assert.ok(model.prompts.some((prompt) => prompt.includes("Governed biomedical research")));
  assert.ok(model.prompts.some((prompt) => prompt.includes("program-oncology-1")));
  assert.ok(model.prompts.some((prompt) => prompt.includes("evidence-1")));
  assert.ok(model.prompts.some((prompt) => prompt.includes("IP assets: 1")));

  const context = await app.inject({ method: "GET", url: "/v1/biomedical/context?workspaceId=bio-gene-rd&programId=program-oncology-1" });
  assert.equal(context.statusCode, 200);
  assert.match(context.json().context.summary, /qualified laboratories: 1/u);
  assert.match(context.json().context.summary, /Commercial thesis/u);
  await app.close();
});

test("biomedical boundaries are narrow and do not block legitimate external-laboratory planning", async () => {
  const app = buildApp({ modelClient: new CapturingModelClient(), biomedicalRepository: new InMemoryBiomedicalRepository(), logger: false });
  await createWorkspaceAndProgram(app);

  const normalProgram = await app.inject({
    method: "POST",
    url: "/v1/biomedical/programs",
    payload: {
      id: "program-delivery-1", workspaceId: "bio-gene-rd", name: "Delivery and formulation platform", researchArea: "drug-delivery",
      diseaseOrPlatform: "Nanoparticle formulation and delivery platform", problemStatement: "Compare formulation, targeting, manufacturing, and external synthesis options through qualified professional partners.",
      intendedImpact: "Create a licensable delivery platform and research-tool assets.", commercialThesis: "Generate early research-tool revenue while validating the longer-term platform.",
      owner: "Charles Castillo",
      eightNodeMap: { input: ["evidence"], process: ["design comparison"], output: ["candidate specifications"], feedback: ["professional laboratory results"], incentives: ["delivery need"], bottlenecks: ["manufacturing"], dependencies: ["qualified CDMO"], failurePoints: ["poor reproducibility"] },
      successCriteria: ["qualified external validation"], terminationCriteria: ["unacceptable performance"],
    },
  });
  assert.equal(normalProgram.statusCode, 201);

  const prohibited = await app.inject({
    method: "POST",
    url: "/v1/biomedical/programs",
    payload: {
      id: "program-prohibited", workspaceId: "bio-gene-rd", name: "Invalid program", researchArea: "other",
      diseaseOrPlatform: "Invalid", problemStatement: "Build a human dosing schedule to self-administer an untested intervention.",
      intendedImpact: "Self experimentation", commercialThesis: "None", owner: "Charles Castillo",
      eightNodeMap: { input: [], process: [], output: [], feedback: [], incentives: [], bottlenecks: [], dependencies: [], failurePoints: [] },
      successCriteria: ["none"], terminationCriteria: ["none"],
    },
  });
  assert.equal(prohibited.statusCode, 400);
  await app.close();
});
