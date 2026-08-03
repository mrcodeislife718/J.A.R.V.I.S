import { getCapability } from "../capabilities/registry.js";
import { getDomainManifest } from "../domains/registry.js";
import type { MissionRequest, RiskAssessment, RiskLevel } from "./types.js";

const riskWeight: Record<RiskLevel, number> = {
  low: 10,
  moderate: 30,
  high: 65,
  critical: 90,
};

const domainPatterns: Record<MissionRequest["domain"], Array<{ pattern: RegExp; score: number; reason: string; prohibited?: boolean }>> = {
  "biomedical-research": [
    { pattern: /\b(dose|dosing|dosage|self[- ]administer|inject into (a )?human)\b/i, score: 95, reason: "Human dosing or administration request", prohibited: true },
    { pattern: /\b(order|purchase).{0,30}\b(reagent|pathogen|viral vector|toxin)\b/i, score: 95, reason: "Autonomous biological ordering request", prohibited: true },
    { pattern: /\b(engineer|increase|enhance).{0,25}\b(virulence|transmission|pathogenicity)\b/i, score: 100, reason: "Pathogen enhancement request", prohibited: true },
    { pattern: /\b(synthesi[sz]e|wet[- ]lab|animal study|human trial|clinical use)\b/i, score: 80, reason: "Experimental or translational biological action" },
    { pattern: /\b(hypothesis|experimental design|nanoparticle|gene editing|crispr)\b/i, score: 55, reason: "Advanced biomedical research planning" },
  ],
  "business-operations": [
    { pattern: /\b(send|transfer|wire|pay).{0,25}\b(money|funds|payment)\b/i, score: 85, reason: "Financial commitment" },
    { pattern: /\b(sign|accept|execute).{0,25}\b(contract|agreement|offer)\b/i, score: 85, reason: "Contractual commitment" },
    { pattern: /\b(hire|fire|terminate employment)\b/i, score: 75, reason: "Personnel decision" },
  ],
  "personal-knowledge": [
    { pattern: /\b(delete|forget|erase).{0,25}\b(memory|history|project)\b/i, score: 75, reason: "Permanent knowledge mutation" },
    { pattern: /\bshare|transfer|expose\b.{0,25}\b(private|confidential|personal)\b/i, score: 85, reason: "Potential private-data transfer" },
  ],
  "customer-support": [
    { pattern: /\b(refund|credit|chargeback|change account|reset credentials)\b/i, score: 80, reason: "Customer account or financial mutation" },
    { pattern: /\b(legal admission|admit liability|safety incident)\b/i, score: 85, reason: "Legal or safety escalation" },
  ],
  analytics: [
    { pattern: /\b(drop|truncate|delete from|update).{0,30}\b(production|customer|database|table)\b/i, score: 95, reason: "Potential destructive production query" },
    { pattern: /\b(export|download|send).{0,30}\b(customer|private|confidential)\b/i, score: 85, reason: "Sensitive data export" },
  ],
  "infrastructure-administration": [
    { pattern: /\b(rm -rf|wipe|format disk|delete backup)\b/i, score: 100, reason: "Destructive infrastructure operation" },
    { pattern: /\b(firewall|rotate credentials|production deploy|shutdown|reboot)\b/i, score: 85, reason: "Consequential infrastructure mutation" },
    { pattern: /\b(restart|patch|upgrade|rollback)\b/i, score: 70, reason: "Infrastructure state change" },
  ],
  "content-production": [
    { pattern: /\b(publish|post|send newsletter|launch campaign)\b/i, score: 75, reason: "External publication action" },
    { pattern: /\b(use confidential|leak|expose private)\b/i, score: 95, reason: "Potential confidential-data disclosure", prohibited: true },
  ],
};

const toLevel = (score: number): RiskLevel => {
  if (score >= 85) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "moderate";
  return "low";
};

export const assessRisk = (request: MissionRequest): RiskAssessment => {
  const manifest = getDomainManifest(request.domain);
  const capabilityScores = request.requestedCapabilities.map((id) => riskWeight[getCapability(id).risk]);
  let score = capabilityScores.length > 0 ? Math.max(...capabilityScores) : 10;
  const reasons: string[] = [];
  let prohibited = false;

  for (const rule of domainPatterns[request.domain]) {
    if (rule.pattern.test(request.objective)) {
      score = Math.max(score, rule.score);
      reasons.push(rule.reason);
      prohibited = prohibited || rule.prohibited === true;
    }
  }

  const sideEffecting = request.requestedCapabilities.some((id) => getCapability(id).sideEffecting);
  if (request.constraints.allowSideEffects === true || sideEffecting) {
    score = Math.max(score, 65);
    reasons.push("Mission permits or requests side effects");
  }

  const objective = request.objective.toLowerCase();
  for (const denied of manifest.deniedActions) {
    if (objective.includes(denied.toLowerCase())) {
      prohibited = true;
      score = 100;
      reasons.push(`Domain policy denies: ${denied}`);
    }
  }

  if (reasons.length === 0) {
    reasons.push("No elevated-risk trigger detected");
  }

  const level = toLevel(score);
  return {
    level,
    score,
    reasons,
    requiresHumanAuthorization: level === "high" || level === "critical" || sideEffecting,
    prohibited,
  };
};
