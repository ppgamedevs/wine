import { db } from "@/lib/db";
import { grapeVarietyKnowledge } from "@/lib/schema";

export interface VarietyKnowledge {
  slug: string;
  name: string;
  history: string;
  typicalAromas: string[];
  regions: string[];
  styles: string[];
  foodCompatibility: string[];
  winemaking: string[];
  sources: Array<{ url: string; title: string }>;
}

/**
 * General variety knowledge is separate from product evidence. It must never
 * be copied into a bottle's verified tasting notes.
 */
export const VARIETY_KNOWLEDGE: Record<string, VarietyKnowledge> = {
  "muscat-ottonel": {
    slug: "muscat-ottonel",
    name: "Muscat Ottonel",
    history:
      "Muscat Ottonel is a member of the Muscat family, first selected in the 19th century and now widely planted in Central and Eastern Europe for its pronounced aromatic profile.",
    typicalAromas: [
      "orange blossom",
      "elderflower",
      "rose",
      "honey",
      "white peach",
      "grape",
    ],
    regions: [
      "Romania: Murfatlar, Târnave, Jidvei",
      "Moldova",
      "Alsace",
      "Austria",
    ],
    styles: [
      "dry and off-dry whites",
      "demi-sec and sweet late-harvest wines",
      "aromatic sparkling wines",
    ],
    foodCompatibility: [
      "aperitif",
      "light fish and seafood",
      "poultry",
      "mild Asian dishes",
      "fresh goat cheese",
      "fruit desserts",
    ],
    winemaking: [
      "early picking to retain acidity",
      "cool fermentation to preserve aromatics",
      "stainless-steel aging is common",
      "late harvest or botrytis for sweet styles",
    ],
    sources: [
      {
        url: "https://www.winefolly.com/deep-dive/muscat/",
        title: "Wine Folly — Muscat",
      },
      {
        url: "https://www.oiv.int/",
        title: "OIV — grape variety and wine knowledge",
      },
    ],
  },
};

export function getVarietyKnowledge(
  grape: string | null | undefined,
): VarietyKnowledge | null {
  if (!grape?.trim()) return null;
  const key = grape
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return VARIETY_KNOWLEDGE[key] ?? null;
}

/**
 * General knowledge is intentionally not shaped like a WineClaim. This type
 * separation makes accidental promotion into bottle evidence harder.
 */
export function varietyKnowledgeForWine(grape: string): VarietyKnowledge | null {
  return getVarietyKnowledge(grape);
}

export async function seedGrapeVarietyKnowledge(): Promise<number> {
  let count = 0;
  for (const knowledge of Object.values(VARIETY_KNOWLEDGE)) {
    await db
      .insert(grapeVarietyKnowledge)
      .values({
        slug: knowledge.slug,
        name: knowledge.name,
        history: knowledge.history,
        typicalAromas: knowledge.typicalAromas,
        regions: knowledge.regions,
        styles: knowledge.styles,
        foodCompatibility: knowledge.foodCompatibility,
        winemaking: knowledge.winemaking,
        sources: knowledge.sources,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: grapeVarietyKnowledge.slug,
        set: {
          name: knowledge.name,
          history: knowledge.history,
          typicalAromas: knowledge.typicalAromas,
          regions: knowledge.regions,
          styles: knowledge.styles,
          foodCompatibility: knowledge.foodCompatibility,
          winemaking: knowledge.winemaking,
          sources: knowledge.sources,
          updatedAt: new Date().toISOString(),
        },
      });
    count += 1;
  }
  return count;
}
