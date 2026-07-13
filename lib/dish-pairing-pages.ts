import type { OccasionId } from "@/lib/sommelier";
import type { FaqEntry } from "@/lib/seo";
import type { WineWithRelations } from "@/types";
import { formatRon } from "@/lib/format";

export interface DishPairingPageConfig {
  slug: string;
  dishName: string;
  heading: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  occasionId?: OccasionId;
  pairingKeywords: string[];
  defaultBudget: number;
}

export const DISH_PAIRING_PAGES: DishPairingPageConfig[] = [
  {
    slug: "sarmale",
    dishName: "Sarmale",
    heading: "Ce vin merge cu sarmale?",
    metaTitle: "Vin pentru sarmale: recomandari romanesti sub 50 lei",
    metaDescription:
      "Cele mai bune vinuri romanesti pentru sarmale: rosu sec, Value Score, pret in RON si explicatii clare.",
    intro:
      "Sarmalele cer un vin rosu sec cu aciditate buna si taninuri blande. Am selectat vinuri romanesti care tin pasul cu grasimea si condimentele.",
    occasionId: "sarmale",
    pairingKeywords: ["sarmale", "varza", "carne"],
    defaultBudget: 50,
  },
  {
    slug: "gratar",
    dishName: "Gratar",
    heading: "Ce vin merge la gratar?",
    metaTitle: "Vin pentru gratar: top romanesc la carne la gratar",
    metaDescription:
      "Vinuri romanesti potrivite pentru gratar: rosu sau roze sec, cu preturi in RON si Value Score.",
    intro:
      "La gratar functioneaza vinurile cu corp mediu spre plin, taninuri coapte si fruct rosu. Mai jos gasesti optiuni testate pentru carne la gratar.",
    occasionId: "gratar",
    pairingKeywords: ["gratar", "carne", "mici", "cotlet"],
    defaultBudget: 50,
  },
  {
    slug: "peste",
    dishName: "Peste",
    heading: "Ce vin merge cu peste?",
    metaTitle: "Vin pentru peste: albe si roze sec din Romania",
    metaDescription:
      "Vinuri albe si roze romanesti pentru peste: fresh, sec, cu preturi in RON.",
    intro:
      "Pestele prefera vinuri albe sau roze sec, cu aciditate ridicata si arome discret fructate. Selectia de mai jos evita vinurile grele.",
    pairingKeywords: ["peste", "somon", "scrumbie", "marinare"],
    defaultBudget: 60,
  },
  {
    slug: "friptura-de-porc",
    dishName: "Friptura de porc",
    heading: "Ce vin merge cu friptura de porc?",
    metaTitle: "Vin pentru friptura de porc: rosu sec romanesc",
    metaDescription:
      "Vinuri rosu sec din Romania pentru friptura de porc, ordonate dupa Value Score.",
    intro:
      "Friptura de porc merge cu rosu sec echilibrat, cu taninuri moi si note fructate. Am exclus vinurile prea grele sau prea dulci.",
    pairingKeywords: ["porc", "friptura", "ceafa", "cotlet"],
    defaultBudget: 55,
  },
  {
    slug: "cozonac",
    dishName: "Cozonac",
    heading: "Ce vin merge cu cozonac?",
    metaTitle: "Vin pentru cozonac si desert: dulce si demidulce",
    metaDescription:
      "Vinuri romanesti pentru cozonac si desert: dulce, demidulce sau spumant, cu preturi in RON.",
    intro:
      "Cozonacul merge cu vinuri dulci sau demidulce, cu arome de fruct uscat, miere sau vanilie. Mai jos, optiuni potrivite din Romania.",
    occasionId: "pentru-desert",
    pairingKeywords: ["cozonac", "desert", "dulce", "prajitura"],
    defaultBudget: 50,
  },
];

export function getDishPairingPage(slug: string): DishPairingPageConfig | null {
  return DISH_PAIRING_PAGES.find((page) => page.slug === slug) ?? null;
}

export function getAllDishPairingSlugs(): string[] {
  return DISH_PAIRING_PAGES.map((page) => page.slug);
}

export function rankWinesForDish(
  wines: WineWithRelations[],
  config: DishPairingPageConfig,
  limit = 10,
): WineWithRelations[] {
  const budget = config.defaultBudget;
  const keywords = config.pairingKeywords.map((k) => k.toLowerCase());

  const scored = wines
    .filter(
      (w) =>
        w.priceAvg !== null &&
        w.priceAvg !== undefined &&
        w.priceAvg <= budget,
    )
    .map((wine) => {
      let score = wine.foodMatchScore ?? wine.valueScore ?? 0;
      const pairings = (wine.foodPairings ?? []).map((p) => p.dish.toLowerCase());
      if (pairings.some((dish) => keywords.some((k) => dish.includes(k)))) {
        score += 15;
      }
      return { wine, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((entry) => entry.wine);
}

export function buildDishFaq(
  config: DishPairingPageConfig,
  wines: WineWithRelations[],
): FaqEntry[] {
  const top = wines[0];
  return [
    {
      question: config.heading,
      answer: top
        ? `Recomandam ${top.name} la ${formatRon(top.priceAvg)}, cu Value Score ${top.valueScore ?? "N/A"}/100.`
        : "Actualizam recomandarile in functie de disponibilitate si pret.",
    },
    {
      question: `Ce tip de vin se potriveste cu ${config.dishName.toLowerCase()}?`,
      answer: config.intro,
    },
    {
      question: "Preturile sunt in RON?",
      answer:
        "Da. Afisam preturi in RON ca pret actual verificat sau pret aproximativ, in functie de sursa.",
    },
  ];
}
