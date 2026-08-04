import assert from "node:assert/strict";
import test from "node:test";
import { createPostgresPool, runMigrations } from "../../src/storage/postgres.js";
import { PostgresSupportRepository } from "../../src/support/postgres-repository.js";
import { SupportService } from "../../src/support/service.js";

const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  test("PostgreSQL customer support persistence requires TEST_DATABASE_URL", { skip: true }, () => undefined);
} else {
  test("governed customer support state survives PostgreSQL repository restart", async () => {
    const firstPool = createPostgresPool(connectionString);
    await runMigrations(firstPool);
    await firstPool.query(`TRUNCATE support_events, support_entities RESTART IDENTITY CASCADE`);

    const firstRepository = new PostgresSupportRepository(firstPool);
    const support = new SupportService(firstRepository);
    await support.createWorkspace({
      id: "persistent-support",
      name: "Persistent Support",
      owner: "Charles Castillo",
      escalationTeams: ["senior-support"],
    });
    await support.createCustomer({
      id: "persistent-customer",
      workspaceId: "persistent-support",
      externalRef: "crm:persistent-customer",
      displayName: "Persistent Customer",
      consentState: "granted",
    });
    await support.createProduct({
      id: "persistent-product",
      workspaceId: "persistent-support",
      name: "Persistent Product",
      ownerTeam: "platform",
    });
    const policy = await support.createPolicy({
      id: "persistent-refund-policy",
      workspaceId: "persistent-support",
      name: "Persistent refund policy",
      category: "refund",
      version: 1,
      body: "A verified duplicate charge may be refunded after human approval.",
      sourceRef: "policy:refund:1",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      requiresHumanApproval: true,
      approvedActionKinds: ["refund"],
    });
    await support.reviewPolicy(policy.id, "approved", "Charles Castillo", "Verified policy authority");
    const ticket = await support.createTicket({
      id: "persistent-ticket",
      workspaceId: "persistent-support",
      customerId: "persistent-customer",
      productId: "persistent-product",
      subject: "Duplicate charge refund",
      description: "I was charged twice and need a refund.",
      channel: "email",
      failureSignature: "duplicate-charge",
      createdBy: "support-intake",
    });
    await support.attachCurrentPolicies(ticket.id, "Support Agent");
    const action = await support.createAction({
      id: "persistent-refund-action",
      workspaceId: "persistent-support",
      ticketId: ticket.id,
      kind: "refund",
      summary: "Refund the verified duplicate charge",
      requestedBy: "Support Agent",
      policyId: policy.id,
      amount: 25,
      currency: "USD",
      requestedScope: "Refund charge duplicate-25 only",
      evidenceRefs: ["billing:duplicate-25"],
      idempotencyKey: "persistent-refund-25",
    });
    await support.approveAction(action.id, "Charles Castillo", "Duplicate charge verified");
    await support.recordActionCompletion(
      action.id,
      "Billing System",
      "refund:persistent-25",
      "Refund completed outside J.A.R.V.I.S",
      ["billing:refund-persistent-25"],
    );
    await support.resolveTicket(ticket.id, "Support Agent", "Refund verified and completed", ["billing:refund-persistent-25"]);
    await firstPool.end();

    const secondPool = createPostgresPool(connectionString);
    const secondRepository = new PostgresSupportRepository(secondPool);
    const recoveredTicket = await secondRepository.get("ticket", "persistent-ticket");
    assert.equal(recoveredTicket?.entityType, "ticket");
    if (!recoveredTicket || recoveredTicket.entityType !== "ticket") throw new Error("Ticket was not recovered");
    assert.equal(recoveredTicket.status, "resolved");
    assert.deepEqual(recoveredTicket.policyIds, ["persistent-refund-policy"]);

    const recoveredPolicy = await secondRepository.get("policy", "persistent-refund-policy");
    assert.equal(recoveredPolicy?.entityType, "policy");
    if (!recoveredPolicy || recoveredPolicy.entityType !== "policy") throw new Error("Policy was not recovered");
    assert.equal(recoveredPolicy.status, "approved");

    const recoveredAction = await secondRepository.get("support-action", "persistent-refund-action");
    assert.equal(recoveredAction?.entityType, "support-action");
    if (!recoveredAction || recoveredAction.entityType !== "support-action") throw new Error("Action was not recovered");
    assert.equal(recoveredAction.status, "recorded-complete");
    assert.equal(recoveredAction.approvedBy, "Charles Castillo");

    const events = await secondRepository.listEvents({ workspaceId: "persistent-support" });
    assert.ok(events.length >= 10);
    const recoveredService = new SupportService(secondRepository);
    const context = await recoveredService.buildMissionContext("persistent-support", "persistent-ticket");
    assert.match(context.summary, /Persistent refund policy/u);
    assert.match(context.summary, /persistent-ticket/u);
    await secondPool.end();
  });
}
