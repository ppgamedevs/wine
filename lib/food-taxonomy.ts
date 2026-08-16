/**
 * Taxonomie mica de mancare pentru pairing romanesc.
 * Folosita de Food Versatility, dish match, Occasion Match si /vin-pentru.
 * Nu este o ontologie completa: doar categorii necesare catalogului actual.
 */

export const FOOD_CATEGORY_IDS = [
  "sarmale",
  "grilled_meat",
  "grilled_fish",
  "grilled_vegetable",
  "pork",
  "beef",
  "poultry",
  "fish",
  "cheese",
  "pasta",
  "pizza",
  "vegetable",
  "dessert",
  "chocolate",
  "festive_traditional",
] as const;

export type FoodCategoryId = (typeof FOOD_CATEGORY_IDS)[number];

export interface FoodCategoryDefinition {
  id: FoodCategoryId;
  label: string;
  /** Tokenuri normalizate (fara diacritice) care mapeaza la aceasta categorie. */
  synonyms: string[];
}

export const FOOD_CATEGORIES: FoodCategoryDefinition[] = [
  {
    id: "sarmale",
    label: "Sarmale",
    synonyms: ["sarmale", "sarma", "varza umpluta", "sarmalute"],
  },
  {
    id: "grilled_meat",
    label: "Carne la gratar",
    synonyms: [
      "carne la gratar",
      "carne rosie la gratar",
      "vita la gratar",
      "mici",
      "mititei",
      "barbecue",
      "bbq",
      "burger",
      "tochitura",
      "gratar",
    ],
  },
  {
    id: "grilled_fish",
    label: "Peste la gratar",
    synonyms: [
      "peste la gratar",
      "peste grill",
      "fructe de mare la gratar",
      "somon la gratar",
      "creveti la gratar",
      "creveti",
      "calcan",
    ],
  },
  {
    id: "grilled_vegetable",
    label: "Legume la gratar",
    synonyms: ["legume la gratar", "legume grill", "salata la gratar"],
  },
  {
    id: "pork",
    label: "Porc",
    synonyms: ["porc", "ceafa", "cotlet", "friptura de porc", "ceafa de porc"],
  },
  {
    id: "beef",
    label: "Vita",
    synonyms: ["vita", "vita", "steak", "antricot", "vita la gratar"],
  },
  {
    id: "poultry",
    label: "Pasare",
    synonyms: ["pui", "rata", "curcan", "pasare", "pui la cuptor"],
  },
  {
    id: "fish",
    label: "Peste",
    synonyms: ["peste", "somon", "scrumbie", "fructe de mare", "marinare"],
  },
  {
    id: "cheese",
    label: "Branza",
    synonyms: ["branza", "cascaval", "telemea", "branza matura"],
  },
  {
    id: "pasta",
    label: "Paste",
    synonyms: ["paste", "spaghetti", "lasagna", "tagliatelle"],
  },
  {
    id: "pizza",
    label: "Pizza",
    synonyms: ["pizza"],
  },
  {
    id: "vegetable",
    label: "Legume",
    synonyms: ["legume", "salata", "vegetarian", "ciuperci"],
  },
  {
    id: "dessert",
    label: "Desert",
    synonyms: [
      "desert",
      "prajitura",
      "prajituri",
      "cozonac",
      "pasca",
      "clatite",
      "gogosi",
      "placinta",
      "papanasi",
      "coliva",
      "dulceata",
    ],
  },
  {
    id: "chocolate",
    label: "Ciocolata",
    synonyms: ["ciocolata", "chocolate"],
  },
  {
    id: "festive_traditional",
    label: "Masa festiva",
    synonyms: [
      "masa festiva",
      "sarbatori",
      "craciun",
      "friptura",
      "masa traditionala",
    ],
  },
];

const CATEGORY_BY_ID = new Map(
  FOOD_CATEGORIES.map((category) => [category.id, category]),
);

export function normalizeFoodToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findBoundedIndexes(haystack: string, needle: string): number[] {
  const indexes: number[] = [];
  let from = 0;
  while (from <= haystack.length) {
    const idx = haystack.indexOf(needle, from);
    if (idx < 0) break;
    const before = idx === 0 || haystack[idx - 1] === " ";
    const afterEnd = idx + needle.length;
    const after = afterEnd === haystack.length || haystack[afterEnd] === " ";
    if (before && after) indexes.push(idx);
    from = idx + 1;
  }
  return indexes;
}

/**
 * Mapeaza un text liber (dish, nota producator, query) la categorii distincte.
 * Aliasurile aceleiasi categorii (mici / mititei / carne la gratar) se unifica.
 * Frazele lungi au prioritate: "peste la gratar" nu e si "peste" si "gratar".
 */
export function categorizeFoodText(text: string): FoodCategoryId[] {
  const normalized = normalizeFoodToken(text);
  if (!normalized) return [];

  const hits: Array<{
    category: FoodCategoryId;
    start: number;
    end: number;
    length: number;
  }> = [];

  for (const category of FOOD_CATEGORIES) {
    for (const synonym of category.synonyms) {
      const token = normalizeFoodToken(synonym);
      if (!token) continue;
      for (const start of findBoundedIndexes(normalized, token)) {
        hits.push({
          category: category.id,
          start,
          end: start + token.length,
          length: token.length,
        });
      }
    }
  }

  hits.sort((left, right) => right.length - left.length || left.start - right.start);
  const accepted: typeof hits = [];
  for (const hit of hits) {
    const overlaps = accepted.some(
      (other) => hit.start < other.end && hit.end > other.start,
    );
    if (!overlaps) accepted.push(hit);
  }

  return [...new Set(accepted.map((hit) => hit.category))];
}

export function isGrillCategory(id: FoodCategoryId): boolean {
  return id === "grilled_meat" || id === "grilled_fish" || id === "grilled_vegetable";
}

export function categorizeFoodItems(items: string[]): FoodCategoryId[] {
  const matched = new Set<FoodCategoryId>();
  for (const item of items) {
    for (const category of categorizeFoodText(item)) {
      matched.add(category);
    }
  }
  return [...matched];
}

export function foodCategoryLabel(id: FoodCategoryId): string {
  return CATEGORY_BY_ID.get(id)?.label ?? id;
}

export function isDessertCategory(id: FoodCategoryId): boolean {
  return id === "dessert" || id === "chocolate";
}
