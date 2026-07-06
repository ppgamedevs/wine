import type { WineWithRelations } from "@/types";

/** Deserturi romanesti frecvente pentru matching in somelier si scoruri. */
export const ROMANIAN_DESSERT_KEYWORDS = [
  "cozonac",
  "pasca",
  "gogosi",
  "placinta",
  "clatite",
  "papanași",
  "papanasi",
  "coliva",
  "prajitura",
  "prajituri",
  "cascaval pane",
  "branza dulce",
  "magiun",
  "dulceata",
  "turta dulce",
  "cornulete",
  "sarmale cu nuci",
  "desert",
] as const;

/** Soiuri cu afinitate naturala pentru deserturi romanesti. */
export const DESSERT_AFFINITY_GRAPE_KEYWORDS = [
  "tamaioasa",
  "muscat",
  "busuioaca",
  "grasa",
  "feteasca regala",
  "riesling",
  "pinot gris",
  "pinot grigio",
  "traminer",
  "gewurz",
] as const;

export function normalizePairingToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function hasDessertAffinityGrapes(grapeVarieties: string[] | undefined): boolean {
  if (!grapeVarieties?.length) return false;
  const joined = grapeVarieties.map(normalizePairingToken).join(" ");
  return DESSERT_AFFINITY_GRAPE_KEYWORDS.some((keyword) => joined.includes(keyword));
}

export function isSweetnessDessertFriendly(sweetness: string | null | undefined): boolean {
  if (!sweetness) return false;
  return sweetness === "dulce" || sweetness === "demidulce" || sweetness === "demisec";
}

/** Text combinat pentru keyword matching (somelier, embeddings). */
export function collectSommelierPairingText(wine: WineWithRelations): string {
  const parts: string[] = [];

  for (const pairing of wine.foodPairings) {
    parts.push(pairing.dish, pairing.note ?? "");
  }
  for (const pairing of wine.foodPairingNotes) {
    parts.push(pairing.dish, pairing.note);
  }
  for (const pairing of wine.dessertPairings) {
    parts.push(pairing.dish, pairing.note);
  }

  return normalizePairingToken(parts.join(" "));
}

export function countDessertKeywordMatches(text: string): number {
  return ROMANIAN_DESSERT_KEYWORDS.filter((keyword) =>
    text.includes(normalizePairingToken(keyword)),
  ).length;
}

/** Boost 0-3 pe scala 1-10 pentru calculateInitialScores. */
export function dessertFoodMatchBoost(input: {
  category: string;
  sweetness?: string | null;
  grapeVarieties?: string[];
  dessertPairingCount?: number;
}): number {
  const cat = normalizePairingToken(input.category);
  let boost = 0;

  if (cat === "desert" || cat === "dulce" || cat === "dessert") boost += 2;
  if (isSweetnessDessertFriendly(input.sweetness)) boost += 1;
  if (hasDessertAffinityGrapes(input.grapeVarieties)) boost += 1;
  if ((input.dessertPairingCount ?? 0) > 0) boost += 1;

  return Math.min(3, boost);
}
