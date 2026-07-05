import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { DEFAULT_WINE_SOURCE_BADGE, wines } from "@/lib/schema";
import {
  extractAndSaveWineImageIfMissing,
  generateAndApplyFullEditorial,
} from "@/lib/wine-enrichment";

export interface ApproveCommunityWineResult {
  slug: string;
  imageExtracted: boolean;
}

export async function approveCommunityWine(
  wineId: number,
): Promise<ApproveCommunityWineResult> {
  const wine = await db.query.wines.findFirst({
    where: eq(wines.id, wineId),
    columns: { id: true, slug: true, status: true },
  });

  if (!wine) {
    throw new Error("Vin negasit.");
  }

  if (wine.status !== "user_submitted") {
    throw new Error("Doar vinurile in asteptare pot fi aprobate.");
  }

  const imageExtracted = await extractAndSaveWineImageIfMissing(wineId);
  await generateAndApplyFullEditorial(wineId);

  await db
    .update(wines)
    .set({
      status: "verified",
      sourceBadge: DEFAULT_WINE_SOURCE_BADGE,
    })
    .where(eq(wines.id, wineId));

  return { slug: wine.slug, imageExtracted };
}
