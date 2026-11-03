/**
 * PersonalMatch v0 (internal, shadow only).
 *
 * Purpose: separate "good value" from "good for THIS request". A Value Score of
 * 79 is not automatically a better match than 74.
 *
 * Rules:
 * - Canonical Value Score / Gift / Food scores are never recomputed or changed.
 * - Only attributes that exist in the catalog are scored. A missing attribute
 *   yields `null` plus an explicit unknown, never a neutral 50.
 * - No external AI call per wine. Jev only shapes the request, not the wines.
 * - The result is explainable: every component carries its own detail.
 */
import { scoreWineForDish } from "@/lib/recommendation/dish-match";
import { clamp, roundScore } from "@/lib/scoring-v2/math";
import type { FoodPairing, ProducerPageContent } from "@/lib/schema";

export const PERSONAL_MATCH_VERSION = "personal-match-v0";

export interface PersonalMatchPreferences {
  color?: "any" | "red" | "white" | "rose" | "sparkling";
  sweetness?: "any" | "sec" | "demisec" | "demidulce" | "dulce";
  acidity?: "low" | "medium" | "high" | null;
  body?: "light" | "medium" | "full" | null;
  style?: "fresh" | "fruity" | "mineral" | "creamy" | "tannic" | "complex" | null;
  dish?: string | null;
  excludedColors?: string[];
  excludedSweetness?: string[];
}

export interface PersonalMatchWine {
  slug: string;
  type: string;
  sweetness: string | null;
  acidity: number | null;
  alcohol?: number | null;
  beginnerFriendly?: boolean | null;
  foodPairings?: FoodPairing[] | null;
  producerContent?: ProducerPageContent | null;
  sweetnessTrust?: "verified" | "catalog_only" | "conflicting" | "unknown";
}

export interface PersonalMatchComponent {
  key: string;
  label: string;
  weight: number;
  score: number | null;
  detail: string;
}

export interface PersonalMatchResult {
  version: typeof PERSONAL_MATCH_VERSION;
  /** 0..100 compatibility, or null when nothing is known. */
  compatibility: number | null;
  confidence: number;
  components: PersonalMatchComponent[];
  /** Attributes the catalog does not store; never presented as facts. */
  unknowns: string[];
  reasons: string[];
}

type WeightedPart = PersonalMatchComponent;

function normalizeSweetness(value: string | null): string | null {
  if (!value) return null;
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Coarse acidity bands. Documented here because a band is an interpretation of
 * a stored number, not a new fact: the detail always shows the stored value.
 */
function acidityBand(value: number): "low" | "medium" | "high" {
  if (value <= 5.5) return "low";
  if (value >= 7) return "high";
  return "medium";
}

const ACIDITY_SCORE: Record<"low" | "medium" | "high", Record<string, number>> = {
  low: { low: 88, medium: 62, high: 36 },
  medium: { low: 62, medium: 80, high: 62 },
  high: { low: 36, medium: 62, high: 88 },
};

/**
 * Evaluate how well one wine matches a structured request.
 * The function is pure and cheap: it is safe to run for every candidate.
 */
export function computePersonalMatch(
  wine: PersonalMatchWine,
  preferences: PersonalMatchPreferences,
): PersonalMatchResult {
  const parts: WeightedPart[] = [];
  const unknowns: string[] = [];
  const reasons: string[] = [];

  const color = preferences.color ?? "any";
  if (color !== "any") {
    const excluded = new Set(preferences.excludedColors ?? []);
    const isExcluded = excluded.has(color);
    const matches = wine.type === color && !isExcluded;
    parts.push({
      key: "color",
      label: "Culoare ceruta",
      weight: 0.25,
      score: isExcluded ? 0 : matches ? 100 : 20,
      detail: isExcluded
        ? "Culoarea ceruta este explicit exclusa."
        : matches
          ? `Tipul stocat (${wine.type}) corespunde cererii.`
          : `Tipul stocat (${wine.type}) nu corespunde cererii.`,
    });
    if (matches) reasons.push("Culoarea ceruta corespunde tipului stocat.");
  }

  const sweetness = preferences.sweetness ?? "any";
  const storedSweetness = normalizeSweetness(wine.sweetness);
  if (sweetness !== "any") {
    const excluded = new Set(preferences.excludedSweetness ?? []);
    if (!storedSweetness) {
      unknowns.push("sweetness_not_stored");
    } else if (excluded.has(storedSweetness)) {
      parts.push({
        key: "sweetness",
        label: "Dulceata",
        weight: 0.2,
        score: 0,
        detail: "Dulceata stocata este explicit exclusa.",
      });
    } else {
      const matches = storedSweetness === sweetness;
      parts.push({
        key: "sweetness",
        label: "Dulceata",
        weight: 0.2,
        score: matches ? 100 : 30,
        detail: matches
          ? `Dulceata stocata (${wine.sweetness}) corespunde cererii.`
          : `Dulceata stocata (${wine.sweetness}) difera de cerere.`,
      });
    }
  }

  if (preferences.acidity) {
    if (wine.acidity == null) {
      unknowns.push("acidity_not_stored");
    } else {
      const band = acidityBand(wine.acidity);
      parts.push({
        key: "acidity",
        label: "Aciditate",
        weight: 0.15,
        score: ACIDITY_SCORE[preferences.acidity]?.[band] ?? null,
        detail: `Aciditate stocata ${wine.acidity} g/L, interpretata ca ${band}.`,
      });
    }
  }

  if (preferences.body) {
    // No body field exists in the catalog. Alcohol is not body.
    unknowns.push("body_not_stored");
  }

  if (preferences.style) {
    // No verified style field exists; tasteProfile is editorial prose, not a fact.
    unknowns.push("style_not_stored");
  }

  if (preferences.dish) {
    const dish = scoreWineForDish(
      {
        type: wine.type,
        sweetness: wine.sweetness,
        acidity: wine.acidity,
        foodPairings: wine.foodPairings,
        producerContent: wine.producerContent,
        sweetnessTrust: wine.sweetnessTrust,
      },
      preferences.dish,
    );
    if (dish.confidence < 40) {
      unknowns.push("food_pairing_low_confidence");
    }
    parts.push({
      key: "food",
      label: "Potrivire fel",
      weight: 0.35,
      score: dish.score,
      detail: dish.reasons[0] ?? "Potrivire culinara estimata.",
    });
  }

  if (unknowns.length > 0) {
    // Missing data lowers confidence but never fabricates a component.
    reasons.push(
      `Date lipsa: ${unknowns.join(", ")}. Nu sunt transformate in afirmatii.`,
    );
  }

  const known = parts.filter((part) => part.score != null && part.weight > 0);
  if (known.length === 0) {
    return {
      version: PERSONAL_MATCH_VERSION,
      compatibility: null,
      confidence: 0,
      components: parts,
      unknowns,
      reasons,
    };
  }

  const weightSum = known.reduce((sum, part) => sum + part.weight, 0);
  const raw = known.reduce(
    (sum, part) => sum + (part.score ?? 0) * part.weight,
    0,
  ) / weightSum;

  const coverage = weightSum;
  const confidence = roundScore(
    clamp(
      coverage * 70 + known.length * 6 - unknowns.length * 8,
      8,
      92,
    ),
  );

  return {
    version: PERSONAL_MATCH_VERSION,
    compatibility: roundScore(clamp(raw, 0, 100)),
    confidence,
    components: parts,
    unknowns,
    reasons,
  };
}

/** Diagnostic delta used in shadow mode; never persisted, never displayed. */
export function compareWithCanonicalMatch(
  personal: PersonalMatchResult,
  occasionScore: number,
): { delta: number | null; direction: "up" | "down" | "same" | "unknown" } {
  if (personal.compatibility == null) {
    return { delta: null, direction: "unknown" };
  }
  const delta = personal.compatibility - occasionScore;
  if (Math.abs(delta) < 2) return { delta: roundScore(delta), direction: "same" };
  return {
    delta: roundScore(delta),
    direction: delta > 0 ? "up" : "down",
  };
}
