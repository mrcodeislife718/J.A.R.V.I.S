import type { DomainId, DomainManifest } from "../core/types.js";

const core = ["core.plan", "core.retrieve", "core.verify", "core.report"];

const manifests: DomainManifest[] = [
  {
    id: "biomedical-research",
    name: "Biomedical Research and Development System",
    description: "Governed scientific intelligence, invention, external-laboratory development, IP, funding, manufacturing, regulatory, and commercialization workforce.",
    memoryNamespace: "domain.biomedical",
    defaultCapabilities: [
      "biomedical.program-manage",
      "biomedical.literature-organize",
      "biomedical.evidence-graph",
      "biomedical.commercialization-plan",
    ],
    allowedCapabilities: [
      ...core,
      "biomedical.program-manage",
      "biomedical.literature-organize",
      "biomedical.evidence-assess",
      "biomedical.evidence-graph",
      "biomedical.mechanism-compare",
      "biomedical.contradiction-map",
      "biomedical.hypothesis-draft",
      "biomedical.assay-analyze",
      "biomedical.development-plan",
      "biomedical.lab-partner-qualify",
      "biomedical.lab-engagement-manage",
      "biomedical.ip-landscape",
      "biomedical.ip-portfolio",
      "biomedical.funding-map",
      "biomedical.regulatory-map",
      "biomedical.manufacturing-readiness",
      "biomedical.commercialization-plan",
      "biomedical.nanoparticle-evaluate",
      "biomedical.decision-gate",
    ],
    deniedActions: [
      "self-experimentation workflow",
      "unauthorized human dosing",
      "oversight evasion",
      "pathogen enhancement",
      "unreviewed hazardous wet-lab execution",
      "external laboratory commitment without owner authorization",
      "fabricated scientific evidence",
    ],
    authorizationRequiredFor: [
      "promotion of a development plan",
      "external laboratory statement of work",
      "laboratory financial commitment",
      "regulated or public submission",
      "high-risk biological hypothesis",
      "technology transfer",
    ],
    safeguards: [
      "owner and principal-investigator final authority",
      "source-level provenance",
      "retraction and study-quality checks",
      "contradiction and uncertainty ledgers",
      "qualified laboratory review",
      "bounded external-laboratory authorization",
      "raw-data and deliverable requirements",
      "result verification before advancement",
      "inventorship and ownership separation",
    ],
  },
  {
    id: "business-operations",
    name: "Business Operations System",
    description: "Governed operational intelligence for projects, decisions, finance, partnerships, and company execution.",
    memoryNamespace: "domain.business",
    defaultCapabilities: ["business.objective-decompose", "business.decision-log", "business.risk-map"],
    allowedCapabilities: [...core, "business.objective-decompose", "business.decision-log", "business.sop-build", "business.finance-scenario", "business.risk-map", "business.weekly-report"],
    deniedActions: ["unauthorized spending", "contract acceptance", "ownership transfer", "unapproved hiring or termination", "false financial representation"],
    authorizationRequiredFor: ["financial commitment", "contractual commitment", "external submission", "material policy change"],
    safeguards: ["owner final authority", "separate recommendation and authorization", "source-linked assumptions", "scenario reproducibility", "audit trail"],
  },
  {
    id: "personal-knowledge",
    name: "Personal Knowledge Management System",
    description: "Long-term project continuity, cognitive architecture extraction, decision memory, and cross-domain connection.",
    memoryNamespace: "domain.personal-knowledge",
    defaultCapabilities: ["knowledge.extract", "knowledge.connect", "knowledge.resume"],
    allowedCapabilities: [...core, "knowledge.extract", "knowledge.connect", "knowledge.timeline", "knowledge.gaps", "knowledge.resume", "knowledge.review-plan"],
    deniedActions: ["silent permanent memory write", "cross-project contamination", "assistant content misattributed to user", "unsupported confidence inflation"],
    authorizationRequiredFor: ["permanent memory promotion", "cross-domain transfer", "deletion of approved memory"],
    safeguards: ["separate user and assistant authorship", "preserve corrections", "track what changed and why", "project isolation", "provenance and confidence"],
  },
  {
    id: "customer-support",
    name: "Customer Support System",
    description: "Policy-grounded support triage, troubleshooting, escalation, quality, and product feedback.",
    memoryNamespace: "domain.customer-support",
    defaultCapabilities: ["support.classify", "support.retrieve-policy", "support.troubleshoot"],
    allowedCapabilities: [...core, "support.classify", "support.retrieve-policy", "support.troubleshoot", "support.escalation", "support.product-feedback", "support.quality-score"],
    deniedActions: ["unauthorized refund", "unauthorized account change", "policy exception", "legal admission", "exposure of customer secrets"],
    authorizationRequiredFor: ["refund", "account mutation", "policy exception", "legal or safety response"],
    safeguards: ["least-privilege customer access", "policy versioning", "human escalation", "PII minimization", "verified solutions only"],
  },
  {
    id: "analytics",
    name: "Analytics System",
    description: "Reproducible data transformation, metrics, anomaly detection, forecasting, and decision support.",
    memoryNamespace: "domain.analytics",
    defaultCapabilities: ["analytics.schema-inspect", "analytics.data-quality", "analytics.lineage"],
    allowedCapabilities: [...core, "analytics.schema-inspect", "analytics.sql-draft", "analytics.data-quality", "analytics.anomaly-detect", "analytics.metric-calculate", "analytics.forecast", "analytics.lineage"],
    deniedActions: ["unapproved destructive query", "fabricated data", "hidden transformation", "causal claim without design", "credential exposure"],
    authorizationRequiredFor: ["write query", "production data access", "external data export", "metric-definition change"],
    safeguards: ["read-only by default", "data lineage", "reproducible calculations", "confidence ranges", "correlation-inference-causation separation"],
  },
  {
    id: "infrastructure-administration",
    name: "Infrastructure Administration System",
    description: "Resource monitoring, workload routing, incident diagnosis, recovery planning, and controlled administration.",
    memoryNamespace: "domain.infrastructure",
    defaultCapabilities: ["infrastructure.inventory", "infrastructure.monitor", "infrastructure.diagnose"],
    allowedCapabilities: [...core, "infrastructure.inventory", "infrastructure.monitor", "infrastructure.diagnose", "infrastructure.workload-route", "infrastructure.backup-verify", "infrastructure.patch-plan", "infrastructure.incident-timeline"],
    deniedActions: ["unapproved deletion", "unapproved wipe", "credential disclosure", "backup destruction", "unbounded shell execution"],
    authorizationRequiredFor: ["delete data", "wipe system", "rotate credentials", "change firewall", "production deploy", "modify backups", "shutdown critical service"],
    safeguards: ["read-only default", "sandboxing", "rollback point", "postcondition verification", "least privilege", "full command audit"],
  },
  {
    id: "content-production",
    name: "Content Production System",
    description: "Research, drafting, adaptation, verification, approval, publication planning, and performance learning.",
    memoryNamespace: "domain.content",
    defaultCapabilities: ["content.research", "content.strategy", "content.draft", "content.fact-check"],
    allowedCapabilities: [...core, "content.research", "content.strategy", "content.draft", "content.repurpose", "content.fact-check", "content.performance-analyze", "content.calendar"],
    deniedActions: ["fabricated source", "invented quotation", "unapproved publication", "private-data disclosure", "impersonation"],
    authorizationRequiredFor: ["publication", "paid promotion", "brand-policy change", "use of confidential research"],
    safeguards: ["source attribution", "claim verification", "platform constraints", "brand consistency", "commercial-purpose disclosure", "human publication approval"],
  },
];

export const domainRegistry = new Map(manifests.map((manifest) => [manifest.id, manifest]));

export const getDomainManifest = (id: DomainId): DomainManifest => {
  const manifest = domainRegistry.get(id);
  if (!manifest) {
    throw new Error(`Unknown domain: ${id}`);
  }
  return manifest;
};

export const listDomainManifests = (): DomainManifest[] => [...domainRegistry.values()];
