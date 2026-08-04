import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../../src/app.js";
import type { ModelClient, ModelRequest, ModelResponse } from "../../src/core/types.js";
import { InMemorySupportRepository } from "../../src/support/in-memory-repository.js";

class CapturingModelClient implements ModelClient {
  prompts: string[] = [];

  async generate(request: ModelRequest): Promise<ModelResponse> {
    this.prompts.push(request.prompt);
    return {
      text: "Known: governed support policies and ticket state were supplied. Missing: no external customer mutation was performed.",
      model: request.model,
      inputTokens: 140,
      outputTokens: 26,
      totalDurationMs: 5,
    };
  }
}

const setup = async (app: ReturnType<typeof buildApp>) => {
  const workspace = await app.inject({
    method: "POST",
    url: "/v1/support/workspaces",
    payload: {
      id: "jarvis-support",
      name: "J.A.R.V.I.S Support",
      owner: "Charles Castillo",
      defaultSlaMinutes: 60,
      escalationTeams: ["senior-support", "security-escalation", "legal-privacy-escalation"],
    },
  });
  assert.equal(workspace.statusCode, 201);

  const customer = await app.inject({
    method: "POST",
    url: "/v1/support/customers",
    payload: {
      id: "customer-1",
      workspaceId: "jarvis-support",
      externalRef: "crm:customer-1",
      displayName: "Customer One",
      consentState: "granted",
    },
  });
  assert.equal(customer.statusCode, 201);

  const product = await app.inject({
    method: "POST",
    url: "/v1/support/products",
    payload: {
      id: "jarvis-app",
      workspaceId: "jarvis-support",
      name: "J.A.R.V.I.S",
      version: "0.6.0",
      ownerTeam: "platform",
      supportChannels: ["email", "chat"],
    },
  });
  assert.equal(product.statusCode, 201);
};

const createAndApprovePolicy = async (
  app: ReturnType<typeof buildApp>,
  id: string,
  category: "technical" | "refund",
  approvedActionKinds: string[],
) => {
  const policy = await app.inject({
    method: "POST",
    url: "/v1/support/policies",
    payload: {
      id,
      workspaceId: "jarvis-support",
      name: `${category} policy`,
      category,
      version: 1,
      body: `Verified ${category} handling policy`,
      sourceRef: `policy-manual:${id}`,
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      requiresHumanApproval: category === "refund",
      approvedActionKinds,
    },
  });
  assert.equal(policy.statusCode, 201);

  const beforeReview = await app.inject({
    method: "GET",
    url: "/v1/support/policies?workspaceId=jarvis-support&approvedOnly=true",
  });
  assert.equal(beforeReview.statusCode, 200);
  assert.equal(beforeReview.json().policies.some((item: { id: string }) => item.id === id), false);

  const review = await app.inject({
    method: "POST",
    url: `/v1/support/policies/${id}/review`,
    payload: {
      status: "approved",
      reviewedBy: "Charles Castillo",
      reason: "Policy source and authority were verified",
    },
  });
  assert.equal(review.statusCode, 200);
};

test("customer support uses reviewed policies, approved playbooks, triage, and human handoffs", async () => {
  const model = new CapturingModelClient();
  const app = buildApp({
    modelClient: model,
    supportRepository: new InMemorySupportRepository(),
    logger: false,
  });
  await setup(app);
  await createAndApprovePolicy(app, "technical-policy-v1", "technical", ["troubleshooting-step", "standard-response"]);

  const playbook = await app.inject({
    method: "POST",
    url: "/v1/support/playbooks",
    payload: {
      id: "restart-playbook-v1",
      workspaceId: "jarvis-support",
      name: "Application restart diagnostics",
      productId: "jarvis-app",
      category: "technical",
      version: 1,
      steps: [
        {
          order: 1,
          instruction: "Capture the exact error and application version",
          expectedSignal: "A reproducible error signature is recorded",
        },
        {
          order: 2,
          instruction: "Restart the application without changing customer data",
          expectedSignal: "The application starts successfully",
          failureEscalation: "Escalate to platform support",
        },
      ],
    },
  });
  assert.equal(playbook.statusCode, 201);

  const playbookReview = await app.inject({
    method: "POST",
    url: "/v1/support/playbooks/restart-playbook-v1/review",
    payload: {
      status: "approved",
      reviewedBy: "Platform Lead",
      reason: "Steps are reversible and verified",
    },
  });
  assert.equal(playbookReview.statusCode, 200);

  const ticket = await app.inject({
    method: "POST",
    url: "/v1/support/tickets",
    payload: {
      id: "ticket-tech-1",
      workspaceId: "jarvis-support",
      customerId: "customer-1",
      productId: "jarvis-app",
      subject: "Application is not working",
      description: "The application shows an error and failed to start.",
      channel: "chat",
      failureSignature: "startup-error-42",
      createdBy: "support-intake",
    },
  });
  assert.equal(ticket.statusCode, 201);
  assert.equal(ticket.json().ticket.category, "technical");
  assert.equal(ticket.json().ticket.assignedQueue, "technical-support");

  const policies = await app.inject({
    method: "POST",
    url: "/v1/support/tickets/ticket-tech-1/attach-policies",
    payload: { actor: "Support Agent" },
  });
  assert.equal(policies.statusCode, 200);
  assert.deepEqual(policies.json().ticket.policyIds, ["technical-policy-v1"]);

  const plan = await app.inject({
    method: "POST",
    url: "/v1/support/tickets/ticket-tech-1/troubleshooting-plan",
    payload: { actor: "Support Agent" },
  });
  assert.equal(plan.statusCode, 200);
  assert.equal(plan.json().ticket.troubleshootingPlan.playbookId, "restart-playbook-v1");

  const frustrated = await app.inject({
    method: "POST",
    url: "/v1/support/tickets/ticket-tech-1/messages",
    payload: {
      authorType: "customer",
      body: "THIS IS UNACCEPTABLE!!! I AM FURIOUS AND IT IS STILL NOT FIXED!!!",
      actor: "customer-1",
    },
  });
  assert.equal(frustrated.statusCode, 200);
  assert.equal(frustrated.json().ticket.status, "waiting-human");
  assert.ok(frustrated.json().ticket.triage.frustrationScore >= 70);

  const handoff = await app.inject({
    method: "POST",
    url: "/v1/support/tickets/ticket-tech-1/handoffs",
    payload: {
      targetTeam: "senior-support",
      reason: "Elevated frustration requires human ownership",
      summary: "Troubleshooting context and approved policy are attached",
      requestedBy: "Support Agent",
    },
  });
  assert.equal(handoff.statusCode, 201);

  const accepted = await app.inject({
    method: "POST",
    url: `/v1/support/handoffs/${handoff.json().handoff.id}/accept`,
    payload: { acceptedBy: "Senior Agent" },
  });
  assert.equal(accepted.statusCode, 200);
  assert.equal(accepted.json().handoff.status, "accepted");

  const mission = await app.inject({
    method: "POST",
    url: "/v1/missions",
    payload: {
      domain: "customer-support",
      objective: "Review the urgent support ticket and approved resolution boundaries",
      requestedCapabilities: ["support.quality-score"],
      inputs: { workspaceId: "jarvis-support", ticketId: "ticket-tech-1" },
    },
  });
  assert.equal(mission.statusCode, 201);
  assert.ok(model.prompts.some((prompt) => prompt.includes("Governed customer support state")));
  assert.ok(model.prompts.some((prompt) => prompt.includes("technical-policy-v1")));
  assert.ok(model.prompts.some((prompt) => prompt.includes("ticket-tech-1")));
  await app.close();
});

test("privileged support actions cannot skip policy and human approval", async () => {
  const app = buildApp({
    modelClient: new CapturingModelClient(),
    supportRepository: new InMemorySupportRepository(),
    logger: false,
  });
  await setup(app);
  await createAndApprovePolicy(app, "refund-policy-v1", "refund", ["refund"]);

  const ticket = await app.inject({
    method: "POST",
    url: "/v1/support/tickets",
    payload: {
      id: "ticket-refund-1",
      workspaceId: "jarvis-support",
      customerId: "customer-1",
      productId: "jarvis-app",
      subject: "I need a refund",
      description: "I was charged and want my money back.",
      channel: "email",
      createdBy: "support-intake",
    },
  });
  assert.equal(ticket.statusCode, 201);
  assert.equal(ticket.json().ticket.category, "refund");

  const noPolicy = await app.inject({
    method: "POST",
    url: "/v1/support/actions",
    payload: {
      workspaceId: "jarvis-support",
      ticketId: "ticket-refund-1",
      kind: "refund",
      summary: "Refund the duplicate charge",
      requestedBy: "Support Agent",
      amount: 40,
      currency: "USD",
      requestedScope: "Refund transaction charge-123 only",
      idempotencyKey: "refund-charge-123",
    },
  });
  assert.equal(noPolicy.statusCode, 400);

  const action = await app.inject({
    method: "POST",
    url: "/v1/support/actions",
    payload: {
      id: "refund-action-1",
      workspaceId: "jarvis-support",
      ticketId: "ticket-refund-1",
      kind: "refund",
      summary: "Refund the duplicate charge",
      requestedBy: "Support Agent",
      policyId: "refund-policy-v1",
      amount: 40,
      currency: "USD",
      requestedScope: "Refund transaction charge-123 only",
      evidenceRefs: ["billing-ledger:charge-123"],
      idempotencyKey: "refund-charge-123",
    },
  });
  assert.equal(action.statusCode, 201);

  const premature = await app.inject({
    method: "POST",
    url: "/v1/support/actions/refund-action-1/record-completion",
    payload: {
      completedBy: "Billing System",
      externalReference: "refund:123",
      outcome: "Refund completed",
      evidenceRefs: ["billing-ledger:refund-123"],
    },
  });
  assert.equal(premature.statusCode, 400);

  const approval = await app.inject({
    method: "POST",
    url: "/v1/support/actions/refund-action-1/approve",
    payload: {
      approvedBy: "Charles Castillo",
      reason: "Duplicate charge verified under approved refund policy",
    },
  });
  assert.equal(approval.statusCode, 200);

  const completed = await app.inject({
    method: "POST",
    url: "/v1/support/actions/refund-action-1/record-completion",
    payload: {
      completedBy: "Billing System",
      externalReference: "refund:123",
      outcome: "Refund completed outside J.A.R.V.I.S",
      evidenceRefs: ["billing-ledger:refund-123"],
    },
  });
  assert.equal(completed.statusCode, 200);
  assert.equal(completed.json().action.status, "recorded-complete");

  const resolved = await app.inject({
    method: "POST",
    url: "/v1/support/tickets/ticket-refund-1/resolve",
    payload: {
      resolvedBy: "Support Agent",
      summary: "Duplicate charge refunded after owner approval",
      evidenceRefs: ["billing-ledger:refund-123"],
    },
  });
  assert.equal(resolved.statusCode, 200);
  assert.equal(resolved.json().ticket.status, "resolved");
  await app.close();
});

test("quality scoring and repeated-failure clustering remain deterministic", async () => {
  const app = buildApp({
    modelClient: new CapturingModelClient(),
    supportRepository: new InMemorySupportRepository(),
    logger: false,
  });
  await setup(app);

  for (const id of ["ticket-failure-1", "ticket-failure-2"]) {
    const response = await app.inject({
      method: "POST",
      url: "/v1/support/tickets",
      payload: {
        id,
        workspaceId: "jarvis-support",
        customerId: "customer-1",
        productId: "jarvis-app",
        subject: "Startup error",
        description: "The application failed with error code 42.",
        channel: "email",
        failureSignature: "startup-error-42",
        createdBy: "support-intake",
      },
    });
    assert.equal(response.statusCode, 201);
  }

  const clusters = await app.inject({
    method: "POST",
    url: "/v1/support/failure-clusters/rebuild",
    payload: { workspaceId: "jarvis-support", actor: "Product Operations" },
  });
  assert.equal(clusters.statusCode, 200);
  assert.equal(clusters.json().clusters.length, 1);
  assert.equal(clusters.json().clusters[0].occurrenceCount, 2);
  assert.deepEqual(clusters.json().clusters[0].ticketIds, ["ticket-failure-1", "ticket-failure-2"]);

  const review = await app.inject({
    method: "POST",
    url: "/v1/support/quality-reviews",
    payload: {
      ticketId: "ticket-failure-1",
      reviewedBy: "Quality Lead",
      scores: {
        policyAccuracy: 100,
        diagnosisQuality: 80,
        communicationQuality: 90,
        escalationQuality: 70,
        evidenceQuality: 60,
      },
      findings: ["Diagnosis was accurate"],
      correctiveActions: ["Attach stronger resolution evidence"],
    },
  });
  assert.equal(review.statusCode, 201);
  assert.equal(review.json().review.overallScore, 81.5);
  await app.close();
});
