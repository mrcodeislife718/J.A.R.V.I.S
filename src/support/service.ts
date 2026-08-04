import { createHash, randomUUID } from "node:crypto";
import type { SupportRepository } from "./repository.js";
import type {
  SupportAction,
  SupportActionKind,
  SupportCategory,
  SupportCustomer,
  SupportEntity,
  SupportFailureCluster,
  SupportHandoff,
  SupportMissionContext,
  SupportPlaybook,
  SupportPolicy,
  SupportPriority,
  SupportProduct,
  SupportQualityReview,
  SupportReviewStatus,
  SupportTicket,
  SupportTicketMessage,
  SupportTriageResult,
  SupportWorkspace,
} from "./types.js";

export interface CreateSupportWorkspaceInput {
  id?: string;
  name: string;
  owner: string;
  description?: string;
  defaultSlaMinutes?: number;
  escalationTeams?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateSupportCustomerInput {
  id?: string;
  workspaceId: string;
  externalRef: string;
  displayName: string;
  segment?: string;
  riskFlags?: string[];
  consentState?: SupportCustomer["consentState"];
  metadata?: Record<string, unknown>;
}

export interface CreateSupportProductInput {
  id?: string;
  workspaceId: string;
  name: string;
  version?: string;
  ownerTeam: string;
  supportChannels?: string[];
  knownIssueRefs?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateSupportPolicyInput {
  id?: string;
  workspaceId: string;
  name: string;
  category: SupportCategory;
  version: number;
  body: string;
  sourceRef: string;
  effectiveFrom: string;
  effectiveTo?: string;
  requiresHumanApproval?: boolean;
  approvedActionKinds?: SupportActionKind[];
}

export interface CreateSupportPlaybookInput {
  id?: string;
  workspaceId: string;
  name: string;
  productId?: string;
  category: SupportCategory;
  version: number;
  steps: Array<{
    order: number;
    instruction: string;
    expectedSignal: string;
    failureEscalation?: string;
    requiresHuman?: boolean;
  }>;
}

export interface CreateSupportTicketInput {
  id?: string;
  workspaceId: string;
  customerId: string;
  productId?: string;
  subject: string;
  description: string;
  channel: string;
  failureSignature?: string;
  createdBy: string;
}

export interface CreateSupportActionInput {
  id?: string;
  workspaceId: string;
  ticketId: string;
  kind: SupportActionKind;
  summary: string;
  requestedBy: string;
  policyId?: string;
  amount?: number;
  currency?: string;
  requestedScope: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
}

const PRIVILEGED_ACTIONS = new Set<SupportActionKind>([
  "refund",
  "account-change",
  "policy-exception",
  "legal-response",
]);

const normalizeList = (values: string[] | undefined): string[] =>
  [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))].sort();

const nowIso = (): string => new Date().toISOString();

const requireText = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
};

const requirePositiveInteger = (value: number, label: string): number => {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`);
  return value;
};

const requireScore = (value: number, label: string): number => {
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(`${label} must be between 0 and 100`);
  return Math.round(value * 100) / 100;
};

const hashId = (prefix: string, value: string): string =>
  `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 20)}`;

const keywordMatches = (text: string, words: string[]): number =>
  words.reduce((count, word) => count + (text.includes(word) ? 1 : 0), 0);

const classifyCategory = (text: string): { category: SupportCategory; reasons: string[] } => {
  const candidates: Array<{ category: SupportCategory; words: string[] }> = [
    { category: "safety", words: ["injury", "hurt", "unsafe", "danger", "emergency", "fire", "smoke"] },
    { category: "security", words: ["hacked", "breach", "stolen", "unauthorized", "fraud", "compromised", "phishing"] },
    { category: "legal", words: ["lawyer", "attorney", "lawsuit", "legal notice", "subpoena", "regulator"] },
    { category: "privacy", words: ["privacy", "personal data", "delete my data", "gdpr", "ccpa", "tracking"] },
    { category: "refund", words: ["refund", "money back", "chargeback", "return my money"] },
    { category: "billing", words: ["charged", "invoice", "billing", "payment", "subscription", "renewal"] },
    { category: "account", words: ["login", "password", "locked out", "account", "email change", "cannot sign in"] },
    { category: "product-feedback", words: ["feature request", "suggestion", "feedback", "wish it", "improvement"] },
    { category: "technical", words: ["error", "bug", "crash", "broken", "not working", "failed", "timeout"] },
  ];
  const ranked = candidates
    .map((candidate) => ({ ...candidate, score: keywordMatches(text, candidate.words) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);
  const winner = ranked[0];
  if (!winner) return { category: "general", reasons: ["No specialized category signal was detected"] };
  return {
    category: winner.category,
    reasons: [`Detected ${winner.score} ${winner.category} signal${winner.score === 1 ? "" : "s"}`],
  };
};

const frustrationScore = (text: string, customerMessageCount: number): { score: number; reasons: string[] } => {
  let score = 0;
  const reasons: string[] = [];
  const severe = keywordMatches(text, ["furious", "unacceptable", "scam", "terrible", "worst", "ridiculous"]);
  const moderate = keywordMatches(text, ["frustrated", "angry", "upset", "annoyed", "disappointed", "still not fixed"]);
  if (severe > 0) {
    score += Math.min(45, severe * 18);
    reasons.push("Severe frustration language detected");
  }
  if (moderate > 0) {
    score += Math.min(30, moderate * 10);
    reasons.push("Frustration language detected");
  }
  const letters = [...text].filter((character) => /[a-z]/iu.test(character));
  const uppercase = letters.filter((character) => character === character.toUpperCase()).length;
  if (letters.length >= 12 && uppercase / letters.length > 0.55) {
    score += 18;
    reasons.push("High uppercase ratio detected");
  }
  const exclamations = (text.match(/!/gu) ?? []).length;
  if (exclamations >= 3) {
    score += Math.min(12, exclamations * 2);
    reasons.push("Repeated exclamation marks detected");
  }
  if (customerMessageCount >= 4) {
    score += Math.min(20, (customerMessageCount - 3) * 5);
    reasons.push("Repeated customer contact detected");
  }
  return { score: Math.min(100, score), reasons };
};

const priorityFor = (
  category: SupportCategory,
  frustration: number,
): { priority: SupportPriority; reasons: string[] } => {
  if (["safety", "security", "legal"].includes(category) || frustration >= 80) {
    return { priority: "urgent", reasons: ["High-risk category or extreme frustration requires urgent handling"] };
  }
  if (["privacy", "refund"].includes(category) || frustration >= 55) {
    return { priority: "high", reasons: ["Sensitive category or elevated frustration requires prioritized handling"] };
  }
  if (frustration >= 25) return { priority: "normal", reasons: ["Moderate frustration requires timely handling"] };
  return { priority: "normal", reasons: ["No urgent risk signal detected"] };
};

const queueFor = (category: SupportCategory, escalationRequired: boolean): string => {
  if (escalationRequired) {
    if (category === "security") return "security-escalation";
    if (category === "safety") return "safety-escalation";
    if (category === "legal" || category === "privacy") return "legal-privacy-escalation";
    return "senior-support";
  }
  if (category === "billing" || category === "refund") return "billing-support";
  if (category === "account") return "account-support";
  if (category === "technical") return "technical-support";
  if (category === "product-feedback") return "product-feedback";
  return "general-support";
};

export class SupportService {
  constructor(private readonly repository: SupportRepository) {}

  private async event(
    entity: SupportEntity,
    type: string,
    actor: string,
    summary: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.repository.appendEvent({
      id: randomUUID(),
      workspaceId: entity.workspaceId,
      entityType: entity.entityType,
      entityId: entity.id,
      type,
      actor: requireText(actor, "Actor"),
      summary: requireText(summary, "Event summary"),
      occurredAt: nowIso(),
      metadata,
    });
  }

  private async workspace(id: string): Promise<SupportWorkspace> {
    const entity = await this.repository.get("workspace", id);
    if (!entity || entity.entityType !== "workspace") throw new Error("Support workspace not found");
    if (entity.status !== "active") throw new Error("Support workspace is archived");
    return entity;
  }

  private async customer(id: string): Promise<SupportCustomer> {
    const entity = await this.repository.get("customer", id);
    if (!entity || entity.entityType !== "customer") throw new Error("Customer not found");
    return entity;
  }

  private async product(id: string): Promise<SupportProduct> {
    const entity = await this.repository.get("product", id);
    if (!entity || entity.entityType !== "product") throw new Error("Product not found");
    return entity;
  }

  private async policy(id: string): Promise<SupportPolicy> {
    const entity = await this.repository.get("policy", id);
    if (!entity || entity.entityType !== "policy") throw new Error("Support policy not found");
    return entity;
  }

  private async playbook(id: string): Promise<SupportPlaybook> {
    const entity = await this.repository.get("playbook", id);
    if (!entity || entity.entityType !== "playbook") throw new Error("Support playbook not found");
    return entity;
  }

  private async ticket(id: string): Promise<SupportTicket> {
    const entity = await this.repository.get("ticket", id);
    if (!entity || entity.entityType !== "ticket") throw new Error("Support ticket not found");
    return entity;
  }

  private async action(id: string): Promise<SupportAction> {
    const entity = await this.repository.get("support-action", id);
    if (!entity || entity.entityType !== "support-action") throw new Error("Support action not found");
    return entity;
  }

  async createWorkspace(input: CreateSupportWorkspaceInput): Promise<SupportWorkspace> {
    const id = input.id?.trim() || randomUUID();
    const existing = await this.repository.get("workspace", id);
    const timestamp = nowIso();
    const entity: SupportWorkspace = {
      id,
      entityType: "workspace",
      workspaceId: id,
      name: requireText(input.name, "Workspace name"),
      owner: requireText(input.owner, "Workspace owner"),
      description: input.description?.trim() || null,
      defaultSlaMinutes: requirePositiveInteger(input.defaultSlaMinutes ?? 1_440, "Default SLA minutes"),
      escalationTeams: normalizeList(input.escalationTeams),
      status: existing?.entityType === "workspace" ? existing.status : "active",
      metadata: { ...(existing?.entityType === "workspace" ? existing.metadata : {}), ...(input.metadata ?? {}) },
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    await this.repository.save(entity);
    await this.event(entity, existing ? "workspace.updated" : "workspace.created", input.owner, entity.name);
    return entity;
  }

  async createCustomer(input: CreateSupportCustomerInput): Promise<SupportCustomer> {
    await this.workspace(input.workspaceId);
    const id = input.id?.trim() || randomUUID();
    const existing = await this.repository.get("customer", id);
    const timestamp = nowIso();
    const entity: SupportCustomer = {
      id,
      entityType: "customer",
      workspaceId: input.workspaceId,
      externalRef: requireText(input.externalRef, "External customer reference"),
      displayName: requireText(input.displayName, "Customer display name"),
      segment: input.segment?.trim() || null,
      riskFlags: normalizeList(input.riskFlags),
      consentState: input.consentState ?? "unknown",
      metadata: { ...(existing?.entityType === "customer" ? existing.metadata : {}), ...(input.metadata ?? {}) },
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    await this.repository.save(entity);
    await this.event(entity, existing ? "customer.updated" : "customer.created", "support-system", entity.externalRef);
    return entity;
  }

  async createProduct(input: CreateSupportProductInput): Promise<SupportProduct> {
    await this.workspace(input.workspaceId);
    const id = input.id?.trim() || randomUUID();
    const existing = await this.repository.get("product", id);
    const timestamp = nowIso();
    const entity: SupportProduct = {
      id,
      entityType: "product",
      workspaceId: input.workspaceId,
      name: requireText(input.name, "Product name"),
      version: input.version?.trim() || null,
      ownerTeam: requireText(input.ownerTeam, "Product owner team"),
      supportChannels: normalizeList(input.supportChannels),
      knownIssueRefs: normalizeList(input.knownIssueRefs),
      metadata: { ...(existing?.entityType === "product" ? existing.metadata : {}), ...(input.metadata ?? {}) },
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    await this.repository.save(entity);
    await this.event(entity, existing ? "product.updated" : "product.created", input.ownerTeam, entity.name);
    return entity;
  }

  async createPolicy(input: CreateSupportPolicyInput): Promise<SupportPolicy> {
    await this.workspace(input.workspaceId);
    const id = input.id?.trim() || randomUUID();
    const existing = await this.repository.get("policy", id);
    const timestamp = nowIso();
    const effectiveFrom = new Date(input.effectiveFrom);
    if (Number.isNaN(effectiveFrom.getTime())) throw new Error("Policy effectiveFrom must be a valid date");
    const effectiveTo = input.effectiveTo ? new Date(input.effectiveTo) : null;
    if (effectiveTo && Number.isNaN(effectiveTo.getTime())) throw new Error("Policy effectiveTo must be a valid date");
    if (effectiveTo && effectiveTo <= effectiveFrom) throw new Error("Policy effectiveTo must be after effectiveFrom");
    const entity: SupportPolicy = {
      id,
      entityType: "policy",
      workspaceId: input.workspaceId,
      name: requireText(input.name, "Policy name"),
      category: input.category,
      version: requirePositiveInteger(input.version, "Policy version"),
      status: existing?.entityType === "policy" ? existing.status : "candidate",
      body: requireText(input.body, "Policy body"),
      sourceRef: requireText(input.sourceRef, "Policy source reference"),
      effectiveFrom: effectiveFrom.toISOString(),
      effectiveTo: effectiveTo?.toISOString() ?? null,
      requiresHumanApproval: input.requiresHumanApproval ?? PRIVILEGED_ACTIONS.has(input.category === "refund" ? "refund" : "standard-response"),
      approvedActionKinds: [...new Set(input.approvedActionKinds ?? [])],
      reviewedBy: existing?.entityType === "policy" ? existing.reviewedBy : null,
      reviewedAt: existing?.entityType === "policy" ? existing.reviewedAt : null,
      reviewReason: existing?.entityType === "policy" ? existing.reviewReason : null,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    await this.repository.save(entity);
    await this.event(entity, existing ? "policy.updated" : "policy.created", "support-system", `${entity.name} v${entity.version}`);
    return entity;
  }

  async reviewPolicy(id: string, status: Exclude<SupportReviewStatus, "candidate" | "retired">, reviewedBy: string, reason: string): Promise<SupportPolicy> {
    const entity = await this.policy(id);
    if (entity.status !== "candidate") throw new Error("Only candidate policies can be reviewed");
    const updated: SupportPolicy = {
      ...entity,
      status,
      reviewedBy: requireText(reviewedBy, "Reviewer"),
      reviewedAt: nowIso(),
      reviewReason: requireText(reason, "Review reason"),
      updatedAt: nowIso(),
    };
    await this.repository.save(updated);
    await this.event(updated, `policy.${status}`, reviewedBy, reason);
    return updated;
  }

  async createPlaybook(input: CreateSupportPlaybookInput): Promise<SupportPlaybook> {
    await this.workspace(input.workspaceId);
    if (input.productId) {
      const product = await this.product(input.productId);
      if (product.workspaceId !== input.workspaceId) throw new Error("Product belongs to another support workspace");
    }
    if (input.steps.length === 0) throw new Error("Playbook requires at least one step");
    const orders = input.steps.map((step) => step.order);
    if (new Set(orders).size !== orders.length || orders.some((order) => !Number.isInteger(order) || order <= 0)) {
      throw new Error("Playbook step order values must be unique positive integers");
    }
    const id = input.id?.trim() || randomUUID();
    const existing = await this.repository.get("playbook", id);
    const timestamp = nowIso();
    const entity: SupportPlaybook = {
      id,
      entityType: "playbook",
      workspaceId: input.workspaceId,
      name: requireText(input.name, "Playbook name"),
      productId: input.productId?.trim() || null,
      category: input.category,
      version: requirePositiveInteger(input.version, "Playbook version"),
      status: existing?.entityType === "playbook" ? existing.status : "candidate",
      steps: input.steps
        .map((step) => ({
          order: step.order,
          instruction: requireText(step.instruction, "Playbook instruction"),
          expectedSignal: requireText(step.expectedSignal, "Expected signal"),
          failureEscalation: step.failureEscalation?.trim() || null,
          requiresHuman: step.requiresHuman ?? false,
        }))
        .sort((left, right) => left.order - right.order),
      reviewedBy: existing?.entityType === "playbook" ? existing.reviewedBy : null,
      reviewedAt: existing?.entityType === "playbook" ? existing.reviewedAt : null,
      reviewReason: existing?.entityType === "playbook" ? existing.reviewReason : null,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    await this.repository.save(entity);
    await this.event(entity, existing ? "playbook.updated" : "playbook.created", "support-system", `${entity.name} v${entity.version}`);
    return entity;
  }

  async reviewPlaybook(id: string, status: "approved" | "rejected", reviewedBy: string, reason: string): Promise<SupportPlaybook> {
    const entity = await this.playbook(id);
    if (entity.status !== "candidate") throw new Error("Only candidate playbooks can be reviewed");
    const updated: SupportPlaybook = {
      ...entity,
      status,
      reviewedBy: requireText(reviewedBy, "Reviewer"),
      reviewedAt: nowIso(),
      reviewReason: requireText(reason, "Review reason"),
      updatedAt: nowIso(),
    };
    await this.repository.save(updated);
    await this.event(updated, `playbook.${status}`, reviewedBy, reason);
    return updated;
  }

  private triageFor(ticket: SupportTicket): SupportTriageResult {
    const customerMessages = ticket.messages.filter((message) => message.authorType === "customer");
    const text = [ticket.subject, ticket.description, ...customerMessages.map((message) => message.body)]
      .join("\n")
      .toLowerCase();
    const classification = classifyCategory(text);
    const frustration = frustrationScore(text, customerMessages.length);
    const priority = priorityFor(classification.category, frustration.score);
    const legalRisk = classification.category === "legal" || text.includes("regulator") || text.includes("attorney");
    const securityRisk = classification.category === "security";
    const safetyRisk = classification.category === "safety";
    const escalationRequired = legalRisk || securityRisk || safetyRisk || frustration.score >= 70;
    return {
      category: classification.category,
      priority: priority.priority,
      frustrationScore: frustration.score,
      escalationRequired,
      legalRisk,
      securityRisk,
      safetyRisk,
      assignedQueue: queueFor(classification.category, escalationRequired),
      reasons: [...classification.reasons, ...frustration.reasons, ...priority.reasons],
      evaluatedAt: nowIso(),
    };
  }

  async createTicket(input: CreateSupportTicketInput): Promise<SupportTicket> {
    await this.workspace(input.workspaceId);
    const customer = await this.customer(input.customerId);
    if (customer.workspaceId !== input.workspaceId) throw new Error("Customer belongs to another support workspace");
    if (input.productId) {
      const product = await this.product(input.productId);
      if (product.workspaceId !== input.workspaceId) throw new Error("Product belongs to another support workspace");
    }
    const timestamp = nowIso();
    const id = input.id?.trim() || randomUUID();
    if (await this.repository.get("ticket", id)) throw new Error("Ticket already exists");
    const firstMessage: SupportTicketMessage = {
      id: randomUUID(),
      authorType: "customer",
      body: requireText(input.description, "Ticket description"),
      createdAt: timestamp,
    };
    const base: SupportTicket = {
      id,
      entityType: "ticket",
      workspaceId: input.workspaceId,
      customerId: input.customerId,
      productId: input.productId?.trim() || null,
      subject: requireText(input.subject, "Ticket subject"),
      description: firstMessage.body,
      status: "new",
      channel: requireText(input.channel, "Ticket channel"),
      category: "general",
      priority: "normal",
      assignedQueue: "general-support",
      messages: [firstMessage],
      triage: null,
      policyIds: [],
      troubleshootingPlan: null,
      failureSignature: input.failureSignature?.trim().toLowerCase() || null,
      resolutionSummary: null,
      resolutionEvidence: [],
      firstResponseAt: null,
      resolvedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const triage = this.triageFor(base);
    const entity: SupportTicket = {
      ...base,
      status: triage.escalationRequired ? "waiting-human" : "triaged",
      category: triage.category,
      priority: triage.priority,
      assignedQueue: triage.assignedQueue,
      triage,
    };
    await this.repository.save(entity);
    await this.event(entity, "ticket.created", input.createdBy, entity.subject, { triage });
    return entity;
  }

  async addMessage(ticketId: string, authorType: SupportTicketMessage["authorType"], body: string, actor: string): Promise<SupportTicket> {
    const entity = await this.ticket(ticketId);
    if (["resolved", "closed"].includes(entity.status)) throw new Error("Resolved or closed tickets cannot receive new messages");
    const message: SupportTicketMessage = {
      id: randomUUID(),
      authorType,
      body: requireText(body, "Message body"),
      createdAt: nowIso(),
    };
    const withMessage: SupportTicket = {
      ...entity,
      messages: [...entity.messages, message],
      firstResponseAt: authorType === "agent" && !entity.firstResponseAt ? message.createdAt : entity.firstResponseAt,
      updatedAt: message.createdAt,
    };
    const triage = this.triageFor(withMessage);
    const updated: SupportTicket = {
      ...withMessage,
      category: triage.category,
      priority: triage.priority,
      assignedQueue: triage.assignedQueue,
      status: triage.escalationRequired ? "waiting-human" : withMessage.status,
      triage,
    };
    await this.repository.save(updated);
    await this.event(updated, "ticket.message-added", actor, `${authorType} message recorded`, { messageId: message.id, triage });
    return updated;
  }

  async triageTicket(ticketId: string, actor: string): Promise<SupportTicket> {
    const entity = await this.ticket(ticketId);
    const triage = this.triageFor(entity);
    const updated: SupportTicket = {
      ...entity,
      category: triage.category,
      priority: triage.priority,
      assignedQueue: triage.assignedQueue,
      status: triage.escalationRequired ? "waiting-human" : "triaged",
      triage,
      updatedAt: nowIso(),
    };
    await this.repository.save(updated);
    await this.event(updated, "ticket.triaged", actor, `${triage.category}/${triage.priority}`, { triage });
    return updated;
  }

  async approvedPolicies(workspaceId: string, category?: SupportCategory, at = nowIso()): Promise<SupportPolicy[]> {
    await this.workspace(workspaceId);
    const point = new Date(at).getTime();
    if (!Number.isFinite(point)) throw new Error("Policy evaluation time must be valid");
    return (await this.repository.list("policy", { workspaceId, limit: 500 }))
      .filter((entity): entity is SupportPolicy => entity.entityType === "policy")
      .filter((policy) => policy.status === "approved")
      .filter((policy) => !category || policy.category === category || policy.category === "general")
      .filter((policy) => new Date(policy.effectiveFrom).getTime() <= point)
      .filter((policy) => policy.effectiveTo === null || new Date(policy.effectiveTo).getTime() >= point)
      .sort((left, right) => right.version - left.version);
  }

  async attachCurrentPolicies(ticketId: string, actor: string): Promise<SupportTicket> {
    const entity = await this.ticket(ticketId);
    const policies = await this.approvedPolicies(entity.workspaceId, entity.category);
    const updated: SupportTicket = {
      ...entity,
      policyIds: policies.map((policy) => policy.id),
      updatedAt: nowIso(),
    };
    await this.repository.save(updated);
    await this.event(updated, "ticket.policies-attached", actor, `${policies.length} approved policies attached`, {
      policyIds: updated.policyIds,
    });
    return updated;
  }

  async buildTroubleshootingPlan(ticketId: string, actor: string): Promise<SupportTicket> {
    const entity = await this.ticket(ticketId);
    const playbooks = (await this.repository.list("playbook", { workspaceId: entity.workspaceId, limit: 500 }))
      .filter((item): item is SupportPlaybook => item.entityType === "playbook")
      .filter((playbook) => playbook.status === "approved")
      .filter((playbook) => playbook.category === entity.category)
      .filter((playbook) => playbook.productId === null || playbook.productId === entity.productId)
      .sort((left, right) => right.version - left.version);
    const selected = playbooks[0];
    if (!selected) throw new Error("No approved troubleshooting playbook matches this ticket");
    const updated: SupportTicket = {
      ...entity,
      troubleshootingPlan: {
        playbookId: selected.id,
        playbookVersion: selected.version,
        generatedAt: nowIso(),
        steps: selected.steps,
      },
      updatedAt: nowIso(),
    };
    await this.repository.save(updated);
    await this.event(updated, "ticket.troubleshooting-planned", actor, selected.name, { playbookId: selected.id });
    return updated;
  }

  async createHandoff(ticketId: string, targetTeam: string, reason: string, summary: string, requestedBy: string): Promise<SupportHandoff> {
    const ticket = await this.ticket(ticketId);
    const timestamp = nowIso();
    const entity: SupportHandoff = {
      id: randomUUID(),
      entityType: "handoff",
      workspaceId: ticket.workspaceId,
      ticketId,
      status: "requested",
      reason: requireText(reason, "Handoff reason"),
      targetTeam: requireText(targetTeam, "Target team"),
      requestedBy: requireText(requestedBy, "Requester"),
      acceptedBy: null,
      summary: requireText(summary, "Handoff summary"),
      requestedAt: timestamp,
      resolvedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.repository.save(entity);
    const updatedTicket: SupportTicket = {
      ...ticket,
      status: "waiting-human",
      assignedQueue: entity.targetTeam,
      updatedAt: timestamp,
    };
    await this.repository.save(updatedTicket);
    await this.event(entity, "handoff.requested", requestedBy, entity.reason, { ticketId });
    return entity;
  }

  async acceptHandoff(id: string, acceptedBy: string): Promise<SupportHandoff> {
    const entity = await this.repository.get("handoff", id);
    if (!entity || entity.entityType !== "handoff") throw new Error("Handoff not found");
    if (entity.status !== "requested") throw new Error("Only requested handoffs can be accepted");
    const updated: SupportHandoff = {
      ...entity,
      status: "accepted",
      acceptedBy: requireText(acceptedBy, "Acceptor"),
      updatedAt: nowIso(),
    };
    await this.repository.save(updated);
    await this.event(updated, "handoff.accepted", acceptedBy, updated.targetTeam);
    return updated;
  }

  async createAction(input: CreateSupportActionInput): Promise<SupportAction> {
    await this.workspace(input.workspaceId);
    const ticket = await this.ticket(input.ticketId);
    if (ticket.workspaceId !== input.workspaceId) throw new Error("Ticket belongs to another support workspace");
    const duplicate = (await this.repository.list("support-action", { workspaceId: input.workspaceId, limit: 1_000 }))
      .filter((entity): entity is SupportAction => entity.entityType === "support-action")
      .find((action) => action.idempotencyKey === input.idempotencyKey);
    if (duplicate) return duplicate;
    let policyId: string | null = input.policyId?.trim() || null;
    if (policyId) {
      const policy = await this.policy(policyId);
      if (policy.workspaceId !== input.workspaceId) throw new Error("Policy belongs to another support workspace");
      if (policy.status !== "approved") throw new Error("Only approved policies can govern support actions");
      if (!policy.approvedActionKinds.includes(input.kind)) throw new Error("Policy does not authorize this action kind");
    }
    if (PRIVILEGED_ACTIONS.has(input.kind) && !policyId) throw new Error("Privileged support actions require an approved governing policy");
    if (input.kind === "refund") {
      if (!Number.isFinite(input.amount) || (input.amount ?? 0) <= 0) throw new Error("Refund amount must be positive");
      if (!input.currency?.trim()) throw new Error("Refund currency is required");
    }
    const timestamp = nowIso();
    const entity: SupportAction = {
      id: input.id?.trim() || randomUUID(),
      entityType: "support-action",
      workspaceId: input.workspaceId,
      ticketId: input.ticketId,
      kind: input.kind,
      status: "proposed",
      summary: requireText(input.summary, "Action summary"),
      requestedBy: requireText(input.requestedBy, "Requester"),
      policyId,
      amount: input.amount ?? null,
      currency: input.currency?.trim().toUpperCase() || null,
      requestedScope: requireText(input.requestedScope, "Requested scope"),
      approvedBy: null,
      approvedAt: null,
      approvalReason: null,
      completedBy: null,
      completedAt: null,
      externalReference: null,
      outcome: null,
      evidenceRefs: normalizeList(input.evidenceRefs),
      idempotencyKey: requireText(input.idempotencyKey, "Idempotency key"),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.repository.save(entity);
    await this.event(entity, "support-action.proposed", input.requestedBy, entity.summary, {
      privileged: PRIVILEGED_ACTIONS.has(entity.kind),
    });
    return entity;
  }

  async approveAction(id: string, approvedBy: string, reason: string): Promise<SupportAction> {
    const entity = await this.action(id);
    if (entity.status !== "proposed") throw new Error("Only proposed support actions can be approved");
    const updated: SupportAction = {
      ...entity,
      status: "approved",
      approvedBy: requireText(approvedBy, "Approver"),
      approvedAt: nowIso(),
      approvalReason: requireText(reason, "Approval reason"),
      updatedAt: nowIso(),
    };
    await this.repository.save(updated);
    await this.event(updated, "support-action.approved", approvedBy, reason);
    return updated;
  }

  async rejectAction(id: string, rejectedBy: string, reason: string): Promise<SupportAction> {
    const entity = await this.action(id);
    if (entity.status !== "proposed") throw new Error("Only proposed support actions can be rejected");
    const updated: SupportAction = {
      ...entity,
      status: "rejected",
      approvedBy: requireText(rejectedBy, "Reviewer"),
      approvedAt: nowIso(),
      approvalReason: requireText(reason, "Rejection reason"),
      updatedAt: nowIso(),
    };
    await this.repository.save(updated);
    await this.event(updated, "support-action.rejected", rejectedBy, reason);
    return updated;
  }

  async recordActionCompletion(
    id: string,
    completedBy: string,
    externalReference: string,
    outcome: string,
    evidenceRefs: string[],
  ): Promise<SupportAction> {
    const entity = await this.action(id);
    if (entity.status === "recorded-complete") return entity;
    if (["rejected", "failed"].includes(entity.status)) throw new Error("Rejected or failed actions cannot be completed");
    if (PRIVILEGED_ACTIONS.has(entity.kind) && entity.status !== "approved") {
      throw new Error("Privileged support actions require explicit approval before completion can be recorded");
    }
    if (!PRIVILEGED_ACTIONS.has(entity.kind) && !["proposed", "approved"].includes(entity.status)) {
      throw new Error("Support action is not in a completable state");
    }
    const evidence = normalizeList([...entity.evidenceRefs, ...evidenceRefs]);
    if (evidence.length === 0) throw new Error("Completion evidence is required");
    const updated: SupportAction = {
      ...entity,
      status: "recorded-complete",
      completedBy: requireText(completedBy, "Completer"),
      completedAt: nowIso(),
      externalReference: requireText(externalReference, "External reference"),
      outcome: requireText(outcome, "Outcome"),
      evidenceRefs: evidence,
      updatedAt: nowIso(),
    };
    await this.repository.save(updated);
    await this.event(updated, "support-action.completion-recorded", completedBy, outcome, {
      externalReference: updated.externalReference,
    });
    return updated;
  }

  async resolveTicket(ticketId: string, resolvedBy: string, summary: string, evidenceRefs: string[]): Promise<SupportTicket> {
    const entity = await this.ticket(ticketId);
    const evidence = normalizeList(evidenceRefs);
    if (evidence.length === 0) throw new Error("Ticket resolution requires evidence");
    const actions = (await this.repository.list("support-action", { workspaceId: entity.workspaceId, limit: 1_000 }))
      .filter((item): item is SupportAction => item.entityType === "support-action")
      .filter((action) => action.ticketId === ticketId && PRIVILEGED_ACTIONS.has(action.kind));
    const unresolvedPrivileged = actions.filter((action) => !["recorded-complete", "rejected"].includes(action.status));
    if (unresolvedPrivileged.length > 0) throw new Error("Ticket has unresolved privileged support actions");
    const timestamp = nowIso();
    const updated: SupportTicket = {
      ...entity,
      status: "resolved",
      resolutionSummary: requireText(summary, "Resolution summary"),
      resolutionEvidence: evidence,
      resolvedAt: timestamp,
      updatedAt: timestamp,
    };
    await this.repository.save(updated);
    await this.event(updated, "ticket.resolved", resolvedBy, summary, { evidenceRefs: evidence });
    return updated;
  }

  async createQualityReview(
    ticketId: string,
    reviewedBy: string,
    scores: {
      policyAccuracy: number;
      diagnosisQuality: number;
      communicationQuality: number;
      escalationQuality: number;
      evidenceQuality: number;
    },
    findings: string[],
    correctiveActions: string[],
  ): Promise<SupportQualityReview> {
    const ticket = await this.ticket(ticketId);
    const normalizedScores = {
      policyAccuracy: requireScore(scores.policyAccuracy, "Policy accuracy"),
      diagnosisQuality: requireScore(scores.diagnosisQuality, "Diagnosis quality"),
      communicationQuality: requireScore(scores.communicationQuality, "Communication quality"),
      escalationQuality: requireScore(scores.escalationQuality, "Escalation quality"),
      evidenceQuality: requireScore(scores.evidenceQuality, "Evidence quality"),
    };
    const overallScore = Math.round(
      ((normalizedScores.policyAccuracy * 0.25 +
        normalizedScores.diagnosisQuality * 0.2 +
        normalizedScores.communicationQuality * 0.2 +
        normalizedScores.escalationQuality * 0.15 +
        normalizedScores.evidenceQuality * 0.2) * 100),
    ) / 100;
    const timestamp = nowIso();
    const entity: SupportQualityReview = {
      id: randomUUID(),
      entityType: "quality-review",
      workspaceId: ticket.workspaceId,
      ticketId,
      reviewedBy: requireText(reviewedBy, "Reviewer"),
      ...normalizedScores,
      overallScore,
      findings: normalizeList(findings),
      correctiveActions: normalizeList(correctiveActions),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.repository.save(entity);
    await this.event(entity, "quality-review.created", reviewedBy, `Overall score ${overallScore}`, { scores: normalizedScores });
    return entity;
  }

  async rebuildFailureClusters(workspaceId: string, actor: string): Promise<SupportFailureCluster[]> {
    const workspace = await this.workspace(workspaceId);
    const tickets = (await this.repository.list("ticket", { workspaceId, limit: 10_000 }))
      .filter((entity): entity is SupportTicket => entity.entityType === "ticket")
      .filter((ticket) => ticket.failureSignature !== null);
    const groups = new Map<string, SupportTicket[]>();
    for (const ticket of tickets) {
      const key = `${ticket.productId ?? "none"}:${ticket.failureSignature}`;
      groups.set(key, [...(groups.get(key) ?? []), ticket]);
    }
    const clusters: SupportFailureCluster[] = [];
    for (const [key, group] of groups) {
      if (group.length < 2) continue;
      const sorted = [...group].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
      const latest = sorted.at(-1) as SupportTicket;
      const severity: SupportPriority = group.some((ticket) => ticket.priority === "urgent")
        ? "urgent"
        : group.some((ticket) => ticket.priority === "high")
          ? "high"
          : group.length >= 5
            ? "high"
            : "normal";
      const id = hashId("failure", `${workspaceId}:${key}`);
      const existing = await this.repository.get("failure-cluster", id);
      const timestamp = nowIso();
      const entity: SupportFailureCluster = {
        id,
        entityType: "failure-cluster",
        workspaceId,
        productId: latest.productId,
        signature: latest.failureSignature as string,
        ticketIds: sorted.map((ticket) => ticket.id),
        occurrenceCount: sorted.length,
        severity,
        firstSeenAt: sorted[0]?.createdAt ?? timestamp,
        lastSeenAt: latest.createdAt,
        status: existing?.entityType === "failure-cluster" ? existing.status : "open",
        ownerTeam: existing?.entityType === "failure-cluster" ? existing.ownerTeam : null,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      };
      await this.repository.save(entity);
      await this.event(entity, "failure-cluster.rebuilt", actor, `${entity.signature}: ${entity.occurrenceCount} tickets`, {
        ticketIds: entity.ticketIds,
      });
      clusters.push(entity);
    }
    if (clusters.length === 0) {
      await this.repository.appendEvent({
        id: randomUUID(),
        workspaceId,
        entityType: "workspace",
        entityId: workspace.id,
        type: "failure-clusters.rebuilt",
        actor: requireText(actor, "Actor"),
        summary: "No repeated failure signatures met the clustering threshold",
        occurredAt: nowIso(),
        metadata: {},
      });
    }
    return clusters.sort((left, right) => right.occurrenceCount - left.occurrenceCount);
  }

  async listTickets(workspaceId: string, limit = 200): Promise<SupportTicket[]> {
    return (await this.repository.list("ticket", { workspaceId, limit }))
      .filter((entity): entity is SupportTicket => entity.entityType === "ticket");
  }

  async listPolicies(workspaceId: string, limit = 200): Promise<SupportPolicy[]> {
    return (await this.repository.list("policy", { workspaceId, limit }))
      .filter((entity): entity is SupportPolicy => entity.entityType === "policy");
  }

  async listEvents(workspaceId?: string, entityId?: string, limit = 500) {
    return this.repository.listEvents({ workspaceId, entityId, limit });
  }

  async buildMissionContext(workspaceId?: string, ticketId?: string): Promise<SupportMissionContext> {
    const generatedAt = nowIso();
    const policies = workspaceId ? await this.approvedPolicies(workspaceId) : [];
    const tickets = workspaceId ? await this.listTickets(workspaceId, 500) : [];
    const handoffs = workspaceId
      ? (await this.repository.list("handoff", { workspaceId, limit: 200 }))
          .filter((entity): entity is SupportHandoff => entity.entityType === "handoff")
          .filter((handoff) => !["resolved", "cancelled"].includes(handoff.status))
      : [];
    const clusters = workspaceId
      ? (await this.repository.list("failure-cluster", { workspaceId, limit: 100 }))
          .filter((entity): entity is SupportFailureCluster => entity.entityType === "failure-cluster")
          .filter((cluster) => cluster.status !== "resolved")
      : [];
    const selectedTicket = ticketId ? await this.ticket(ticketId) : null;
    if (selectedTicket && workspaceId && selectedTicket.workspaceId !== workspaceId) {
      throw new Error("Requested ticket belongs to another support workspace");
    }
    const openTickets = tickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status));
    const urgentTickets = openTickets.filter((ticket) => ticket.priority === "urgent");
    const frustratedTickets = openTickets.filter((ticket) => (ticket.triage?.frustrationScore ?? 0) >= 55);
    const sections = [
      `Support workspace: ${workspaceId ?? "not specified"}`,
      `Approved active policies: ${policies.length}`,
      `Open tickets: ${openTickets.length}; urgent: ${urgentTickets.length}; elevated frustration: ${frustratedTickets.length}`,
      `Unresolved human handoffs: ${handoffs.length}`,
      `Open repeated-failure clusters: ${clusters.length}`,
      selectedTicket
        ? `Selected ticket ${selectedTicket.id}: ${selectedTicket.subject}; ${selectedTicket.category}/${selectedTicket.priority}; status ${selectedTicket.status}; queue ${selectedTicket.assignedQueue}`
        : "Selected ticket: none",
      policies.slice(0, 12).map((policy) => `Policy ${policy.id} v${policy.version}: ${policy.name} [${policy.category}]`).join("\n"),
      openTickets.slice(0, 12).map((ticket) => `Ticket ${ticket.id}: ${ticket.subject} [${ticket.status}; ${ticket.priority}; ${ticket.assignedQueue}]`).join("\n"),
      clusters.slice(0, 8).map((cluster) => `Failure ${cluster.id}: ${cluster.signature}; ${cluster.occurrenceCount} tickets; ${cluster.severity}`).join("\n"),
    ].filter(Boolean);
    const evidence = [
      ...policies.map((policy) => ({
        id: policy.id,
        source: `support-policy:${policy.workspaceId}`,
        locator: `version:${policy.version}:${policy.sourceRef}`,
        retrievedAt: generatedAt,
      })),
      ...openTickets.slice(0, 50).map((ticket) => ({
        id: ticket.id,
        source: `support-ticket:${ticket.workspaceId}`,
        locator: `status:${ticket.status}:updated:${ticket.updatedAt}`,
        retrievedAt: generatedAt,
      })),
      ...clusters.map((cluster) => ({
        id: cluster.id,
        source: `support-failure-cluster:${cluster.workspaceId}`,
        locator: `occurrences:${cluster.occurrenceCount}:updated:${cluster.updatedAt}`,
        retrievedAt: generatedAt,
      })),
    ];
    const uncertainties: string[] = [];
    if (!workspaceId) uncertainties.push("No support workspace was supplied, so governed policy and ticket state was not loaded");
    if (workspaceId && policies.length === 0) uncertainties.push("No approved active support policies were found");
    if (selectedTicket?.triage === null) uncertainties.push("The selected ticket has not been triaged");
    if (selectedTicket && selectedTicket.policyIds.length === 0) uncertainties.push("The selected ticket has no approved policy version attached");
    return { summary: sections.join("\n\n").slice(0, 20_000), evidence, uncertainties };
  }
}
