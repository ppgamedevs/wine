/**
 * Taxonomie mica de mancare pentru pairing romanesc.
 * Folosita de Food Versatility, dish match, Occasion Match si /vin-pentru.
 * Nu este o ontologie completa: doar categorii necesare catalogului actual.
 */

export const FOOD_CATEGORY_IDS = [
  "sarmale",
  "grilled_meat",
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
      "gratar",
      "carne la gratar",
      "mici",
      "mititei",
      "barbecue",
      "bbq",
      "burger",
      "tochitura",
    ],
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
    synonyms: ["legume", "salata", "vegetarian", "ciuperci", "legume la gratar"],
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

/**
 * Mapeaza un text liber (dish, nota producator, query) la categorii distincte.
 * Aliasurile aceleiasi categorii (mici / mititei / carne la gratar) se unifica.
 */
export function categorizeFoodText(text: string): FoodCategoryId[] {
  const normalized = normalizeFoodToken(text);
  if (!normalized) return [];

  const matched = new Set<FoodCategoryId>();
  for (const category of FOOD_CATEGORIES) {
    for (const synonym of category.synonyms) {
      const token = normalizeFoodToken(synonym);
      if (!token) continue;
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const bounded = new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`);
      if (normalized === token || bounded.test(normalized)) {
        matched.add(category.id);
        break;
      }
    }
  }
  return [...matched];
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
