import assert from "node:assert/strict";
import test from "node:test";
import { PostgresBusinessRepository } from "../../src/business/postgres-repository.js";
import { BusinessService } from "../../src/business/service.js";
import { PostgresContentRepository } from "../../src/content/postgres-repository.js";
import { ContentService } from "../../src/content/service.js";
import { createPostgresPool, runMigrations } from "../../src/storage/postgres.js";

const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  test("PostgreSQL business and content persistence requires TEST_DATABASE_URL", { skip: true }, () => undefined);
} else {
  test("business and content governed state survives PostgreSQL repository restart", async () => {
    const firstPool = createPostgresPool(connectionString);
    await runMigrations(firstPool);
    await firstPool.query(`TRUNCATE
      business_events,
      business_entities,
      content_events,
      content_entities
      RESTART IDENTITY CASCADE`);

    const business = new BusinessService(new PostgresBusinessRepository(firstPool));
    await business.createOrganization({
      id: "persistent-company",
      name: "Persistent Company",
      owner: "Charles Castillo",
      currency: "USD",
    });
    await business.createProject({
      id: "persistent-project",
      organizationId: "persistent-company",
      name: "Persistent Project",
      objective: "Prove durable business state",
      owner: "Charles Castillo",
      milestones: [{ id: "persistent-milestone", title: "Persist records", owner: "Charles Castillo" }],
    });
    const decision = await business.createDecision({
      id: "persistent-decision",
      organizationId: "persistent-company",
      title: "Preserve authority",
      context: "The operating system must retain decisions",
      recommendation: "Store decision transitions durably",
      rationale: "Restart recovery is required",
      proposedBy: "J.A.R.V.I.S",
      affectedProjectIds: ["persistent-project"],
    });
    await business.transitionDecision(decision.id, "decision", "Charles Castillo", "Owner made the decision");
    await business.transitionDecision(decision.id, "authorized", "Charles Castillo", "Owner authorized execution");
    await business.createFinancialScenario({
      id: "persistent-scenario",
      organizationId: "persistent-company",
      name: "Persistent scenario",
      createdBy: "Charles Castillo",
      periodLabel: "Monthly",
      revenue: 50000,
      variableCostRate: 0.1,
      fixedCosts: 30000,
      cashOnHand: 90000,
    });

    const content = new ContentService(new PostgresContentRepository(firstPool));
    await content.createBrand({
      id: "persistent-brand",
      name: "Persistent Brand",
      owner: "Charles Castillo",
      requiredDisclosures: ["Research discussion"],
      approvedPlatforms: ["LinkedIn"],
    });
    const source = await content.registerSource({
      id: "persistent-source",
      brandId: "persistent-brand",
      title: "Persistent Source",
      locator: "source:1",
      summary: "Persistent evidence",
      credibility: "high",
      rights: "owned",
      supportedClaims: ["durable content state"],
      registeredBy: "Charles Castillo",
    });
    await content.reviewSource(source.id, true, "Charles Castillo", "Reviewed owned evidence");
    const brief = await content.createBrief({
      id: "persistent-brief",
      brandId: "persistent-brand",
      title: "Persistent brief",
      purpose: "Prove durable content state",
      audience: "Builders",
      platform: "LinkedIn",
      format: "post",
      owner: "Charles Castillo",
      requiredSourceIds: ["persistent-source"],
      requiredMessages: ["durable content state"],
    });
    await content.reviewBrief(brief.id, true, "Charles Castillo");
    const draft = await content.createDraft({
      id: "persistent-draft",
      brandId: "persistent-brand",
      briefId: "persistent-brief",
      title: "Persistent content",
      body: "Research discussion: durable content state survives service restarts.",
      createdBy: "J.A.R.V.I.S",
      sourceIds: ["persistent-source"],
      claims: [{ claim: "durable content state", sourceId: "persistent-source" }],
    });
    await content.reviewDraft(draft.id, "approved", "Charles Castillo", "Evidence and brand rules verified");
    await firstPool.end();

    const secondPool = createPostgresPool(connectionString);
    const recoveredBusiness = new BusinessService(new PostgresBusinessRepository(secondPool));
    const recoveredContent = new ContentService(new PostgresContentRepository(secondPool));

    const recoveredProject = await recoveredBusiness.getEntity("project", "persistent-project");
    assert.equal(recoveredProject.objective, "Prove durable business state");
    const recoveredDecision = await recoveredBusiness.getEntity("decision", "persistent-decision");
    assert.equal(recoveredDecision.stage, "authorized");
    assert.equal(recoveredDecision.authorizedBy, "Charles Castillo");
    const businessEvents = await recoveredBusiness.listEvents("persistent-company");
    assert.ok(businessEvents.length >= 6);

    const recoveredSource = await recoveredContent.getEntity("source", "persistent-source");
    assert.equal(recoveredSource.status, "approved");
    const recoveredDraft = await recoveredContent.getEntity("draft", "persistent-draft");
    assert.equal(recoveredDraft.status, "approved");
    assert.equal(recoveredDraft.claimChecks[0]?.status, "supported");
    const contentEvents = await recoveredContent.listEvents("persistent-brand");
    assert.ok(contentEvents.length >= 6);

    const businessContext = await recoveredBusiness.buildMissionContext("persistent-company");
    assert.match(businessContext.summary, /Persistent Company/u);
    const contentContext = await recoveredContent.buildMissionContext("persistent-brand", "persistent-draft");
    assert.match(contentContext.summary, /Persistent Brand/u);
    await secondPool.end();
  });
}
