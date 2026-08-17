/**
 * Romanian-first pairing draft generator. Human approval still required.
 */
import {
  evidenceContextFromPairingFields,
  hasTechnicalSupportForCategory,
} from "@/lib/curated-evidence";
import { draftMatchesExistingPairing } from "@/lib/pairing-curation-match";
import type { PairingDraft } from "@/lib/pairing-curation-types";
import { scoreDishCompatibility } from "@/lib/pairing/dish-compatibility";
import { selectDiversePairings } from "@/lib/pairing/diversity-select";
import { pairingRationale } from "@/lib/pairing/pairing-rationale";
import {
  applyProducerProvenanceToDraft,
  classifyProducerProvenance,
} from "@/lib/pairing/producer-provenance";
import { goldenSpecificityPrior } from "@/lib/pairing/golden-curation-dataset";
import {
  findRomanianDishByName,
  ROMANIAN_DISHES,
  ROMANIAN_PAIRING_GENERATOR_VERSION,
} from "@/lib/pairing/romanian-dishes";
import { buildWinePairingProfile } from "@/lib/pairing/wine-pairing-profile";
import type { FoodPairingBasis, FoodPairingStrength } from "@/lib/schema";
import type { WineWithRelations } from "@/types";

export const INSUFFICIENT_PAIRING_DATA_MESSAGE =
  "Nu avem suficiente date pentru a propune patru asocieri bune.";

export { ROMANIAN_PAIRING_GENERATOR_VERSION };

export function generateRomanianPairingDrafts(
  wine: WineWithRelations,
): PairingDraft[] {
  const profile = buildWinePairingProfile(wine);
  const context = evidenceContextFromPairingFields({
    type: wine.type,
    sweetness: wine.sweetness,
    alcohol: wine.alcohol,
    acidity: wine.acidity,
    producerCulinaryPairings: wine.producerContent?.culinaryPairings,
    foodEvidence: wine.producerContent?.foodEvidence,
    culinaryLaundryRejected: wine.producerContent?.culinaryLaundryRejected,
    culinaryChromeRejected: wine.producerContent?.culinaryChromeRejected,
  });

  const ranked = ROMANIAN_DISHES.map((dish) =>
    scoreDishCompatibility(profile, dish),
  )
    .filter((row) => row.score > 0)
    .filter((row) => {
      if (
        draftMatchesExistingPairing(
          { dish: row.dish.name, category: row.dish.foodCategory },
          wine.foodPairings,
        )
      ) {
        return false;
      }
      return !wine.foodPairings.some((pairing) => {
        const existing = findRomanianDishByName(pairing.dish);
        return existing?.family === row.dish.family;
      });
    })
    .map((row) => {
      let score = row.score;
      if (row.exactProducer) score += 6;
      score += goldenSpecificityPrior(row.dish.id);
      if (
        (row.dish.family === "sour-soup" || row.dish.family === "smoked-soup") &&
        !row.exactProducer
      ) {
        score -= 8;
      }
      return { ...row, score };
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      const leftSpecific = left.dish.specificity ?? 2;
      const rightSpecific = right.dish.specificity ?? 2;
      if (rightSpecific !== leftSpecific) return rightSpecific - leftSpecific;
      return left.dish.id.localeCompare(right.dish.id);
    });

  const selected = selectDiversePairings(ranked, 4);
  const topScore = selected[0]?.score ?? 0;

  return selected.map((row, index) => {
    const basis: FoodPairingBasis[] = ["verified_style", "editorial_judgment"];
    if (
      profile.hasTechnicalFacts &&
      hasTechnicalSupportForCategory(context, row.dish.foodCategory)
    ) {
      basis.push("technical_data");
    }
    const provenance = classifyProducerProvenance(
      context,
      row.dish.name,
      row.dish.foodCategory,
    );
    const exactProducer = provenance === "EXACT_PRODUCER";

    let strength: FoodPairingStrength = "good";
    if (index === 0 && row.score >= topScore - 1 && row.score >= 58) {
      strength = "strong";
    } else if (row.score < 52) {
      strength = "possible";
    }

    let confidence: PairingDraft["confidence"] = "MEDIUM";
    if (exactProducer && profile.hasTechnicalFacts) confidence = "HIGH";
    else if (!profile.grapeNames.length && !profile.hasTechnicalFacts) {
      confidence = "LOW";
    }

    return applyProducerProvenanceToDraft(
      {
        dish: row.dish.name,
        category: row.dish.foodCategory,
        rationale: pairingRationale(profile, row.dish, exactProducer),
        basis,
        confidence,
        strength,
        styleOnlyWarning: !exactProducer && !profile.hasTechnicalFacts,
        provenanceLocked: exactProducer,
        dishId: row.dish.id,
        romanianDiscovery: row.dish.romanian && row.dish.discoveryValue >= 4,
        romanianRegion: row.dish.romanianRegion,
      },
      provenance,
    );
  });
}

export function scoreRomanianPairingLibrary(wine: WineWithRelations) {
  const profile = buildWinePairingProfile(wine);
  return ROMANIAN_DISHES.map((dish) => scoreDishCompatibility(profile, dish)).sort(
    (left, right) => right.score - left.score || left.dish.id.localeCompare(right.dish.id),
  );
}
