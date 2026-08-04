import assert from "node:assert/strict";
import test from "node:test";
import { PostgresBiomedicalRepository } from "../../src/biomedical/postgres-repository.js";
import { BiomedicalService } from "../../src/biomedical/service.js";
import { createPostgresPool, runMigrations } from "../../src/storage/postgres.js";

const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  test("PostgreSQL biomedical persistence requires TEST_DATABASE_URL", { skip: true }, () => undefined);
} else {
  test("governed biomedical state survives PostgreSQL repository restart", async () => {
    const firstPool = createPostgresPool(connectionString);
    await runMigrations(firstPool);
    await firstPool.query(`TRUNCATE biomedical_events, biomedical_entities RESTART IDENTITY CASCADE`);

    const firstRepository = new PostgresBiomedicalRepository(firstPool);
    const biomedical = new BiomedicalService(firstRepository);
    await biomedical.createWorkspace({
      id: "persistent-biomedical",
      name: "Persistent Biomedical Workforce",
      owner: "Charles Castillo",
      researchAreas: ["oncology", "nanotechnology"],
      objectives: ["Create validated and commercializable biomedical assets"],
      revenueTargets: ["Licensing", "Government contracts"],
    });
    await biomedical.createProgram({
      id: "persistent-program",
      workspaceId: "persistent-biomedical",
      name: "Persistent research program",
      researchArea: "oncology",
      diseaseOrPlatform: "Subtype-specific research platform",
      problemStatement: "Build an evidence-linked and externally validated research asset.",
      intendedImpact: "Advance a translational and licensable program.",
      commercialThesis: "Protect and license validated assets while creating earlier research-tool revenue.",
      owner: "Charles Castillo",
      eightNodeMap: {
        input: ["literature"], process: ["evidence review"], output: ["validated asset"], feedback: ["laboratory results"],
        incentives: ["patient need"], bottlenecks: ["translation"], dependencies: ["qualified laboratory"], failurePoints: ["invalid mechanism"],
      },
      successCriteria: ["Approved evidence"],
      terminationCriteria: ["Mechanism falsified"],
      nextActions: ["Review source"],
      uncertainties: ["Translation remains uncertain"],
    });
    const source = await biomedical.createEvidence({
      id: "persistent-evidence",
      workspaceId: "persistent-biomedical",
      programId: "persistent-program",
      kind: "systematic-review",
      title: "Persistent evidence source",
      publicationOrOwner: "Scientific publisher",
      locator: "doi:persistent-evidence",
      abstractOrSummary: "Evidence relevant to the governed research program.",
      limitations: ["Heterogeneity"],
      retractionStatus: "clear",
    });
    await biomedical.reviewEvidence(source.id, {
      status: "approved",
      reviewedBy: "Scientific Review Lead",
      reason: "Provenance, study quality, and limitations were reviewed.",
      preregistered: true,
      adequateControls: true,
      independentlyReplicated: true,
      riskOfBias: "low",
    });
    const claim = await biomedical.createClaim({
      id: "persistent-claim",
      workspaceId: "persistent-biomedical",
      programId: "persistent-program",
      statement: "The approved source supports continued mechanism investigation.",
      claimType: "mechanism",
      direction: "supports",
      sourceIds: [source.id],
      confidence: "high",
    });
    await biomedical.reviewClaim(claim.id, "approved", "Scientific Review Lead", "Claim is bounded to approved evidence.");
    const hypothesis = await biomedical.createHypothesis({
      id: "persistent-hypothesis",
      workspaceId: "persistent-biomedical",
      programId: "persistent-program",
      title: "Persistent hypothesis",
      statement: "The mechanism may support a subtype-specific intervention strategy.",
      rationale: "The approved evidence and claim justify further professional validation.",
      supportingClaimIds: [claim.id],
      uncertainties: ["Human translation"],
      falsificationCriteria: ["No reproducible target engagement"],
      translationalPotential: "External validation may support translation.",
      commercialPotential: "Potential licensing and research-tool assets.",
    });
    await biomedical.reviewHypothesis(hypothesis.id, "approved", "Charles Castillo", "Falsifiable and evidence-linked.");
    await biomedical.createFundingOpportunity({
      id: "persistent-funding",
      workspaceId: "persistent-biomedical",
      programId: "persistent-program",
      sponsor: "Government funder",
      title: "Persistent funding opportunity",
      mechanism: "grant",
      locator: "funding:persistent",
      strategicFit: ["translation"],
      owner: "Charles Castillo",
      nextActions: ["Build proposal"],
    });
    await firstPool.end();

    const secondPool = createPostgresPool(connectionString);
    const secondRepository = new PostgresBiomedicalRepository(secondPool);
    const recoveredProgram = await secondRepository.get("research-program", "persistent-program");
    assert.equal(recoveredProgram?.entityType, "research-program");
    if (!recoveredProgram || recoveredProgram.entityType !== "research-program") throw new Error("Program was not recovered");
    assert.deepEqual(recoveredProgram.evidenceSourceIds, ["persistent-evidence"]);
    assert.deepEqual(recoveredProgram.hypothesisIds, ["persistent-hypothesis"]);

    const recoveredEvidence = await secondRepository.get("evidence-source", "persistent-evidence");
    assert.equal(recoveredEvidence?.entityType, "evidence-source");
    if (!recoveredEvidence || recoveredEvidence.entityType !== "evidence-source") throw new Error("Evidence was not recovered");
    assert.equal(recoveredEvidence.status, "approved");
    assert.ok((recoveredEvidence.qualityScore ?? 0) >= 80);

    const recoveredService = new BiomedicalService(secondRepository);
    const context = await recoveredService.buildMissionContext("persistent-biomedical", "persistent-program");
    assert.match(context.summary, /Persistent research program/u);
    assert.match(context.summary, /Active funding opportunities: 1/u);
    assert.equal(context.evidence.length, 1);

    const events = await secondRepository.listEvents({ workspaceId: "persistent-biomedical" });
    assert.ok(events.length >= 8);
    await secondPool.end();
  });
}
