/**
 * Editorial grape/style priors. Not bottle evidence.
 */
import { foldDishName } from "@/lib/pairing/romanian-dishes";

export type StyleLevel = 1 | 2 | 3 | 4 | 5;

export interface GrapeStyleProfile {
  id: string;
  names: string[];
  color: "red" | "white" | "rose" | "any";
  body: StyleLevel;
  structuralIntensity: StyleLevel;
  aromaticIntensity: StyleLevel;
  acidityTendency: StyleLevel;
  tanninTendency: StyleLevel;
  foodIntensity: StyleLevel;
  meatAffinity: StyleLevel;
  fishAffinity: StyleLevel;
  smokeAffinity: StyleLevel;
  creamyAffinity: StyleLevel;
  sweetAffinity: StyleLevel;
  spiceTolerance: StyleLevel;
  duckAffinity: StyleLevel;
  rabbitAffinity: StyleLevel;
  lambAffinity: StyleLevel;
  preferredFamilies?: string[];
}

export const GRAPE_PREFERRED_FAMILIES: Record<string, string[]> = {
  "feteasca-neagra": ["cabbage-roll", "duck", "rich-pork-stew", "cured-lamb"],
  "negru-de-dragasani": ["smoked-pork", "roast-beef", "roast-lamb", "aged-cheese"],
  "babeasca-neagra": ["duck", "rabbit", "cabbage-roll", "mushroom"],
  cadarca: ["rich-pork-stew", "cabbage-roll", "roast-lamb", "mountain-cheese"],
  "pinot-noir": ["duck", "rabbit", "mushroom", "chicken-rustic"],
  "cabernet-sauvignon": ["smoked-pork", "roast-beef", "roast-lamb", "rich-pork-stew"],
  "cabernet-franc": ["roast-lamb", "roast-beef", "rich-pork-stew", "cabbage-roll"],
  merlot: ["duck", "rich-pork-stew", "roast-beef", "mountain-cheese"],
  syrah: ["smoked-pork", "cured-lamb", "rich-pork-stew", "roast-lamb"],
  "feteasca-regala": ["trout", "cheese-pie", "chicken-cream", "fresh-cheese"],
  "feteasca-alba": ["trout", "fresh-cheese", "vegetable-spread", "chicken-sauce"],
  "tamaioasa-romaneasca": ["sweet-bread", "sweet-cheese", "fruit-pie", "cheese-pie"],
  busuioaca: ["sweet-cheese", "fruit-pie", "cheese-pie", "fresh-cheese"],
  "grasa-de-cotnari": ["sweet-bread", "fruit-pie", "chicken-cream", "cheese-pie"],
  sarba: ["delta-fish", "trout", "vegetable-spread", "fresh-cheese"],
  cramposie: ["delta-fish", "fried-fish", "roe", "vegetable-spread"],
  mustoasa: ["delta-fish", "fried-fish", "roe", "fresh-cheese"],
  "sauvignon-blanc": ["delta-fish", "roe", "fried-fish", "vegetable-spread"],
  chardonnay: ["chicken-cream", "baked-fish", "mountain-cheese", "chicken-sauce"],
  riesling: ["delta-fish", "trout", "vegetable-spread", "fresh-cheese"],
  "muscat-ottonel": ["sweet-bread", "fruit-dessert", "cheese-pie", "fresh-cheese"],
  traminer: ["cheese-pie", "chicken-cream", "fruit-pie", "vegetable-preserve"],
  "default-red": ["cabbage-roll", "rich-pork-stew", "duck", "aged-cheese"],
  "default-white": ["trout", "vegetable-spread", "chicken-cream", "fresh-cheese"],
  "default-orange": ["vegetable-preserve", "mushroom", "cabbage-roll", "bean-stew"],
  "default-rose": ["delta-fish", "chicken-rustic", "fresh-cheese", "vegetable-spread"],
  "default-sparkling": ["roe", "cheese-pie", "fried-fish", "starter"],
  "default-dessert": ["sweet-bread", "sweet-cheese", "fruit-pie", "fried-dessert"],
};

export function resolvePreferredFamilies(style: GrapeStyleProfile): string[] {
  if (style.preferredFamilies && style.preferredFamilies.length > 0) {
    return style.preferredFamilies;
  }
  return GRAPE_PREFERRED_FAMILIES[style.id] ?? [];
}

export const GRAPE_STYLE_PROFILES: GrapeStyleProfile[] = [
  {
    id: "feteasca-neagra",
    names: ["feteasca neagra", "fetească neagră"],
    color: "red",
    body: 4,
    structuralIntensity: 4,
    aromaticIntensity: 4,
    acidityTendency: 3,
    tanninTendency: 3,
    foodIntensity: 4,
    meatAffinity: 5,
    fishAffinity: 1,
    smokeAffinity: 3,
    creamyAffinity: 2,
    sweetAffinity: 2,
    spiceTolerance: 3,
    duckAffinity: 4,
    rabbitAffinity: 3,
    lambAffinity: 4,
  },
  {
    id: "negru-de-dragasani",
    names: ["negru de dragasani", "negru de drăgășani"],
    color: "red",
    body: 4,
    structuralIntensity: 4,
    aromaticIntensity: 3,
    acidityTendency: 3,
    tanninTendency: 4,
    foodIntensity: 4,
    meatAffinity: 5,
    fishAffinity: 1,
    smokeAffinity: 4,
    creamyAffinity: 2,
    sweetAffinity: 1,
    spiceTolerance: 3,
    duckAffinity: 3,
    rabbitAffinity: 2,
    lambAffinity: 4,
  },
  {
    id: "babeasca-neagra",
    names: ["babeasca neagra", "rara neagra", "rară neagră", "babească neagră"],
    color: "red",
    body: 3,
    structuralIntensity: 3,
    aromaticIntensity: 3,
    acidityTendency: 4,
    tanninTendency: 2,
    foodIntensity: 3,
    meatAffinity: 4,
    fishAffinity: 2,
    smokeAffinity: 2,
    creamyAffinity: 2,
    sweetAffinity: 2,
    spiceTolerance: 3,
    duckAffinity: 4,
    rabbitAffinity: 4,
    lambAffinity: 3,
  },
  {
    id: "cadarca",
    names: ["cadarca", "cadarcă"],
    color: "red",
    body: 3,
    structuralIntensity: 3,
    aromaticIntensity: 3,
    acidityTendency: 3,
    tanninTendency: 3,
    foodIntensity: 3,
    meatAffinity: 4,
    fishAffinity: 1,
    smokeAffinity: 3,
    creamyAffinity: 2,
    sweetAffinity: 2,
    spiceTolerance: 3,
    duckAffinity: 3,
    rabbitAffinity: 3,
    lambAffinity: 3,
  },
  {
    id: "pinot-noir",
    names: ["pinot noir"],
    color: "red",
    body: 2,
    structuralIntensity: 2,
    aromaticIntensity: 4,
    acidityTendency: 4,
    tanninTendency: 2,
    foodIntensity: 3,
    meatAffinity: 3,
    fishAffinity: 2,
    smokeAffinity: 1,
    creamyAffinity: 3,
    sweetAffinity: 2,
    spiceTolerance: 2,
    duckAffinity: 5,
    rabbitAffinity: 5,
    lambAffinity: 2,
  },
  {
    id: "cabernet-sauvignon",
    names: ["cabernet sauvignon"],
    color: "red",
    body: 5,
    structuralIntensity: 5,
    aromaticIntensity: 3,
    acidityTendency: 3,
    tanninTendency: 5,
    foodIntensity: 5,
    meatAffinity: 5,
    fishAffinity: 1,
    smokeAffinity: 4,
    creamyAffinity: 2,
    sweetAffinity: 1,
    spiceTolerance: 3,
    duckAffinity: 3,
    rabbitAffinity: 2,
    lambAffinity: 5,
  },
  {
    id: "cabernet-franc",
    names: ["cabernet franc"],
    color: "red",
    body: 4,
    structuralIntensity: 4,
    aromaticIntensity: 4,
    acidityTendency: 4,
    tanninTendency: 3,
    foodIntensity: 4,
    meatAffinity: 4,
    fishAffinity: 1,
    smokeAffinity: 3,
    creamyAffinity: 2,
    sweetAffinity: 1,
    spiceTolerance: 3,
    duckAffinity: 3,
    rabbitAffinity: 3,
    lambAffinity: 4,
  },
  {
    id: "merlot",
    names: ["merlot"],
    color: "red",
    body: 4,
    structuralIntensity: 3,
    aromaticIntensity: 3,
    acidityTendency: 3,
    tanninTendency: 3,
    foodIntensity: 4,
    meatAffinity: 4,
    fishAffinity: 1,
    smokeAffinity: 3,
    creamyAffinity: 3,
    sweetAffinity: 2,
    spiceTolerance: 3,
    duckAffinity: 4,
    rabbitAffinity: 3,
    lambAffinity: 3,
  },
  {
    id: "syrah",
    names: ["syrah", "shiraz"],
    color: "red",
    body: 4,
    structuralIntensity: 4,
    aromaticIntensity: 4,
    acidityTendency: 3,
    tanninTendency: 4,
    foodIntensity: 4,
    meatAffinity: 5,
    fishAffinity: 1,
    smokeAffinity: 5,
    creamyAffinity: 2,
    sweetAffinity: 1,
    spiceTolerance: 5,
    duckAffinity: 3,
    rabbitAffinity: 2,
    lambAffinity: 4,
  },
  {
    id: "feteasca-regala",
    names: ["feteasca regala", "fetească regală"],
    color: "white",
    body: 2,
    structuralIntensity: 2,
    aromaticIntensity: 3,
    acidityTendency: 4,
    tanninTendency: 1,
    foodIntensity: 2,
    meatAffinity: 2,
    fishAffinity: 4,
    smokeAffinity: 1,
    creamyAffinity: 3,
    sweetAffinity: 2,
    spiceTolerance: 2,
    duckAffinity: 1,
    rabbitAffinity: 2,
    lambAffinity: 1,
  },
  {
    id: "feteasca-alba",
    names: ["feteasca alba", "fetească albă"],
    color: "white",
    body: 2,
    structuralIntensity: 2,
    aromaticIntensity: 3,
    acidityTendency: 3,
    tanninTendency: 1,
    foodIntensity: 2,
    meatAffinity: 2,
    fishAffinity: 4,
    smokeAffinity: 1,
    creamyAffinity: 3,
    sweetAffinity: 3,
    spiceTolerance: 2,
    duckAffinity: 1,
    rabbitAffinity: 2,
    lambAffinity: 1,
  },
  {
    id: "tamaioasa-romaneasca",
    names: ["tamaioasa romaneasca", "tămâioasă românească", "tamaioasa"],
    color: "white",
    body: 3,
    structuralIntensity: 2,
    aromaticIntensity: 5,
    acidityTendency: 3,
    tanninTendency: 1,
    foodIntensity: 3,
    meatAffinity: 1,
    fishAffinity: 3,
    smokeAffinity: 1,
    creamyAffinity: 3,
    sweetAffinity: 5,
    spiceTolerance: 2,
    duckAffinity: 1,
    rabbitAffinity: 1,
    lambAffinity: 1,
  },
  {
    id: "busuioaca",
    names: ["busuioaca de bohotin", "busuioacă de bohotin", "busuioaca"],
    color: "rose",
    body: 3,
    structuralIntensity: 2,
    aromaticIntensity: 5,
    acidityTendency: 3,
    tanninTendency: 1,
    foodIntensity: 3,
    meatAffinity: 2,
    fishAffinity: 3,
    smokeAffinity: 1,
    creamyAffinity: 3,
    sweetAffinity: 5,
    spiceTolerance: 2,
    duckAffinity: 2,
    rabbitAffinity: 1,
    lambAffinity: 1,
  },
  {
    id: "grasa-de-cotnari",
    names: ["grasa de cotnari", "grasă de cotnari"],
    color: "white",
    body: 4,
    structuralIntensity: 3,
    aromaticIntensity: 4,
    acidityTendency: 3,
    tanninTendency: 1,
    foodIntensity: 3,
    meatAffinity: 1,
    fishAffinity: 3,
    smokeAffinity: 1,
    creamyAffinity: 4,
    sweetAffinity: 5,
    spiceTolerance: 2,
    duckAffinity: 1,
    rabbitAffinity: 1,
    lambAffinity: 1,
  },
  {
    id: "sarba",
    names: ["sarba", "șarbă"],
    color: "white",
    body: 2,
    structuralIntensity: 2,
    aromaticIntensity: 3,
    acidityTendency: 4,
    tanninTendency: 1,
    foodIntensity: 2,
    meatAffinity: 1,
    fishAffinity: 4,
    smokeAffinity: 1,
    creamyAffinity: 2,
    sweetAffinity: 2,
    spiceTolerance: 2,
    duckAffinity: 1,
    rabbitAffinity: 1,
    lambAffinity: 1,
  },
  {
    id: "cramposie",
    names: ["cramposie", "crâmpoșie"],
    color: "white",
    body: 2,
    structuralIntensity: 2,
    aromaticIntensity: 2,
    acidityTendency: 5,
    tanninTendency: 1,
    foodIntensity: 2,
    meatAffinity: 1,
    fishAffinity: 5,
    smokeAffinity: 1,
    creamyAffinity: 2,
    sweetAffinity: 1,
    spiceTolerance: 2,
    duckAffinity: 1,
    rabbitAffinity: 1,
    lambAffinity: 1,
  },
  {
    id: "mustoasa",
    names: ["mustoasa de maderat", "mustoasă de măderat", "mustoasa"],
    color: "white",
    body: 2,
    structuralIntensity: 2,
    aromaticIntensity: 3,
    acidityTendency: 5,
    tanninTendency: 1,
    foodIntensity: 2,
    meatAffinity: 1,
    fishAffinity: 5,
    smokeAffinity: 1,
    creamyAffinity: 2,
    sweetAffinity: 2,
    spiceTolerance: 2,
    duckAffinity: 1,
    rabbitAffinity: 1,
    lambAffinity: 1,
  },
  {
    id: "sauvignon-blanc",
    names: ["sauvignon blanc"],
    color: "white",
    body: 2,
    structuralIntensity: 3,
    aromaticIntensity: 5,
    acidityTendency: 5,
    tanninTendency: 1,
    foodIntensity: 2,
    meatAffinity: 1,
    fishAffinity: 5,
    smokeAffinity: 1,
    creamyAffinity: 2,
    sweetAffinity: 2,
    spiceTolerance: 3,
    duckAffinity: 1,
    rabbitAffinity: 1,
    lambAffinity: 1,
  },
  {
    id: "chardonnay",
    names: ["chardonnay"],
    color: "white",
    body: 3,
    structuralIntensity: 3,
    aromaticIntensity: 3,
    acidityTendency: 3,
    tanninTendency: 1,
    foodIntensity: 3,
    meatAffinity: 3,
    fishAffinity: 4,
    smokeAffinity: 1,
    creamyAffinity: 5,
    sweetAffinity: 2,
    spiceTolerance: 2,
    duckAffinity: 2,
    rabbitAffinity: 2,
    lambAffinity: 1,
  },
  {
    id: "riesling",
    names: ["riesling"],
    color: "white",
    body: 2,
    structuralIntensity: 3,
    aromaticIntensity: 4,
    acidityTendency: 5,
    tanninTendency: 1,
    foodIntensity: 2,
    meatAffinity: 1,
    fishAffinity: 5,
    smokeAffinity: 1,
    creamyAffinity: 2,
    sweetAffinity: 3,
    spiceTolerance: 4,
    duckAffinity: 1,
    rabbitAffinity: 1,
    lambAffinity: 1,
  },
  {
    id: "muscat-ottonel",
    names: ["muscat ottonel", "muscat"],
    color: "white",
    body: 3,
    structuralIntensity: 2,
    aromaticIntensity: 5,
    acidityTendency: 3,
    tanninTendency: 1,
    foodIntensity: 3,
    meatAffinity: 1,
    fishAffinity: 3,
    smokeAffinity: 1,
    creamyAffinity: 3,
    sweetAffinity: 5,
    spiceTolerance: 2,
    duckAffinity: 1,
    rabbitAffinity: 1,
    lambAffinity: 1,
  },
  {
    id: "traminer",
    names: ["traminer", "gewurztraminer", "gewürztraminer"],
    color: "white",
    body: 3,
    structuralIntensity: 2,
    aromaticIntensity: 5,
    acidityTendency: 2,
    tanninTendency: 1,
    foodIntensity: 3,
    meatAffinity: 2,
    fishAffinity: 3,
    smokeAffinity: 1,
    creamyAffinity: 3,
    sweetAffinity: 4,
    spiceTolerance: 4,
    duckAffinity: 2,
    rabbitAffinity: 1,
    lambAffinity: 1,
  },
];

export const DEFAULT_RED_STYLE: GrapeStyleProfile = {
  id: "default-red",
  names: [],
  color: "red",
  body: 3,
  structuralIntensity: 3,
  aromaticIntensity: 3,
  acidityTendency: 3,
  tanninTendency: 3,
  foodIntensity: 3,
  meatAffinity: 4,
  fishAffinity: 1,
  smokeAffinity: 3,
  creamyAffinity: 2,
  sweetAffinity: 2,
  spiceTolerance: 3,
  duckAffinity: 3,
  rabbitAffinity: 3,
  lambAffinity: 3,
};

export const DEFAULT_WHITE_STYLE: GrapeStyleProfile = {
  id: "default-white",
  names: [],
  color: "white",
  body: 2,
  structuralIntensity: 2,
  aromaticIntensity: 3,
  acidityTendency: 4,
  tanninTendency: 1,
  foodIntensity: 2,
  meatAffinity: 2,
  fishAffinity: 4,
  smokeAffinity: 1,
  creamyAffinity: 3,
  sweetAffinity: 2,
  spiceTolerance: 2,
  duckAffinity: 1,
  rabbitAffinity: 2,
  lambAffinity: 1,
};

export function findGrapeStyleProfile(name: string): GrapeStyleProfile | null {
  const folded = foldDishName(name);
  return (
    GRAPE_STYLE_PROFILES.find((profile) =>
      profile.names.some((alias) => foldDishName(alias) === folded),
    ) ?? null
  );
}

export function defaultStyleForType(
  type: string | null | undefined,
): GrapeStyleProfile {
  if (type === "red") {
    return {
      ...DEFAULT_RED_STYLE,
      preferredFamilies: GRAPE_PREFERRED_FAMILIES["default-red"],
    };
  }
  if (type === "orange") {
    return {
      ...DEFAULT_WHITE_STYLE,
      id: "default-orange",
      body: 3,
      foodIntensity: 3,
      meatAffinity: 2,
      smokeAffinity: 2,
      preferredFamilies: GRAPE_PREFERRED_FAMILIES["default-orange"],
    };
  }
  if (type === "rose") {
    return {
      ...DEFAULT_WHITE_STYLE,
      id: "default-rose",
      meatAffinity: 3,
      fishAffinity: 4,
      foodIntensity: 2,
      preferredFamilies: GRAPE_PREFERRED_FAMILIES["default-rose"],
    };
  }
  if (type === "sparkling") {
    return {
      ...DEFAULT_WHITE_STYLE,
      id: "default-sparkling",
      acidityTendency: 5,
      fishAffinity: 4,
      creamyAffinity: 3,
      preferredFamilies: GRAPE_PREFERRED_FAMILIES["default-sparkling"],
    };
  }
  if (type === "dessert") {
    return {
      ...DEFAULT_WHITE_STYLE,
      id: "default-dessert",
      sweetAffinity: 5,
      foodIntensity: 3,
      preferredFamilies: GRAPE_PREFERRED_FAMILIES["default-dessert"],
    };
  }
  return {
    ...DEFAULT_WHITE_STYLE,
    preferredFamilies: GRAPE_PREFERRED_FAMILIES["default-white"],
  };
}

export function blendGrapeStyles(
  parts: Array<{ profile: GrapeStyleProfile; weight: number }>,
): GrapeStyleProfile {
  const total = parts.reduce((sum, part) => sum + part.weight, 0);
  const safe = total > 0 ? parts : [{ profile: DEFAULT_RED_STYLE, weight: 1 }];
  const denom = safe.reduce((sum, part) => sum + part.weight, 0);
  const keys: Array<keyof GrapeStyleProfile> = [
    "body",
    "structuralIntensity",
    "aromaticIntensity",
    "acidityTendency",
    "tanninTendency",
    "foodIntensity",
    "meatAffinity",
    "fishAffinity",
    "smokeAffinity",
    "creamyAffinity",
    "sweetAffinity",
    "spiceTolerance",
    "duckAffinity",
    "rabbitAffinity",
    "lambAffinity",
  ];
  const blended = { ...safe[0]!.profile, id: "blend", names: [] };
  for (const key of keys) {
    const value =
      safe.reduce((sum, part) => {
        const numeric = part.profile[key];
        return sum + (typeof numeric === "number" ? numeric * part.weight : 0);
      }, 0) / denom;
    (blended as Record<string, unknown>)[key] = Math.max(
      1,
      Math.min(5, Math.round(value)),
    );
  }
  const familyWeight = new Map<string, number>();
  for (const part of safe) {
    const families = resolvePreferredFamilies(part.profile);
    for (const family of families) {
      familyWeight.set(family, (familyWeight.get(family) ?? 0) + part.weight);
    }
  }
  blended.preferredFamilies = [...familyWeight.entries()]
    .filter((entry) => entry[1] >= denom * 0.2)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5)
    .map((entry) => entry[0]);
  if (blended.preferredFamilies.length === 0) {
    blended.preferredFamilies = [...familyWeight.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 4)
      .map((entry) => entry[0]);
  }
  return blended;
}
