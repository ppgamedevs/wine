import {
  ROMANIAN_DISHES,
  type RomanianDishProfile,
} from "@/lib/pairing/romanian-dishes";

export const DISH_PRESENTATION_LOCALES = ["ro", "en"] as const;

export type DishPresentationLocale =
  (typeof DISH_PRESENTATION_LOCALES)[number];

export interface DishPresentation {
  id: string;
  slug: string;
  locale: DishPresentationLocale;
  displayName: string;
  explanation?: string;
}

export interface EnglishDishCopy {
  displayName: string;
  explanation?: string;
}

export const ENGLISH_DISH_COPY = {
  sarmale: {
    displayName: "Sarmale",
    explanation: "Romanian cabbage rolls filled with pork and rice.",
  },
  "varza-a-la-cluj": {
    displayName: "Cluj-style layered cabbage",
  },
  "sarmale-de-post": {
    displayName: "Meatless sarmale",
    explanation: "Romanian cabbage rolls with a meatless filling.",
  },
  "sarmale-in-foi-de-vita": {
    displayName: "Vine leaf sarmale",
    explanation: "Romanian meat and rice rolls wrapped in vine leaves.",
  },
  "tochitura-moldoveneasca": {
    displayName: "Moldavian pork stew",
  },
  "pomana-porcului": {
    displayName: "Traditional pork feast",
  },
  "ciolan-afumat-cu-fasole": {
    displayName: "Smoked pork knuckle with beans",
  },
  "fasole-cu-ciolan": {
    displayName: "Beans with smoked pork knuckle",
  },
  "carnati-afumati-cu-mamaliga": {
    displayName: "Smoked sausages with polenta",
  },
  mici: {
    displayName: "Mici",
    explanation: "Romanian grilled skinless sausages made from seasoned minced meat.",
  },
  "pastrama-de-oaie": {
    displayName: "Cured mutton pastrami",
  },
  "miel-la-cuptor": {
    displayName: "Roast lamb",
  },
  drob: {
    displayName: "Lamb offal loaf",
  },
  "rata-pe-varza": {
    displayName: "Duck with braised cabbage",
  },
  "pui-la-ceaun": {
    displayName: "Cauldron-fried chicken",
  },
  "ostropel-de-pui": {
    displayName: "Chicken in garlic tomato sauce",
  },
  "ciulama-de-pui": {
    displayName: "Chicken in creamy white sauce",
  },
  "curcan-la-cuptor": {
    displayName: "Roast turkey",
  },
  "iepure-la-cuptor": {
    displayName: "Roast rabbit",
  },
  "tocana-de-iepure": {
    displayName: "Rabbit stew",
  },
  "tocanita-de-vanat": {
    displayName: "Game stew",
  },
  "friptura-de-vita": {
    displayName: "Roast beef",
  },
  "saramura-de-crap": {
    displayName: "Carp in spiced brine",
  },
  "plachie-de-crap": {
    displayName: "Carp in tomato and onion sauce",
  },
  "crap-prajit-cu-mamaliga": {
    displayName: "Fried carp",
  },
  "scrumbie-de-dunare": {
    displayName: "Danube shad",
  },
  "pastrav-la-gratar-cu-mamaliga": {
    displayName: "Grilled trout",
  },
  storceag: {
    displayName: "Storceag fish soup",
    explanation: "A creamy sour fish soup from the Danube Delta.",
  },
  hamsii: {
    displayName: "Fried anchovies",
  },
  "salata-de-icre": {
    displayName: "Fish roe spread",
  },
  "peste-la-cuptor": {
    displayName: "Baked fish",
  },
  "fructe-de-mare": {
    displayName: "Seafood",
  },
  zacusca: {
    displayName: "Zacuscă roasted vegetable spread",
  },
  "salata-de-vinete": {
    displayName: "Roasted eggplant spread",
  },
  "ciuperci-cu-mamaliga": {
    displayName: "Mushrooms with polenta",
  },
  "iahnie-de-fasole": {
    displayName: "Romanian bean stew",
  },
  ghiveci: {
    displayName: "Vegetable stew",
  },
  "ardei-copti": {
    displayName: "Roasted peppers",
  },
  "fasole-batuta": {
    displayName: "Whipped beans with onions",
  },
  bulz: {
    displayName: "Bulz polenta with sheep's cheese",
  },
  "mamaliga-cu-branza-si-smantana": {
    displayName: "Polenta with cheese and sour cream",
    explanation: "Creamy polenta served with salty cheese and sour cream.",
  },
  "branza-de-burduf": {
    displayName: "Brânză de burduf sheep's cheese",
  },
  telemea: {
    displayName: "Telemea cheese",
  },
  "cascaval-maturat": {
    displayName: "Aged cașcaval cheese",
  },
  "placinta-dobrogeana": {
    displayName: "Dobrogea cheese pie",
  },
  cozonac: {
    displayName: "Cozonac sweet bread",
  },
  pasca: {
    displayName: "Pască Easter cheesecake",
  },
  papanasi: {
    displayName: "Papanași",
    explanation:
      "Romanian fried cheese doughnuts served with sour cream and fruit preserve.",
  },
  "poale-n-brau": {
    displayName: "Moldavian sweet cheese pastries",
  },
  alivenci: {
    displayName: "Moldavian cornmeal cheese cake",
  },
  "placinta-cu-mere": {
    displayName: "Apple pie",
  },
  "placinta-cu-dovleac": {
    displayName: "Pumpkin pie",
  },
  "clatite-cu-dulceata": {
    displayName: "Crepes with fruit preserve",
  },
  aperitive: {
    displayName: "Appetizers",
  },
  "paste-cu-ragu": {
    displayName: "Pasta with ragù",
  },
  "ardei-umpluti-de-post": {
    displayName: "Meatless stuffed peppers",
  },
  "dovlecei-umpluti-de-post": {
    displayName: "Meatless stuffed zucchini",
  },
  "mancare-de-praz-cu-masline": {
    displayName: "Leek and olive stew",
  },
  "ciulama-de-ciuperci": {
    displayName: "Mushrooms in creamy white sauce",
  },
  "tocanita-de-ciuperci": {
    displayName: "Mushroom stew",
  },
  "placinte-sarate-vegetariene": {
    displayName: "Vegetarian savory pies",
  },
  "plachie-de-salau": {
    displayName: "Pike-perch in tomato and onion sauce",
  },
  "saramura-de-pastrav": {
    displayName: "Trout in spiced brine",
  },
  "pastrav-prajit": {
    displayName: "Fried trout",
  },
  "salau-la-cuptor": {
    displayName: "Baked pike-perch",
  },
  "scrumbie-de-dunare-la-gratar": {
    displayName: "Grilled Danube shad",
  },
  "bors-de-peste": {
    displayName: "Romanian sour fish soup",
  },
  "salata-de-icre-de-crap": {
    displayName: "Carp roe spread",
  },
  "salata-de-icre-de-stiuca": {
    displayName: "Pike roe spread",
  },
  "telemea-de-capra": {
    displayName: "Goat's milk telemea",
  },
  "telemea-de-oaie": {
    displayName: "Sheep's milk telemea",
  },
  "telemea-de-vaca": {
    displayName: "Cow's milk telemea",
  },
  "chiftele-prajite": {
    displayName: "Fried meatballs",
  },
  "chiftele-marinate-in-sos-de-rosii": {
    displayName: "Meatballs in tomato sauce",
  },
  "parjoale-moldovenesti": {
    displayName: "Moldavian meat patties",
  },
  "chiftele-de-ciuperci": {
    displayName: "Mushroom patties",
  },
  "ciorba-radauteana": {
    displayName: "Rădăuți-style chicken soup",
  },
  "ciorba-de-perisoare": {
    displayName: "Romanian sour meatball soup",
  },
  "ciorba-de-burta": {
    displayName: "Romanian tripe soup",
    explanation: "A tangy, creamy tripe soup traditionally served with garlic and chili.",
  },
  "ciorba-de-miel": {
    displayName: "Romanian sour lamb soup",
  },
  "ciorba-de-fasole-cu-afumatura": {
    displayName: "Bean soup with smoked pork",
  },
  "ciorba-de-legume": {
    displayName: "Romanian sour vegetable soup",
  },
  "piftie-de-curcan": {
    displayName: "Turkey aspic",
    explanation: "A traditional savory jelly made with turkey and garlic.",
  },
  "piftie-de-porc": {
    displayName: "Pork aspic",
    explanation: "A traditional savory jelly made with pork and garlic.",
  },
  "piept-de-rata": {
    displayName: "Duck breast",
  },
  "tocana-de-porc-cu-prune": {
    displayName: "Pork and prune stew",
  },
  "peste-alb": {
    displayName: "White fish",
  },
  "cotlete-de-miel": {
    displayName: "Lamb chops",
  },
} as const satisfies Readonly<Record<string, EnglishDishCopy>>;

const CANONICAL_DISHES_BY_ID = new Map<string, RomanianDishProfile>();

for (const profile of ROMANIAN_DISHES) {
  if (!CANONICAL_DISHES_BY_ID.has(profile.id)) {
    CANONICAL_DISHES_BY_ID.set(profile.id, profile);
  }
}

export const CANONICAL_DISH_PRESENTATION_COUNT = CANONICAL_DISHES_BY_ID.size;

export function hasDishPresentation(id: string): boolean {
  return CANONICAL_DISHES_BY_ID.has(id);
}

function canonicalProfile(id: string): RomanianDishProfile {
  const profile = CANONICAL_DISHES_BY_ID.get(id);
  if (!profile) {
    throw new Error(`Unknown canonical dish: ${id}`);
  }
  return profile;
}

function englishCopy(id: string): EnglishDishCopy {
  const copy: EnglishDishCopy | undefined =
    ENGLISH_DISH_COPY[id as keyof typeof ENGLISH_DISH_COPY];
  if (!copy?.displayName.trim()) {
    throw new Error(`Missing English dish presentation: ${id}`);
  }
  return copy;
}

export function getDishPresentation(
  id: string,
  locale: DishPresentationLocale,
): DishPresentation {
  const profile = canonicalProfile(id);
  if (locale === "ro") {
    return {
      id: profile.id,
      slug: profile.id,
      locale,
      displayName: profile.name,
    };
  }

  const copy = englishCopy(profile.id);
  return {
    id: profile.id,
    slug: profile.id,
    locale,
    displayName: copy.displayName,
    ...(copy.explanation ? { explanation: copy.explanation } : {}),
  };
}

export function getDishPresentations(
  locale: DishPresentationLocale,
): DishPresentation[] {
  return [...CANONICAL_DISHES_BY_ID.keys()].map((id) =>
    getDishPresentation(id, locale),
  );
}
