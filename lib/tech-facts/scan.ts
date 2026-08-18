/**
 * Integrity issues for technical facts. Extends the existing scanner.
 */
import type { IntegrityIssue, WineScanInput } from "@/lib/integrity-scan";
import { classifySourceUrl } from "@/lib/source-trust";
import { extractClaimsFromSource } from "@/lib/tech-facts/claims";
import { reconcileField } from "@/lib/tech-facts/reconcile";
import {
  TECH_CONFLICT_CODES,
  type TechFactField,
} from "@/lib/tech-facts/types";

export const TECH_INTEGRITY_CODES = [
  TECH_CONFLICT_CODES.TECH_ALCOHOL_CONFLICT,
  TECH_CONFLICT_CODES.TECH_ACIDITY_CONFLICT,
  TECH_CONFLICT_CODES.TECH_SUGAR_CONFLICT,
  TECH_CONFLICT_CODES.TECH_SWEETNESS_CONFLICT,
  TECH_CONFLICT_CODES.TECH_VINTAGE_SOURCE_MISMATCH,
  TECH_CONFLICT_CODES.TECH_PRODUCT_IDENTITY_MISMATCH,
  TECH_CONFLICT_CODES.TECH_UNIT_AMBIGUOUS,
  TECH_CONFLICT_CODES.TECH_WRONG_PDF_DOCUMENT,
  TECH_CONFLICT_CODES.TECH_EXISTING_VALUE_UNSOURCED,
  TECH_CONFLICT_CODES.TECH_FIELD_PROVENANCE_MISSING,
  TECH_CONFLICT_CODES.TECH_SOURCE_STALE_OR_UNDATED,
  TECH_CONFLICT_CODES.TECH_VALUE_OUT_OF_RANGE,
] as const;

function outlier(field: "alcohol" | "acidity" | "sugar", value: number | null | undefined): boolean {
  if (value == null) return false;
  if (field === "alcohol") return value < 8 || value > 18;
  if (field === "acidity") return value < 2 || value > 12;
  return value < 0 || value > 250;
}

export function detectTechnicalFactIssues(input: WineScanInput[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  for (const wine of input) {
    const sourceText = [
      wine.producerContent?.tastingNotes ?? "",
      wine.tastingNotes ?? "",
    ]
      .filter(Boolean)
      .join("\n");
    const sourceUrl =
      wine.tastingSheetUrl ??
      wine.producerPageUrl ??
      wine.producerContent?.sourceUrls?.[0] ??
      null;
    const claims = sourceText
      ? extractClaimsFromSource({
          text: sourceText,
          url: sourceUrl,
          sourceType: classifySourceUrl(sourceUrl, {
            isPdf: Boolean(wine.tastingSheetUrl),
          }),
          wine: {
            wineName: wine.name,
            wineryName: wine.wineryName,
            vintage: wine.vintage,
            type: wine.type,
            grapes: wine.grapeVarieties.map((grape) => grape.name),
          },
        })
      : [];
    const persistedEvidence = new Set(wine.evidenceFields ?? []);

    const facts = wine.producerContent?.facts;
    if (facts?.alcohol != null) {
      claims.push(
        ...extractClaimsFromSource({
          text: `Alcool ${facts.alcohol}% vol`,
          url: sourceUrl,
          sourceType: classifySourceUrl(sourceUrl),
          wine: {
            wineName: wine.name,
            vintage: wine.vintage,
            type: wine.type,
          },
        }),
      );
    }

    for (const field of ["alcohol", "acidity", "sugar", "sweetness"] as const) {
      const stored =
        field === "sweetness" ? wine.sweetness ?? null : wine[field] ?? null;
      const result = reconcileField({
        field,
        stored,
        claims,
        wineHasVintage: wine.vintage != null,
        isNonVintageWine: wine.vintage == null,
      });
      const interesting =
        result.candidateClass === "SOURCE_CONFLICT" ||
        result.storedClass === "OFFICIAL_CONFLICT" ||
        result.candidateClass === "UNIT_AMBIGUOUS" ||
        result.candidateClass === "DIFFERENT_VINTAGE" ||
        result.candidateClass === "PRODUCT_CONFLICT" ||
        (field !== "sweetness" &&
          result.conflictCode === TECH_CONFLICT_CODES.TECH_EXISTING_VALUE_UNSOURCED &&
          stored != null);
      if (
        interesting &&
        result.conflictCode &&
        !(
          result.conflictCode ===
            TECH_CONFLICT_CODES.TECH_EXISTING_VALUE_UNSOURCED &&
          persistedEvidence.has(field as TechFactField)
        )
      ) {
        const blocking =
          result.candidateClass === "SOURCE_CONFLICT" ||
          result.storedClass === "OFFICIAL_CONFLICT";
        issues.push({
          wineId: wine.id,
          slug: wine.slug,
          severity: blocking ? "high" : "medium",
          code: result.conflictCode,
          message: `${field}: ${result.storedClass} / ${result.candidateClass}`,
          explanation: result.claims[0]?.excerpt,
          blocksPublication: blocking,
        });
      }
    }

    if (outlier("alcohol", wine.alcohol)) {
      issues.push({
        wineId: wine.id,
        slug: wine.slug,
        severity: "high",
        code: TECH_CONFLICT_CODES.TECH_VALUE_OUT_OF_RANGE,
        message: `Alcool stocat ${wine.alcohol} este in afara intervalului 8-18% vol.`,
        blocksPublication: false,
      });
    }
    if (outlier("acidity", wine.acidity)) {
      issues.push({
        wineId: wine.id,
        slug: wine.slug,
        severity: "medium",
        code: TECH_CONFLICT_CODES.TECH_VALUE_OUT_OF_RANGE,
        message: `Aciditate stocata ${wine.acidity} este suspecta pentru aciditate totala g/L.`,
        blocksPublication: false,
      });
    }

    const hasOfficial = Boolean(
      wine.producerPageUrl ||
        wine.tastingSheetUrl ||
        persistedEvidence.size > 0,
    );
    if (!hasOfficial && (wine.alcohol != null || wine.acidity != null || wine.sugar != null)) {
      issues.push({
        wineId: wine.id,
        slug: wine.slug,
        severity: "low",
        code: TECH_CONFLICT_CODES.TECH_FIELD_PROVENANCE_MISSING,
        message: "Valori tehnice stocate fara URL oficial de producator.",
        blocksPublication: false,
      });
    }
  }

  return issues;
}
