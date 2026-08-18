/**
 * Source-scoped technical resolution for future imports.
 * Extract each source, then reconcile field-level claims.
 */
import { classifySourceUrl, type WineSourceType } from "@/lib/source-trust";
import {
  extractTechSpecsFromPage,
  type WineTechSpecs,
} from "@/lib/wine-tech-specs";
import {
  extractClaimsFromSource,
  verifyAiNumericCandidate,
} from "@/lib/tech-facts/claims";
import type { ProductIdentity } from "@/lib/tech-facts/identity";
import { reconcileField, safeAutomaticValue } from "@/lib/tech-facts/reconcile";
import type { FieldRecoveryResult, TechFactClaim } from "@/lib/tech-facts/types";

export interface ScopedTechSource {
  text: string;
  url: string | null;
  sourceType?: WineSourceType;
  documentTitle?: string | null;
  filename?: string | null;
  sourceWineName?: string | null;
  isPdf?: boolean;
}

export interface ResolveTechFromSourcesInput {
  wine: ProductIdentity;
  sources: ScopedTechSource[];
  ai?: Partial<WineTechSpecs>;
  isNonVintageWine?: boolean;
}

export interface ResolvedTechFromSources {
  specs: WineTechSpecs;
  evidence: TechFactClaim[];
  fields: FieldRecoveryResult[];
}

function sourceTypeOf(source: ScopedTechSource): WineSourceType {
  return source.sourceType ?? classifySourceUrl(source.url, { isPdf: source.isPdf });
}

export function extractClaimsFromSources(
  wine: ProductIdentity,
  sources: ScopedTechSource[],
  ai?: Partial<WineTechSpecs>,
): TechFactClaim[] {
  const claims: TechFactClaim[] = [];
  for (const source of sources) {
    const type = sourceTypeOf(source);
    const extracted = extractClaimsFromSource({
      text: source.text,
      url: source.url,
      sourceType: type,
      wine,
      sourceWineName: source.sourceWineName,
      documentTitle: source.documentTitle,
      filename: source.filename,
    });
    claims.push(...extracted);

    if (!ai) continue;
    for (const field of ["alcohol", "acidity", "sugar"] as const) {
      const value = ai[field];
      if (value == null) continue;
      const label =
        field === "alcohol" ? "alcool" : field === "acidity" ? "aciditate" : "zahar";
      const verified = verifyAiNumericCandidate({
        field,
        value,
        unit: field === "alcohol" ? "% vol" : "g/L",
        sourceText: source.text,
        label,
      });
      if (!verified.accepted) continue;
      const already = extracted.some(
        (claim) => claim.field === field && claim.value === value,
      );
      if (already) continue;
      claims.push(
        ...extractClaimsFromSource({
          text: `${label} ${value}${field === "alcohol" ? "% vol" : " g/L"}`,
          url: source.url,
          sourceType: type,
          wine,
          sourceWineName: source.sourceWineName,
          documentTitle: source.documentTitle,
          filename: source.filename,
          extractionMethod: "constrained_llm",
        }),
      );
    }
  }
  return claims;
}

export function resolveTechSpecsFromSources(
  input: ResolveTechFromSourcesInput,
): ResolvedTechFromSources {
  const wineHasVintage = input.wine.vintage != null;
  const isNonVintageWine = input.isNonVintageWine === true || input.wine.vintage == null;
  const evidence = extractClaimsFromSources(input.wine, input.sources, input.ai);

  const fields = (["alcohol", "acidity", "sugar", "sweetness"] as const).map((field) =>
    reconcileField({
      field,
      stored: null,
      claims: evidence,
      wineHasVintage,
      isNonVintageWine,
    }),
  );

  const alcohol = safeAutomaticValue(fields[0]!);
  const acidity = safeAutomaticValue(fields[1]!);
  const sugar = safeAutomaticValue(fields[2]!);
  const sweetness = safeAutomaticValue(fields[3]!);

  return {
    specs: {
      alcohol: typeof alcohol === "number" ? alcohol : null,
      acidity: typeof acidity === "number" ? acidity : null,
      sugar: typeof sugar === "number" ? sugar : null,
      sweetness:
        sweetness === "sec" ||
        sweetness === "demisec" ||
        sweetness === "demidulce" ||
        sweetness === "dulce"
          ? sweetness
          : null,
    },
    evidence,
    fields,
  };
}

/** Single-source helper used by legacy callers. AI cannot invent a number. */
export function resolveVerifiedSingleSourceSpecs(input: {
  wineName: string;
  pageText: string;
  ai?: Partial<WineTechSpecs>;
}): WineTechSpecs {
  const fromPage = extractTechSpecsFromPage(input.wineName, input.pageText);
  const alcohol =
    fromPage.alcohol ??
    (input.ai?.alcohol != null &&
    verifyAiNumericCandidate({
      field: "alcohol",
      value: input.ai.alcohol,
      unit: "% vol",
      sourceText: input.pageText,
      label: "alcool",
    }).accepted
      ? input.ai.alcohol
      : null);
  const sugar =
    fromPage.sugar ??
    (input.ai?.sugar != null &&
    verifyAiNumericCandidate({
      field: "sugar",
      value: input.ai.sugar,
      unit: "g/L",
      sourceText: input.pageText,
      label: "zahar",
    }).accepted
      ? input.ai.sugar
      : null);
  const acidity =
    fromPage.acidity ??
    (input.ai?.acidity != null &&
    verifyAiNumericCandidate({
      field: "acidity",
      value: input.ai.acidity,
      unit: "g/L",
      sourceText: input.pageText,
      label: "aciditate",
    }).accepted
      ? input.ai.acidity
      : null);

  return {
    sweetness: fromPage.sweetness ?? input.ai?.sweetness ?? null,
    alcohol,
    sugar,
    acidity,
  };
}
