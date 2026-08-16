/**
 * Previous template generator. Kept only for OLD vs NEW comparison.
 */
import {
  hasSafeProducerEvidenceForCategory,
} from "@/lib/curated-evidence";
import { categorizeFoodText, type FoodCategoryId } from "@/lib/food-taxonomy";
import { editorialDishForCategory, wineEvidenceContext } from "@/lib/pairing-curation";
import type { PairingDraft } from "@/lib/pairing-curation-types";
import type { FoodPairingStrength } from "@/lib/schema";
import type { WineWithRelations } from "@/types";

export function generateLegacyPairingDrafts(wine: WineWithRelations): PairingDraft[] {
  const type = wine.type;
  const sweet = wine.sweetness ?? "sec";
  const drafts: PairingDraft[] = [];
  const push = (
    dish: string,
    category: FoodCategoryId,
    rationale: string,
    strength: FoodPairingStrength = "good",
  ) => {
    drafts.push({
      dish,
      category,
      rationale,
      basis: ["verified_style", "editorial_judgment"],
      confidence: "MEDIUM",
      strength,
      styleOnlyWarning: true,
      provenanceLocked: true,
    });
  };

  if (type === "red" && (sweet === "sec" || sweet === "demisec")) {
    push("Sarmale", "sarmale", "legacy");
    push("Mici", "grilled_meat", "legacy");
    push("Branzeturi maturate", "cheese", "legacy");
  } else if (type === "red") {
    push("Branzeturi maturate", "cheese", "legacy");
    push("Desert cu ciocolata", "chocolate", "legacy");
  }
  if (type === "white" && sweet === "sec") {
    push("Peste alb", "fish", "legacy");
    push("Fructe de mare", "fish", "legacy");
    push("Branzeturi proaspete", "cheese", "legacy");
  } else if (type === "white" && (sweet === "demisec" || sweet === "demidulce")) {
    push("Aperitive", "vegetable", "legacy");
    push("Peste alb", "fish", "legacy");
  } else if (type === "white" && sweet === "dulce") {
    push("Desert cu fructe", "dessert", "legacy");
    push("Cozonac", "dessert", "legacy");
  }
  if (type === "rose") {
    push("Aperitive", "vegetable", "legacy");
    push("Salate", "vegetable", "legacy");
    push("Peste alb", "fish", "legacy");
  }
  if (type === "sparkling") {
    push("Aperitive", "vegetable", "legacy");
    push("Fructe de mare", "fish", "legacy");
  }
  if (type === "dessert" || type === "orange") {
    push("Branzeturi maturate", "cheese", "legacy");
  }
  if (wine.alcohol != null && wine.alcohol >= 14 && type === "red") {
    push("Ceafa de porc", "pork", "legacy");
  }

  const context = wineEvidenceContext(wine);
  const fromProducer: PairingDraft[] = [];
  const seen = new Set<FoodCategoryId>();
  for (const claim of wine.producerContent?.foodEvidence ?? []) {
    const category = claim.category as FoodCategoryId;
    if (seen.has(category)) continue;
    if (!hasSafeProducerEvidenceForCategory(context, category)) continue;
    seen.add(category);
    fromProducer.push({
      dish: editorialDishForCategory(category),
      category,
      rationale: "legacy-producer",
      basis: ["producer_evidence"],
      confidence: "HIGH",
      strength: "good",
      styleOnlyWarning: false,
      provenanceLocked: true,
    });
  }
  if (fromProducer.length === 0) {
    for (const category of categorizeFoodText(context.producerCulinary ?? "")) {
      if (seen.has(category)) continue;
      if (!hasSafeProducerEvidenceForCategory(context, category)) continue;
      seen.add(category);
      fromProducer.push({
        dish: editorialDishForCategory(category),
        category,
        rationale: "legacy-producer",
        basis: ["producer_evidence"],
        confidence: "HIGH",
        strength: "good",
        styleOnlyWarning: false,
        provenanceLocked: true,
      });
    }
  }

  const merged: PairingDraft[] = [];
  const used = new Set<FoodCategoryId>();
  for (const draft of [...fromProducer, ...drafts]) {
    if (used.has(draft.category)) continue;
    used.add(draft.category);
    merged.push(draft);
    if (merged.length >= 5) break;
  }
  return merged.slice(0, 5);
}
