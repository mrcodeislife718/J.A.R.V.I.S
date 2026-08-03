import type { PkmAuthorship, PkmEvidenceState, PkmItemKind } from "./types.js";

export interface ExtractedKnowledge {
  kind: PkmItemKind;
  title: string;
  body: string;
  authorship: PkmAuthorship;
  evidenceState: PkmEvidenceState;
  confidence: number;
  sourceStart: number;
  sourceEnd: number;
}

const LABELS: Array<{
  pattern: RegExp;
  kind: PkmItemKind;
  evidenceState: PkmEvidenceState;
}> = [
  { pattern: /^(?:decision|decided)\s*:/iu, kind: "decision", evidenceState: "observed" },
  { pattern: /^(?:why|rationale|reason)\s*:/iu, kind: "rationale", evidenceState: "observed" },
  { pattern: /^(?:correction|corrected)\s*:/iu, kind: "correction", evidenceState: "observed" },
  { pattern: /^(?:rule|standing rule|always)\s*:/iu, kind: "standing-rule", evidenceState: "observed" },
  { pattern: /^(?:question|open question|unresolved)\s*:/iu, kind: "unresolved-question", evidenceState: "unknown" },
  { pattern: /^(?:next|next action|action|todo)\s*:/iu, kind: "next-action", evidenceState: "observed" },
  { pattern: /^(?:evidence|source)\s*:/iu, kind: "evidence", evidenceState: "sourced" },
  { pattern: /^(?:assumption|assume)\s*:/iu, kind: "assumption", evidenceState: "assumed" },
  { pattern: /^(?:contradiction|conflict)\s*:/iu, kind: "contradiction", evidenceState: "disputed" },
  { pattern: /^(?:state|project state|status)\s*:/iu, kind: "project-state", evidenceState: "observed" },
  { pattern: /^(?:concept|idea)\s*:/iu, kind: "concept", evidenceState: "observed" },
];

const titleFor = (kind: PkmItemKind, body: string): string => {
  const compact = body.replace(/\s+/gu, " ").trim();
  const prefix = kind
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return compact.length <= 72 ? `${prefix}: ${compact}` : `${prefix}: ${compact.slice(0, 69)}…`;
};

export class LabeledKnowledgeExtractor {
  extract(content: string, authorship: PkmAuthorship): ExtractedKnowledge[] {
    const results: ExtractedKnowledge[] = [];
    let cursor = 0;

    for (const rawLine of content.split(/\r?\n/u)) {
      const lineStart = cursor;
      const lineEnd = lineStart + rawLine.length;
      cursor = lineEnd + 1;
      const line = rawLine.trim();
      if (line.length === 0) continue;

      const rule = LABELS.find((candidate) => candidate.pattern.test(line));
      if (!rule) continue;
      const body = line.replace(rule.pattern, "").trim();
      if (body.length === 0) continue;

      results.push({
        kind: rule.kind,
        title: titleFor(rule.kind, body),
        body,
        authorship,
        evidenceState: rule.evidenceState,
        confidence: 1,
        sourceStart: lineStart,
        sourceEnd: lineEnd,
      });
    }

    return results;
  }
}
