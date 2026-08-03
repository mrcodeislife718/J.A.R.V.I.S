import type { AnalyticsSqlValidation } from "./types.js";

const PROHIBITED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(insert|update|delete|merge|upsert)\b/iu, reason: "Data modification statements are not allowed" },
  { pattern: /\b(create|alter|drop|truncate|comment|rename)\b/iu, reason: "Schema modification statements are not allowed" },
  { pattern: /\b(grant|revoke|set\s+role|reset\s+role)\b/iu, reason: "Privilege changes are not allowed" },
  { pattern: /\b(copy|vacuum|analyze|cluster|reindex|refresh\s+materialized)\b/iu, reason: "Administrative statements are not allowed" },
  { pattern: /\b(call|do|execute|prepare|deallocate|listen|notify|unlisten)\b/iu, reason: "Procedural or session-control statements are not allowed" },
  { pattern: /\bselect\b[\s\S]*\binto\b/iu, reason: "SELECT INTO is not allowed" },
  { pattern: /\bfor\s+(update|share|no\s+key\s+update|key\s+share)\b/iu, reason: "Row-locking clauses are not allowed" },
  { pattern: /\b(pg_sleep|pg_terminate_backend|pg_cancel_backend|lo_import|lo_export|dblink|dblink_exec)\s*\(/iu, reason: "Dangerous database functions are not allowed" },
  { pattern: /\b(current_setting|set_config)\s*\([^)]*(password|secret|token|key)/iu, reason: "Secret or configuration extraction is not allowed" },
];

const dollarQuoteAt = (sql: string, index: number): string | null => {
  if (sql[index] !== "$") return null;
  const match = sql.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/u);
  return match?.[0] ?? null;
};

const maskNonCode = (sql: string): string => {
  let output = "";
  let index = 0;
  while (index < sql.length) {
    const character = sql[index] ?? "";
    const next = sql[index + 1] ?? "";

    if (character === "-" && next === "-") {
      output += "  ";
      index += 2;
      while (index < sql.length && sql[index] !== "\n") {
        output += " ";
        index += 1;
      }
      continue;
    }

    if (character === "/" && next === "*") {
      output += "  ";
      index += 2;
      let depth = 1;
      while (index < sql.length && depth > 0) {
        const current = sql[index] ?? "";
        const following = sql[index + 1] ?? "";
        if (current === "/" && following === "*") {
          depth += 1;
          output += "  ";
          index += 2;
        } else if (current === "*" && following === "/") {
          depth -= 1;
          output += "  ";
          index += 2;
        } else {
          output += current === "\n" ? "\n" : " ";
          index += 1;
        }
      }
      continue;
    }

    if (character === "'") {
      output += " ";
      index += 1;
      while (index < sql.length) {
        const current = sql[index] ?? "";
        if (current === "'" && sql[index + 1] === "'") {
          output += "  ";
          index += 2;
          continue;
        }
        output += current === "\n" ? "\n" : " ";
        index += 1;
        if (current === "'") break;
      }
      continue;
    }

    if (character === '"') {
      output += '"';
      index += 1;
      while (index < sql.length) {
        const current = sql[index] ?? "";
        output += current === "\n" ? "\n" : current === '"' ? '"' : "x";
        index += 1;
        if (current === '"' && sql[index] === '"') {
          output += '"';
          index += 1;
          continue;
        }
        if (current === '"') break;
      }
      continue;
    }

    const tag = dollarQuoteAt(sql, index);
    if (tag) {
      output += " ".repeat(tag.length);
      index += tag.length;
      const closing = sql.indexOf(tag, index);
      const end = closing === -1 ? sql.length : closing + tag.length;
      while (index < end) {
        output += sql[index] === "\n" ? "\n" : " ";
        index += 1;
      }
      continue;
    }

    output += character;
    index += 1;
  }
  return output;
};

const normalize = (sql: string): string => sql.trim().replace(/;\s*$/u, "").replace(/\s+/gu, " ");

const relationNames = (maskedSql: string): string[] => {
  const found = new Set<string>();
  const expression = /\b(?:from|join)\s+((?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)(?:\.(?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*))?)/giu;
  for (const match of maskedSql.matchAll(expression)) {
    const value = match[1]?.trim();
    if (value && !value.startsWith("(")) found.add(value.replaceAll('"', ""));
  }
  return [...found].sort();
};

export class AnalyticsSqlValidator {
  validate(sql: string): AnalyticsSqlValidation {
    const trimmed = sql.trim();
    const rejectionReasons: string[] = [];
    const warnings: string[] = [];

    if (trimmed.length === 0) rejectionReasons.push("SQL is empty");
    if (trimmed.length > 100_000) rejectionReasons.push("SQL exceeds the 100,000 character limit");

    const masked = maskNonCode(trimmed);
    const semicolons = [...masked].filter((character) => character === ";").length;
    const withoutTrailing = masked.trim().replace(/;$/u, "");
    if (withoutTrailing.includes(";")) rejectionReasons.push("Multiple SQL statements are not allowed");
    if (semicolons > 1) rejectionReasons.push("Multiple SQL statements are not allowed");

    const normalizedSql = normalize(trimmed);
    const normalizedMasked = normalize(masked);
    const statementType = /^(select|with)\b/iu.test(normalizedMasked) ? "select" as const : "unknown" as const;
    if (statementType !== "select") rejectionReasons.push("Only SELECT or read-only WITH queries are allowed");

    for (const prohibited of PROHIBITED_PATTERNS) {
      if (prohibited.pattern.test(normalizedMasked)) rejectionReasons.push(prohibited.reason);
    }

    if (/\bselect\s+\*/iu.test(normalizedMasked)) warnings.push("SELECT * may retrieve unnecessary or sensitive columns");
    if (!/\blimit\s+\d+/iu.test(normalizedMasked)) warnings.push("Query has no explicit LIMIT; the executor must enforce maxRows");
    if (!/\border\s+by\b/iu.test(normalizedMasked)) warnings.push("Result ordering is not deterministic unless ORDER BY is supplied");
    if (/\bcross\s+join\b/iu.test(normalizedMasked)) warnings.push("CROSS JOIN may create a very large result set");

    const parameterIndexes = [...normalizedMasked.matchAll(/\$(\d+)\b/gu)]
      .map((match) => Number(match[1]))
      .filter((value) => Number.isInteger(value) && value > 0);

    return {
      accepted: rejectionReasons.length === 0,
      normalizedSql,
      statementType,
      referencedRelations: relationNames(normalizedMasked),
      parameterIndexes: [...new Set(parameterIndexes)].sort((a, b) => a - b),
      warnings: [...new Set(warnings)],
      rejectionReasons: [...new Set(rejectionReasons)],
    };
  }
}
