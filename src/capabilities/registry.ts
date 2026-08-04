import type { CapabilityDefinition, RiskLevel } from "../core/types.js";

const define = (
  id: string,
  name: string,
  description: string,
  risk: RiskLevel = "low",
  tools: string[] = [],
  sideEffecting = false,
  verification: string[] = ["output-present", "constraint-check"],
): CapabilityDefinition => ({ id, name, description, risk, tools, sideEffecting, verification });

const definitions: CapabilityDefinition[] = [
  define("core.plan", "Mission planning", "Decompose an objective into bounded, dependent work."),
  define("core.retrieve", "Evidence retrieval", "Retrieve the minimum relevant evidence with provenance.", "low", ["retrieval.search"]),
  define("core.verify", "Result verification", "Test outputs against mission constraints and domain checks."),
  define("core.report", "Approved reporting", "Produce a clear final artifact with uncertainty labels."),

  define("biomedical.program-manage", "Biomedical program management", "Maintain governed disease and platform programs with eight-node systems maps, success criteria, failure criteria, commercial theses, and next actions.", "moderate"),
  define("biomedical.literature-organize", "Literature organization", "Organize scientific literature by claim, method, result, and quality.", "moderate", ["biomedical.literature"]),
  define("biomedical.evidence-assess", "Evidence quality assessment", "Score study design, controls, bias, replication, retraction status, provenance, and translational limits.", "moderate"),
  define("biomedical.evidence-graph", "Biomedical evidence graph", "Connect targets, pathways, diseases, interventions, studies, outcomes, manufacturing, regulatory, and market records.", "moderate"),
  define("biomedical.mechanism-compare", "Mechanism comparison", "Compare competing biological mechanisms and contradictory findings.", "moderate"),
  define("biomedical.contradiction-map", "Contradiction mapping", "Preserve opposing claims, plausible explanations, and evidence required to resolve uncertainty.", "moderate"),
  define("biomedical.hypothesis-draft", "Hypothesis drafting", "Draft falsifiable, evidence-linked research hypotheses with assumptions, contradictions, translational potential, and commercial potential.", "high"),
  define("biomedical.assay-analyze", "Assay analysis", "Analyze supplied assay data with explicit statistical and model limitations.", "moderate", ["analytics.compute"]),
  define("biomedical.development-plan", "Development planning", "Create review-gated computational, assay, preclinical, analytical, manufacturing, and translational development concepts with controls and decision criteria.", "high"),
  define("biomedical.lab-partner-qualify", "Laboratory partner qualification", "Evaluate university, HBCU, CRO, CDMO, core-facility, testing-lab, and biobank capabilities, quality systems, data practices, IP terms, and risks.", "moderate"),
  define("biomedical.lab-engagement-manage", "External laboratory engagement", "Manage capability review, NDA, RFI, RFQ, SOW, authorization, deliverables, raw data, chain of custody, and result verification without autonomous wet-lab execution.", "high"),
  define("biomedical.ip-landscape", "IP landscape", "Map patents, claims, assignees, prior art, and potential white space.", "moderate", ["ip.search"]),
  define("biomedical.ip-portfolio", "Biomedical IP portfolio", "Preserve inventions, inventorship, ownership, differentiators, evidence, enablement gaps, disclosures, filings, licensing, and abandonment decisions.", "moderate"),
  define("biomedical.funding-map", "Biomedical funding intelligence", "Match programs to grants, government contracts, eligibility, partners, awards, deadlines, and proposal actions.", "moderate"),
  define("biomedical.regulatory-map", "Regulatory mapping", "Map product classification, intended use, jurisdiction, agencies, evidence, quality systems, ethics oversight, and development milestones without claiming legal authorization.", "moderate"),
  define("biomedical.manufacturing-readiness", "Manufacturing readiness", "Map critical quality attributes, raw materials, analytical methods, process development, stability, packaging, technology transfer, cost assumptions, and scale-up risk.", "high"),
  define("biomedical.commercialization-plan", "Biomedical commercialization", "Build evidence-linked licensing, co-development, diagnostics, research tools, services, data, software, government, product, acquisition, and spinout strategies.", "moderate"),
  define("biomedical.nanoparticle-evaluate", "Nanoparticle evaluation", "Evaluate payload, targeting, distribution, clearance, manufacturability, and toxicity evidence.", "high"),
  define("biomedical.decision-gate", "Biomedical decision gates", "Separate recommendations, owner or principal-investigator decisions, and evidence-backed verification for advancement, pause, pivot, termination, licensing, and partnership.", "high"),

  define("business.objective-decompose", "Objective decomposition", "Convert objectives into projects, milestones, owners, dependencies, and deadlines."),
  define("business.decision-log", "Decision intelligence", "Record recommendations, decisions, authorizations, executions, and verification separately."),
  define("business.sop-build", "SOP development", "Create and maintain operational procedures with owners and controls.", "moderate"),
  define("business.finance-scenario", "Financial scenarios", "Build reproducible revenue, expense, runway, pricing, and acquisition scenarios.", "moderate", ["analytics.compute"]),
  define("business.risk-map", "Business risk map", "Track incentives, bottlenecks, dependencies, and failure points."),
  define("business.weekly-report", "Operating report", "Produce a verified weekly operating report from approved data."),

  define("knowledge.extract", "Knowledge extraction", "Extract decisions, reasoning, changes, unknowns, evidence, and next actions."),
  define("knowledge.connect", "Concept connection", "Connect ideas across projects without collapsing project boundaries."),
  define("knowledge.timeline", "Project timeline", "Maintain a chronological, source-linked project history."),
  define("knowledge.gaps", "Knowledge-gap analysis", "Identify unresolved questions, missing evidence, and required learning."),
  define("knowledge.resume", "Exact-state resume", "Reconstruct the last verified state and next executable action."),
  define("knowledge.review-plan", "Review planning", "Generate daily and weekly review plans from approved knowledge."),

  define("support.classify", "Ticket classification", "Classify topic, urgency, customer impact, and risk."),
  define("support.retrieve-policy", "Policy retrieval", "Retrieve product and policy guidance with version and provenance.", "low", ["support.knowledge"]),
  define("support.troubleshoot", "Troubleshooting", "Generate a bounded diagnostic sequence and verify fit to the reported problem.", "moderate"),
  define("support.escalation", "Escalation routing", "Route billing, safety, legal, technical, and account exceptions to authorized humans.", "moderate"),
  define("support.product-feedback", "Product feedback", "Convert anonymized recurring support patterns into product evidence."),
  define("support.quality-score", "Support quality", "Score grounding, policy compliance, clarity, and likely resolution."),

  define("analytics.schema-inspect", "Schema inspection", "Inspect supplied schemas and identify relationships and quality risks.", "moderate", ["data.read"]),
  define("analytics.sql-draft", "Validated SQL", "Generate read-only SQL and validate it before execution.", "moderate", ["data.query"]),
  define("analytics.data-quality", "Data quality", "Detect missing, duplicated, invalid, and inconsistent data."),
  define("analytics.anomaly-detect", "Anomaly detection", "Detect unusual values and explain thresholds and assumptions."),
  define("analytics.metric-calculate", "Metric calculation", "Calculate governed metrics from explicit definitions.", "moderate", ["analytics.compute"]),
  define("analytics.forecast", "Forecasting", "Build forecasts with confidence ranges and backtesting requirements.", "moderate", ["analytics.compute"]),
  define("analytics.lineage", "Data lineage", "Trace every conclusion to source data and transformation steps."),

  define("infrastructure.inventory", "Service inventory", "Inventory machines, services, models, storage, and dependencies.", "moderate", ["infra.read"]),
  define("infrastructure.monitor", "Resource monitoring", "Monitor CPU, RAM, GPU, swap, disk, temperature, latency, and process health.", "moderate", ["infra.metrics"]),
  define("infrastructure.diagnose", "Incident diagnosis", "Generate evidence-ranked probable root causes and safe checks.", "moderate", ["infra.read"]),
  define("infrastructure.workload-route", "Workload routing", "Route jobs based on capability, health, memory pressure, and deadline.", "moderate"),
  define("infrastructure.backup-verify", "Backup verification", "Verify backup integrity and restoration readiness without destructive changes.", "moderate", ["infra.backup.read"]),
  define("infrastructure.patch-plan", "Patch planning", "Propose versioned patch and rollback plans.", "high"),
  define("infrastructure.incident-timeline", "Incident timeline", "Build an auditable incident sequence from logs and events."),

  define("content.research", "Content research", "Research topics while preserving source attribution.", "low", ["content.research"]),
  define("content.strategy", "Content strategy", "Develop audience, purpose, channel, and conversion strategy."),
  define("content.draft", "Content drafting", "Draft content under platform, voice, and evidence constraints."),
  define("content.repurpose", "Content repurposing", "Adapt an approved source idea across formats without unsupported additions."),
  define("content.fact-check", "Content fact checking", "Verify dates, numbers, quotations, and material claims.", "moderate", ["content.research"]),
  define("content.performance-analyze", "Performance analysis", "Analyze published content performance without confusing correlation and causation.", "moderate", ["analytics.compute"]),
  define("content.calendar", "Content calendar", "Build an approval-aware publishing schedule."),
];

export const capabilityRegistry = new Map(definitions.map((definition) => [definition.id, definition]));

export const getCapability = (id: string): CapabilityDefinition => {
  const capability = capabilityRegistry.get(id);
  if (!capability) {
    throw new Error(`Unknown capability: ${id}`);
  }
  return capability;
};

export const listCapabilities = (): CapabilityDefinition[] => [...capabilityRegistry.values()];
