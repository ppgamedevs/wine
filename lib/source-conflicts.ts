import type { IntegrityIssue } from "@/lib/integrity-scan";
import type { ProducerExtractedFacts } from "@/lib/schema";
import { normalizeEditorialText } from "@/lib/wine-editorial-evidence";

export const SOURCE_CONFLICT_CODES = {
  SOURCE_CONFLICT_ALCOHOL: "SOURCE_CONFLICT_ALCOHOL",
  SOURCE_CONFLICT_GRAPES: "SOURCE_CONFLICT_GRAPES",
  SOURCE_CONFLICT_SWEETNESS: "SOURCE_CONFLICT_SWEETNESS",
  SOURCE_CONFLICT_VINTAGE: "SOURCE_CONFLICT_VINTAGE",
  SOURCE_CONFLICT_TYPE: "SOURCE_CONFLICT_TYPE",
} as const;

export interface StoredWineFacts {
  id: number;
  slug: string;
  alcohol?: number | null;
  sweetness?: string | null;
  vintage?: number | null;
  type?: string | null;
  grapeVarieties?: Array<string | { name: string }>;
}

function grapeNames(input: Array<string | { name: string }> | undefined): string[] {
  return (input ?? [])
    .map((entry) => (typeof entry === "string" ? entry : entry.name))
    .map((name) => normalizeEditorialText(name).trim())
    .filter(Boolean)
    .sort();
}

function typeKey(value: string | null | undefined): string {
  const normalized = normalizeEditorialText(value ?? "");
  if (normalized === "rosu") return "red";
  if (normalized === "alb") return "white";
  if (normalized === "roze") return "rose";
  if (normalized === "spumant") return "sparkling";
  if (normalized === "desert") return "dessert";
  return normalized;
}

export function detectSourceConflicts(
  stored: StoredWineFacts,
  extracted: ProducerExtractedFacts,
): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  if (
    stored.alcohol != null &&
    extracted.alcohol != null &&
    Math.abs(stored.alcohol - extracted.alcohol) > 0.3
  ) {
    const severe = Math.abs(stored.alcohol - extracted.alcohol) >= 1.5;
    issues.push({
      wineId: stored.id,
      slug: stored.slug,
      severity: severe ? "high" : "medium",
      code: SOURCE_CONFLICT_CODES.SOURCE_CONFLICT_ALCOHOL,
      message: `Alcool stocat ${stored.alcohol}% vs sursa producator ${extracted.alcohol}%.`,
      explanation: "Nu unim silentios valori incompatibile. Retailerul nu suprascrie producatorul.",
      blocksPublication: severe,
    });
  }

  if (
    stored.sweetness &&
    extracted.sweetness &&
    normalizeEditorialText(stored.sweetness) !==
      normalizeEditorialText(extracted.sweetness)
  ) {
    issues.push({
      wineId: stored.id,
      slug: stored.slug,
      severity: "high",
      code: SOURCE_CONFLICT_CODES.SOURCE_CONFLICT_SWEETNESS,
      message: `Dulceata stocata "${stored.sweetness}" vs sursa "${extracted.sweetness}".`,
      explanation: "Conflict de identitate. Pastreaza ambele valori pentru revizuire.",
      blocksPublication: true,
    });
  }

  if (
    stored.vintage != null &&
    extracted.vintage != null &&
    stored.vintage !== extracted.vintage
  ) {
    issues.push({
      wineId: stored.id,
      slug: stored.slug,
      severity: "high",
      code: SOURCE_CONFLICT_CODES.SOURCE_CONFLICT_VINTAGE,
      message: `Vintage stocat ${stored.vintage} vs sursa ${extracted.vintage}.`,
      explanation: "Vintage-ul este identitate. Conflictul necesita revizuire umana.",
      blocksPublication: true,
    });
  }

  if (stored.type && extracted.type && typeKey(stored.type) !== typeKey(extracted.type)) {
    issues.push({
      wineId: stored.id,
      slug: stored.slug,
      severity: "high",
      code: SOURCE_CONFLICT_CODES.SOURCE_CONFLICT_TYPE,
      message: `Tip stocat "${stored.type}" vs sursa "${extracted.type}".`,
      explanation: "Conflict de culoare/tip. Nu se uneste automat.",
      blocksPublication: true,
    });
  }

  if ((extracted.grapes?.length ?? 0) > 0 && (stored.grapeVarieties?.length ?? 0) > 0) {
    const storedGrapes = grapeNames(stored.grapeVarieties);
    const extractedGrapes = grapeNames(extracted.grapes);
    const missing = extractedGrapes.filter((grape) => !storedGrapes.includes(grape));
    const extra = storedGrapes.filter((grape) => !extractedGrapes.includes(grape));
    if (missing.length > 0 || extra.length > 0) {
      issues.push({
        wineId: stored.id,
        slug: stored.slug,
        severity: "high",
        code: SOURCE_CONFLICT_CODES.SOURCE_CONFLICT_GRAPES,
        message: `Soiuri stocate [${storedGrapes.join(", ")}] vs sursa [${extractedGrapes.join(", ")}].`,
        explanation: "Compozitia de soiuri nu se uneste silentios cand sursele difer.",
        blocksPublication: true,
      });
    }
  }

  return issues;
}
