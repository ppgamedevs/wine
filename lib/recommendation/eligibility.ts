/**
 * Eligibilitate usoara pentru recomandari.
 * Nu scaneaza catalogul. Foloseste validatorii puri deja disponibili
 * pe datele vinului incarcat (fapte producator + text editorial).
 *
 * Conflictele de IDENTITATE (tip, dulceata, soi, vintage) nu pot produce
 * recomandari increzatoare. Problemele editoriale de stejar/tanin nu exclud.
 */
import {
  TRUTH_ISSUE_CODES,
  validateEditorialClaims,
} from "@/lib/editorial-claim-validator";
import {
  detectSourceConflicts,
  SOURCE_CONFLICT_CODES,
} from "@/lib/source-conflicts";
import type { RecommendationEligibility } from "@/lib/recommendation/types";
import type { ProducerPageContent } from "@/lib/schema";

const IDENTITY_SOURCE_CODES = new Set<string>([
  SOURCE_CONFLICT_CODES.SOURCE_CONFLICT_TYPE,
  SOURCE_CONFLICT_CODES.SOURCE_CONFLICT_SWEETNESS,
  SOURCE_CONFLICT_CODES.SOURCE_CONFLICT_GRAPES,
  SOURCE_CONFLICT_CODES.SOURCE_CONFLICT_VINTAGE,
]);

const IDENTITY_EDITORIAL_CODES = new Set<string>([
  TRUTH_ISSUE_CODES.TYPE_EDITORIAL_CONTRADICTION,
  TRUTH_ISSUE_CODES.SWEETNESS_EDITORIAL_CONTRADICTION,
]);

export interface EligibilityWine {
  id: number;
  slug: string;
  name?: string | null;
  type?: string | null;
  sweetness?: string | null;
  vintage?: number | null;
  alcohol?: number | null;
  grapeVarieties?: Array<string | { name: string }>;
  region?: { name?: string | null } | null;
  winery?: { name?: string | null } | null;
  tastingNotes?: string | null;
  producerContent?: ProducerPageContent | null;
  producerPageUrl?: string | null;
  tastingSheetUrl?: string | null;
  descriptionEditorial?: string | null;
  valueExplanation?: string | null;
  tasteProfile?: string | null;
  foodPairings?: { dish: string; note?: string }[] | null;
  medals?: unknown[] | null;
  acidity?: number | null;
  sugar?: number | null;
}

function sweetnessFromLabel(wine: EligibilityWine): string | null {
  const hay = `${wine.slug} ${wine.name ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/\bdemidulce\b/.test(hay)) return "demidulce";
  if (/\bdemisec\b/.test(hay)) return "demisec";
  if (/\b(extra brut|brut)\b/.test(hay)) return "sec";
  if (/\bdulce\b/.test(hay)) return "dulce";
  if (/\bsec\b/.test(hay)) return "sec";
  return null;
}

export function assessRecommendationEligibility(
  wine: EligibilityWine,
): RecommendationEligibility {
  const labelSweetness = sweetnessFromLabel(wine);
  const storedSweetness = wine.sweetness
    ? wine.sweetness
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
    : null;
  if (labelSweetness && storedSweetness && labelSweetness !== storedSweetness) {
    return "REVIEW_REQUIRED";
  }

  const facts = wine.producerContent?.facts;
  if (facts) {
    const conflicts = detectSourceConflicts(
      {
        id: wine.id,
        slug: wine.slug,
        alcohol: wine.alcohol,
        sweetness: wine.sweetness,
        vintage: wine.vintage,
        type: wine.type,
        grapeVarieties: wine.grapeVarieties,
      },
      facts,
    );
    if (conflicts.some((issue) => IDENTITY_SOURCE_CODES.has(issue.code))) {
      return "REVIEW_REQUIRED";
    }
  }

  const editorialIssues = validateEditorialClaims(
    {
      descriptionEditorial: wine.descriptionEditorial,
      valueExplanation: wine.valueExplanation,
      tasteProfile: wine.tasteProfile,
    },
    {
      type: wine.type ?? undefined,
      sweetness: wine.sweetness,
      grapeVarieties: (wine.grapeVarieties ?? []).map((entry) =>
        typeof entry === "string" ? entry : entry.name,
      ),
      regionName: wine.region?.name ?? null,
      wineryName: wine.winery?.name ?? null,
      vintage: wine.vintage,
      tastingNotes: wine.tastingNotes,
      producerContent: wine.producerContent,
      producerPageUrl: wine.producerPageUrl,
      tastingSheetUrl: wine.tastingSheetUrl,
      acidity: wine.acidity,
      sugar: wine.sugar,
      foodPairings: wine.foodPairings ?? [],
    },
  );

  if (editorialIssues.some((issue) => IDENTITY_EDITORIAL_CODES.has(issue.code))) {
    return "REVIEW_REQUIRED";
  }

  const identityComplete =
    Boolean(wine.type) &&
    Boolean(wine.sweetness) &&
    (wine.grapeVarieties?.length ?? 0) > 0 &&
    wine.vintage != null;

  if (!identityComplete) return "ELIGIBLE_LOW_CONFIDENCE";
  return "ELIGIBLE";
}
