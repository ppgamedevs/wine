import {
  looksLikeInferredCellarPotential,
  sanitizeExpertNotesForDownstream,
  TRUTH_ISSUE_CODES,
  validateEditorialClaims,
} from "@/lib/editorial-claim-validator";
import type { WineScanInput } from "@/lib/integrity-scan";
import { normalizeEditorialText } from "@/lib/wine-editorial-evidence";

export type SensoryCategory =
  | "definitely_contradictory"
  | "unsupported_wine_specific"
  | "likely_generic"
  | "source_evidence_found"
  | "ambiguous";

export interface SensoryIssueBreakdown {
  total: number;
  byCategory: Record<SensoryCategory, number>;
  examples: Array<{ slug: string; category: SensoryCategory; message: string }>;
}

export interface CellarAudit {
  cellarPotential2: number;
  cellarPotential4: number;
  cellarPotentialOther: number;
  cellarPotentialNull: number;
  withDrinkWindow: number;
  algorithmicLooks: number;
  explicitAgeingEvidence: number;
  unknownProvenance: number;
}

export interface ExpertNotesAudit {
  winesWithNotes: number;
  sectionsStored: number;
  sectionsSurviving: number;
  notesEntirelyEmptyAfterFilter: number;
  unsupportedCategories: Record<string, number>;
}

export function classifySensoryIssue(input: {
  type: string;
  message: string;
  editorialText: string;
  hasSourceDescriptor: boolean;
}): SensoryCategory {
  if (input.hasSourceDescriptor) return "source_evidence_found";

  const contradictory =
    /fructe rosii|fructe negre|tanin/i.test(input.message) &&
    /white|alb|rose|roze|sparkling|spumant/i.test(input.type);
  if (contradictory) return "definitely_contradictory";

  const text = normalizeEditorialText(input.editorialText);
  if (
    /\bin general\b|\bde regula\b|\bde obicei\b|\btipic pentru\b|\bvinurile (albe|rosii|roze|spumante)\b/.test(
      text,
    )
  ) {
    return "likely_generic";
  }

  if (/\bacest vin\b|\bvinul are\b|\barome de\b|\bnote de\b/.test(text)) {
    return "unsupported_wine_specific";
  }

  return "ambiguous";
}

export function auditSensoryIssues(
  wines: WineScanInput[],
): SensoryIssueBreakdown {
  const byCategory: Record<SensoryCategory, number> = {
    definitely_contradictory: 0,
    unsupported_wine_specific: 0,
    likely_generic: 0,
    source_evidence_found: 0,
    ambiguous: 0,
  };
  const examples: SensoryIssueBreakdown["examples"] = [];
  let total = 0;

  for (const wine of wines) {
    const claims = validateEditorialClaims(
      {
        descriptionEditorial: wine.descriptionEditorial,
        valueExplanation: wine.valueExplanation,
        tasteProfile: wine.tasteProfile,
        thingsYouShouldKnow: wine.thingsYouShouldKnow,
        foodPairingNotes: wine.foodPairingNotes,
        dessertPairings: wine.dessertPairings,
        recommendedOccasions: wine.recommendedOccasions,
        expertNotes: wine.expertNotes,
        foodPairings: wine.foodPairings,
      },
      {
        type: wine.type,
        sweetness: wine.sweetness,
        grapeVarieties: wine.grapeVarieties,
        tastingNotes: wine.tastingNotes,
        producerContent: wine.producerContent,
        producerPageUrl: wine.producerPageUrl,
        tastingSheetUrl: wine.tastingSheetUrl,
        alcohol: wine.alcohol,
        acidity: wine.acidity,
        sugar: wine.sugar,
      },
    );

    for (const claim of claims) {
      if (claim.code !== TRUTH_ISSUE_CODES.UNSUPPORTED_SENSORY_CLAIM) continue;
      total += 1;
      const category = classifySensoryIssue({
        type: wine.type,
        message: claim.message,
        editorialText: `${wine.descriptionEditorial ?? ""} ${wine.tasteProfile ?? ""}`,
        hasSourceDescriptor: Boolean(
          wine.producerContent?.facts?.descriptors?.length ||
            wine.tastingNotes?.trim(),
        ),
      });
      byCategory[category] += 1;
      if (examples.length < 12) {
        examples.push({ slug: wine.slug, category, message: claim.message });
      }
    }
  }

  return { total, byCategory, examples };
}

export function auditCellarProvenance(wines: WineScanInput[]): CellarAudit {
  const audit: CellarAudit = {
    cellarPotential2: 0,
    cellarPotential4: 0,
    cellarPotentialOther: 0,
    cellarPotentialNull: 0,
    withDrinkWindow: 0,
    algorithmicLooks: 0,
    explicitAgeingEvidence: 0,
    unknownProvenance: 0,
  };

  for (const wine of wines) {
    if (wine.cellarPotential == null) audit.cellarPotentialNull += 1;
    else if (wine.cellarPotential === 2) audit.cellarPotential2 += 1;
    else if (wine.cellarPotential === 4) audit.cellarPotential4 += 1;
    else audit.cellarPotentialOther += 1;

    if (wine.drinkabilityStart != null || wine.drinkabilityEnd != null) {
      audit.withDrinkWindow += 1;
    }

    const explicit =
      wine.producerContent?.facts?.cellarPotentialYears != null ||
      wine.producerContent?.facts?.drinkabilityStart != null ||
      Boolean(wine.producerContent?.viticulture?.match(/ani.{0,20}(invechire|pivnita)/i));
    if (explicit) audit.explicitAgeingEvidence += 1;

    if (
      looksLikeInferredCellarPotential({
        type: wine.type,
        price: wine.currentPrice ?? wine.priceAvg,
        cellarPotential: wine.cellarPotential,
        drinkabilityStart: wine.drinkabilityStart,
        drinkabilityEnd: wine.drinkabilityEnd,
      })
    ) {
      audit.algorithmicLooks += 1;
    } else if (wine.cellarPotential != null && !explicit) {
      audit.unknownProvenance += 1;
    }
  }

  return audit;
}

export function auditExpertNotes(wines: WineScanInput[]): ExpertNotesAudit {
  const unsupportedCategories: Record<string, number> = {};
  let winesWithNotes = 0;
  let sectionsStored = 0;
  let sectionsSurviving = 0;
  let notesEntirelyEmptyAfterFilter = 0;

  for (const wine of wines) {
    const notes = wine.expertNotes;
    if (!notes) continue;
    winesWithNotes += 1;

    const storedFields = [
      notes.history,
      notes.terroirSecrets,
      notes.vintageQuirks,
      notes.pairingScience,
      notes.commonMistakes,
      notes.agingPotential,
      notes.valueInsight,
      ...(notes.thingsYouShouldKnow ?? []),
    ].filter((value) => Boolean(value?.trim()));
    sectionsStored += storedFields.length;

    const filtered = sanitizeExpertNotesForDownstream(notes, {
      type: wine.type,
      sweetness: wine.sweetness,
      grapeVarieties: wine.grapeVarieties,
      tastingNotes: wine.tastingNotes,
      producerContent: wine.producerContent,
      producerPageUrl: wine.producerPageUrl,
      tastingSheetUrl: wine.tastingSheetUrl,
    });

    if (!filtered) {
      notesEntirelyEmptyAfterFilter += 1;
    } else {
      const surviving = [
        filtered.history,
        filtered.terroirSecrets,
        filtered.vintageQuirks,
        filtered.pairingScience,
        filtered.commonMistakes,
        filtered.agingPotential,
        filtered.valueInsight,
        ...filtered.thingsYouShouldKnow,
      ].filter((value) => Boolean(value?.trim()));
      sectionsSurviving += surviving.length;
    }

    const claims = validateEditorialClaims({ expertNotes: notes }, {
      type: wine.type,
      sweetness: wine.sweetness,
      grapeVarieties: wine.grapeVarieties,
      tastingNotes: wine.tastingNotes,
      producerContent: wine.producerContent,
    });
    for (const claim of claims) {
      unsupportedCategories[claim.code] =
        (unsupportedCategories[claim.code] ?? 0) + 1;
    }
  }

  return {
    winesWithNotes,
    sectionsStored,
    sectionsSurviving,
    notesEntirelyEmptyAfterFilter,
    unsupportedCategories,
  };
}

export function foodPairingsProvenanceNote(): string {
  return [
    "foodPairings sunt seed/curated in catalog, nu sunt scrise de analyze sau import.",
    "Nu au provenienta de evaluare per sticla. Nu le promovam silentios la evidenta verificata.",
    "foodPairingNotes raman explicatii editoriale si se curata separat, claim cu claim.",
  ].join(" ");
}
