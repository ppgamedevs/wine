import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { wines } from "@/lib/schema";
import type { RecoverableWine } from "@/lib/tech-facts/recover";

export async function loadVerifiedTechWines(filter?: {
  winerySlug?: string;
  wineSlug?: string;
}): Promise<RecoverableWine[]> {
  const rows = await db.query.wines.findMany({
    where: eq(wines.status, "verified"),
    columns: {
      id: true,
      slug: true,
      name: true,
      vintage: true,
      type: true,
      sweetness: true,
      alcohol: true,
      acidity: true,
      sugar: true,
      grapeVarieties: true,
      producerPageUrl: true,
      tastingSheetUrl: true,
      sourceUrl: true,
      tastingNotes: true,
      producerContent: true,
      valueScore: true,
      giftScore: true,
      foodMatchScore: true,
    },
    with: { winery: { columns: { name: true, slug: true } } },
  });

  return rows
    .filter((row) => {
      if (filter?.wineSlug && row.slug !== filter.wineSlug) return false;
      if (filter?.winerySlug && row.winery?.slug !== filter.winerySlug) return false;
      return true;
    })
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      wineryName: row.winery?.name ?? null,
      winerySlug: row.winery?.slug ?? null,
      vintage: row.vintage,
      type: row.type,
      sweetness: row.sweetness,
      alcohol: row.alcohol,
      acidity: row.acidity,
      sugar: row.sugar,
      grapeVarieties: row.grapeVarieties,
      producerPageUrl: row.producerPageUrl,
      tastingSheetUrl: row.tastingSheetUrl,
      sourceUrl: row.sourceUrl,
      tastingNotes: row.tastingNotes,
      producerContent: row.producerContent,
      valueScore: row.valueScore,
      giftScore: row.giftScore,
      foodMatchScore: row.foodMatchScore,
    }));
}
