/**
 * Dish-level producer provenance. Category boost is not exact attribution.
 */
import {
  hasSafeProducerEvidenceForCategory,
  type PairingEvidenceContext,
} from "@/lib/curated-evidence";
import { categorizeFoodText, type FoodCategoryId } from "@/lib/food-taxonomy";
import { findRomanianDishByName, foldDishName } from "@/lib/pairing/romanian-dishes";
import type {
  PairingDraft,
  ProducerProvenanceClass,
} from "@/lib/pairing-curation-types";
import type { FoodPairingBasis } from "@/lib/schema";

export type { ProducerProvenanceClass };

export const RELATED_PRODUCER_NOTICE =
  "Producatorul recomanda o categorie apropiata, dar nu acest preparat exact. Salvarea se va face ca Recomandare VinIntel.";

const BROAD_PRODUCER_TERMS = new Set([
  "pasare",
  "pui",
  "rata",
  "curcan",
  "iepure",
  "vanat",
  "peste",
  "peste alb",
  "fructe de mare",
  "seafood",
  "carne",
  "carne alba",
  "carne rosie",
  "carne de pasare",
  "porc",
  "vita",
  "miel",
  "oaie",
  "branza",
  "branzeturi",
  "branzeturi maturate",
  "branzeturi proaspete",
  "desert",
  "aperitive",
  "legume",
  "salate",
  "salata",
  "paste",
  "pizza",
  "gratar",
  "poultry",
  "fish",
  "cheese",
  "vegetable",
  "dessert",
]);

function isBroadProducerTerm(value: string): boolean {
  return BROAD_PRODUCER_TERMS.has(foldDishName(value));
}

function dishMatchNames(dish: string): string[] {
  const names = [dish];
  const library = findRomanianDishByName(dish);
  if (library) {
    names.push(library.name, ...library.aliases);
  }
  return [...new Set(names.map(foldDishName).filter((name) => name && !isBroadProducerTerm(name)))];
}

function mentionTokens(value: string): string[] {
  return foldDishName(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !isBroadProducerTerm(token));
}

export function isExactOrNearExactProducerMention(
  mentioned: string,
  dish: string,
): boolean {
  const foldedMention = foldDishName(mentioned);
  if (!foldedMention || isBroadProducerTerm(foldedMention)) return false;
  const names = dishMatchNames(dish);
  if (names.includes(foldedMention)) return true;
  const mentionWords = mentionTokens(foldedMention);
  if (mentionWords.length < 2) return false;
  return names.some((name) => {
    const dishWords = mentionTokens(name);
    if (dishWords.length === 0) return false;
    return (
      mentionWords.every((word) => dishWords.includes(word)) ||
      dishWords.every((word) => mentionWords.includes(word))
    );
  });
}

function collectProducerMentions(context: PairingEvidenceContext): string[] {
  const mentions: string[] = [];
  for (const claim of context.foodEvidence ?? []) {
    if (
      claim.evidenceClass !== "PRODUCER_EXACT" &&
      claim.evidenceClass !== "TASTING_SHEET"
    ) {
      continue;
    }
    if (claim.dish.trim()) mentions.push(claim.dish);
    for (const part of (claim.excerpt || "").split(/[,;.]+/)) {
      if (part.trim()) mentions.push(part);
    }
  }
  for (const part of (context.producerCulinary ?? "").split(/[,;.]+/)) {
    if (part.trim()) mentions.push(part);
  }
  return [...new Set(mentions.map((item) => item.trim()).filter(Boolean))];
}

export function classifyProducerProvenance(
  context: PairingEvidenceContext,
  dish: string,
  category: FoodCategoryId,
): ProducerProvenanceClass {
  const mentions = collectProducerMentions(context);
  const exact = mentions.some((mention) =>
    isExactOrNearExactProducerMention(mention, dish),
  );
  if (exact) return "EXACT_PRODUCER";
  if (hasSafeProducerEvidenceForCategory(context, category)) {
    return "RELATED_PRODUCER_CATEGORY";
  }
  const relatedByMention = mentions.some((mention) =>
    categorizeFoodText(mention).includes(category),
  );
  if (relatedByMention) return "RELATED_PRODUCER_CATEGORY";
  return "STYLE_ONLY";
}

export function hasExactOrNearExactProducerEvidence(
  context: PairingEvidenceContext,
  dish: string,
  category: FoodCategoryId,
): boolean {
  return classifyProducerProvenance(context, dish, category) === "EXACT_PRODUCER";
}

function withEditorialStyleBasis(basis: FoodPairingBasis[]): FoodPairingBasis[] {
  const next = basis.filter((item) => item !== "producer_evidence");
  if (!next.includes("verified_style")) next.push("verified_style");
  if (!next.includes("editorial_judgment")) next.push("editorial_judgment");
  return [...new Set(next)];
}

export function applyProducerProvenanceToDraft(
  draft: PairingDraft,
  provenance: ProducerProvenanceClass,
): PairingDraft {
  if (provenance === "EXACT_PRODUCER") {
    const basis: FoodPairingBasis[] = ["producer_evidence", ...draft.basis];
    return {
      ...draft,
      basis: [...new Set(basis)],
      provenanceLocked: true,
      producerProvenanceClass: provenance,
    };
  }
  return {
    ...draft,
    basis: withEditorialStyleBasis(draft.basis),
    provenanceLocked: false,
    producerProvenanceClass: provenance,
  };
}

export function resolveDraftProducerProvenance(
  draft: PairingDraft,
  context: PairingEvidenceContext,
): PairingDraft {
  const provenance = classifyProducerProvenance(
    context,
    draft.dish,
    draft.category,
  );
  return applyProducerProvenanceToDraft(draft, provenance);
}
