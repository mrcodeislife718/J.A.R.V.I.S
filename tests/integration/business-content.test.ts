import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../../src/app.js";
import { InMemoryBusinessRepository } from "../../src/business/in-memory-repository.js";
import { InMemoryContentRepository } from "../../src/content/in-memory-repository.js";
import type { ModelClient, ModelRequest, ModelResponse } from "../../src/core/types.js";

class CapturingModelClient implements ModelClient {
  prompts: string[] = [];

  async generate(request: ModelRequest): Promise<ModelResponse> {
    this.prompts.push(request.prompt);
    return {
      text: "Known: governed operating state was supplied. Missing: external execution was not performed.",
      model: request.model,
      inputTokens: 120,
      outputTokens: 24,
      totalDurationMs: 5,
    };
  }
}

const createOrganization = async (app: ReturnType<typeof buildApp>) => {
  const response = await app.inject({
    method: "POST",
    url: "/v1/business/organizations",
    payload: {
      id: "bio-gene",
      name: "Bio-Gene Inc",
      description: "Governed biotechnology company operations",
      owner: "Charles Castillo",
      currency: "USD",
      timezone: "America/New_York",
    },
  });
  assert.equal(response.statusCode, 201);
  return response.json().organization;
};

const createBrand = async (app: ReturnType<typeof buildApp>) => {
  const response = await app.inject({
    method: "POST",
    url: "/v1/content/brands",
    payload: {
      id: "charles-brand",
      name: "Charles Castillo",
      owner: "Charles Castillo",
      voicePrinciples: ["clear", "systems-oriented", "evidence-backed"],
      prohibitedClaims: ["guaranteed cure"],
      requiredDisclosures: ["Research discussion"],
      approvedPlatforms: ["LinkedIn"],
    },
  });
  assert.equal(response.statusCode, 201);
  return response.json().brand;
};

test("business operations preserves authority stages and generates reproducible operating state", async () => {
  const model = new CapturingModelClient();
  const app = buildApp({
    modelClient: model,
    businessRepository: new InMemoryBusinessRepository(),
    contentRepository: new InMemoryContentRepository(),
    logger: false,
  });
  await createOrganization(app);

  const projectResponse = await app.inject({
    method: "POST",
    url: "/v1/business/projects",
    payload: {
      id: "jarvis-project",
      organizationId: "bio-gene",
      name: "J.A.R.V.I.S",
      objective: "Build the governed operating platform",
      owner: "Charles Castillo",
      priority: "critical",
      milestones: [{ id: "v05", title: "Complete v0.5", owner: "Charles Castillo", dueAt: "2026-08-10T00:00:00.000Z" }],
      successCriteria: ["All CI tests pass", "Owner authority is preserved"],
    },
  });
  assert.equal(projectResponse.statusCode, 201);

  const decisionResponse = await app.inject({
    method: "POST",
    url: "/v1/business/decisions",
    payload: {
      id: "decision-v05",
      organizationId: "bio-gene",
      title: "Release J.A.R.V.I.S v0.5",
      context: "Business and content systems have passed review",
      recommendation: "Release after CI passes",
      rationale: "Verified tests are required before release",
      proposedBy: "J.A.R.V.I.S",
      affectedProjectIds: ["jarvis-project"],
      evidenceRefs: ["ci:pending"],
    },
  });
  assert.equal(decisionResponse.statusCode, 201);

  const skipped = await app.inject({
    method: "POST",
    url: "/v1/business/decisions/decision-v05/transitions",
    payload: { to: "authorized", actor: "Charles Castillo", rationale: "Skip directly" },
  });
  assert.equal(skipped.statusCode, 400);

  for (const [to, actor] of [
    ["decision", "Charles Castillo"],
    ["authorized", "Charles Castillo"],
    ["executing", "J.A.R.V.I.S"],
    ["verified", "Charles Castillo"],
  ] as const) {
    const transition = await app.inject({
      method: "POST",
      url: "/v1/business/decisions/decision-v05/transitions",
      payload: { to, actor, rationale: `Move to ${to} after required review` },
    });
    assert.equal(transition.statusCode, 200);
  }

  const scenario = await app.inject({
    method: "POST",
    url: "/v1/business/financial-scenarios",
    payload: {
      organizationId: "bio-gene",
      name: "Base case",
      createdBy: "Charles Castillo",
      periodLabel: "Monthly",
      revenue: 100000,
      variableCostRate: 0.2,
      fixedCosts: 60000,
      cashOnHand: 120000,
    },
  });
  assert.equal(scenario.statusCode, 201);
  assert.equal(scenario.json().scenario.outputs.operatingProfit, 20000);
  assert.equal(scenario.json().scenario.outputs.monthlyBurn, 0);
  assert.equal(scenario.json().scenario.outputs.breakEvenRevenue, 75000);

  const risk = await app.inject({
    method: "POST",
    url: "/v1/business/risks",
    payload: {
      organizationId: "bio-gene",
      title: "Release regression",
      category: "engineering",
      likelihood: 2,
      impact: 5,
      owner: "Charles Castillo",
      trigger: "CI failure",
      mitigation: "Block merge until green",
      contingency: "Rollback the release",
    },
  });
  assert.equal(risk.statusCode, 201);
  assert.equal(risk.json().risk.score, 10);

  const report = await app.inject({
    method: "POST",
    url: "/v1/business/reports/weekly",
    payload: {
      organizationId: "bio-gene",
      weekStart: "2026-08-03T00:00:00.000Z",
      weekEnd: "2026-08-10T00:00:00.000Z",
      generatedBy: "J.A.R.V.I.S",
    },
  });
  assert.equal(report.statusCode, 201);
  assert.equal(report.json().report.projectSummary.total, 1);
  assert.equal(report.json().report.openDecisionIds.length, 0);
  assert.equal(report.json().report.topRiskIds.length, 1);

  const mission = await app.inject({
    method: "POST",
    url: "/v1/missions",
    payload: {
      domain: "business-operations",
      objective: "Prepare the operating summary for Bio-Gene",
      requestedCapabilities: ["business.weekly-report"],
      inputs: { organizationId: "bio-gene" },
    },
  });
  assert.equal(mission.statusCode, 201);
  assert.ok(model.prompts.some((prompt) => prompt.includes("Bio-Gene Inc")));
  assert.ok(model.prompts.some((prompt) => prompt.includes("owner: Charles Castillo")));
  await app.close();
});

test("content production requires approved sources, claims, drafts, and publication plans", async () => {
  const model = new CapturingModelClient();
  const app = buildApp({
    modelClient: model,
    businessRepository: new InMemoryBusinessRepository(),
    contentRepository: new InMemoryContentRepository(),
    logger: false,
  });
  await createBrand(app);

  const source = await app.inject({
    method: "POST",
    url: "/v1/content/sources",
    payload: {
      id: "source-systems",
      brandId: "charles-brand",
      title: "Systems Thinking Notes",
      publisher: "Charles Castillo",
      locator: "notes:systems-thinking",
      summary: "A governed explanation of systems thinking",
      credibility: "high",
      rights: "owned",
      supportedClaims: ["systems thinking improves architecture decisions"],
      registeredBy: "Charles Castillo",
    },
  });
  assert.equal(source.statusCode, 201);

  const sourceReview = await app.inject({
    method: "POST",
    url: "/v1/content/sources/source-systems/review",
    payload: { approved: true, reviewer: "Charles Castillo", reason: "Owned source reviewed for accuracy" },
  });
  assert.equal(sourceReview.statusCode, 200);

  const brief = await app.inject({
    method: "POST",
    url: "/v1/content/briefs",
    payload: {
      id: "brief-linkedin",
      brandId: "charles-brand",
      title: "Systems thinking post",
      purpose: "Explain the value of systems thinking",
      audience: "Engineers and founders",
      platform: "LinkedIn",
      format: "post",
      owner: "Charles Castillo",
      requiredSourceIds: ["source-systems"],
      requiredMessages: ["systems thinking"],
      maximumCharacters: 1200,
    },
  });
  assert.equal(brief.statusCode, 201);
  const briefReview = await app.inject({
    method: "POST",
    url: "/v1/content/briefs/brief-linkedin/review",
    payload: { approved: true, reviewer: "Charles Castillo" },
  });
  assert.equal(briefReview.statusCode, 200);

  const unsupportedDraft = await app.inject({
    method: "POST",
    url: "/v1/content/drafts",
    payload: {
      id: "draft-unsupported",
      brandId: "charles-brand",
      briefId: "brief-linkedin",
      title: "Unsupported draft",
      body: "Research discussion: systems thinking creates guaranteed outcomes.",
      createdBy: "J.A.R.V.I.S",
      sourceIds: ["source-systems"],
      claims: [{ claim: "guaranteed outcomes" }],
    },
  });
  assert.equal(unsupportedDraft.statusCode, 201);
  const unsupportedApproval = await app.inject({
    method: "POST",
    url: "/v1/content/drafts/draft-unsupported/review",
    payload: { status: "approved", reviewer: "Charles Castillo", note: "Try to approve" },
  });
  assert.equal(unsupportedApproval.statusCode, 400);

  const draft = await app.inject({
    method: "POST",
    url: "/v1/content/drafts",
    payload: {
      id: "draft-approved",
      brandId: "charles-brand",
      briefId: "brief-linkedin",
      title: "Systems thinking",
      body: "Research discussion: systems thinking improves architecture decisions by exposing dependencies, bottlenecks, feedback, and failure points.",
      createdBy: "J.A.R.V.I.S",
      sourceIds: ["source-systems"],
      claims: [{
        claim: "systems thinking improves architecture decisions",
        sourceId: "source-systems",
        locator: "notes:systems-thinking",
      }],
    },
  });
  assert.equal(draft.statusCode, 201);
  const draftReview = await app.inject({
    method: "POST",
    url: "/v1/content/drafts/draft-approved/review",
    payload: { status: "approved", reviewer: "Charles Castillo", note: "Claims and brand rules verified" },
  });
  assert.equal(draftReview.statusCode, 200);

  const plan = await app.inject({
    method: "POST",
    url: "/v1/content/publication-plans",
    payload: {
      id: "plan-linkedin",
      brandId: "charles-brand",
      draftId: "draft-approved",
      platform: "LinkedIn",
      requestedBy: "Charles Castillo",
    },
  });
  assert.equal(plan.statusCode, 201);

  const premature = await app.inject({
    method: "POST",
    url: "/v1/content/publication-plans/plan-linkedin/record-publication",
    payload: { actor: "Charles Castillo", externalReference: "linkedin:post:1", publishedAt: "2026-08-03T20:00:00.000Z" },
  });
  assert.equal(premature.statusCode, 400);

  const approval = await app.inject({
    method: "POST",
    url: "/v1/content/publication-plans/plan-linkedin/approve",
    payload: { approvedBy: "Charles Castillo" },
  });
  assert.equal(approval.statusCode, 200);

  const publication = await app.inject({
    method: "POST",
    url: "/v1/content/publication-plans/plan-linkedin/record-publication",
    payload: { actor: "Charles Castillo", externalReference: "linkedin:post:1", publishedAt: "2026-08-03T20:00:00.000Z" },
  });
  assert.equal(publication.statusCode, 200);

  const performance = await app.inject({
    method: "POST",
    url: "/v1/content/performance",
    payload: {
      brandId: "charles-brand",
      publicationPlanId: "plan-linkedin",
      observedAt: "2026-08-04T20:00:00.000Z",
      recordedBy: "Charles Castillo",
      metrics: {
        impressions: 1000,
        clicks: 100,
        reactions: 80,
        comments: 10,
        shares: 10,
        conversions: 5,
        spend: 50,
      },
    },
  });
  assert.equal(performance.statusCode, 201);
  assert.equal(performance.json().performance.derived.clickThroughRate, 0.1);
  assert.equal(performance.json().performance.derived.engagementRate, 0.1);
  assert.equal(performance.json().performance.derived.conversionRate, 0.05);
  assert.equal(performance.json().performance.derived.costPerConversion, 10);

  const mission = await app.inject({
    method: "POST",
    url: "/v1/missions",
    payload: {
      domain: "content-production",
      objective: "Review the approved LinkedIn content and performance",
      requestedCapabilities: ["content.performance-analyze"],
      inputs: { brandId: "charles-brand", draftId: "draft-approved" },
    },
  });
  assert.equal(mission.statusCode, 201);
  assert.ok(model.prompts.some((prompt) => prompt.includes("Charles Castillo (charles-brand)")));
  assert.ok(model.prompts.some((prompt) => prompt.includes("Publication is never automatic")));
  await app.close();
});
