import { generateObject } from "ai";
import { eq, or } from "drizzle-orm";
import { getSommelierModel } from "@/lib/ai/model";
import { ANALYZE_WINE_LINK_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { wineLinkAnalysisSchema } from "@/lib/ai/schemas";
import { db } from "@/lib/db";
import { fetchPageText } from "@/lib/fetch-page-text";
import { calculateInitialScores } from "@/lib/scoring";
import {
  COMMUNITY_SOURCE_BADGE,
  regions,
  wineries,
  wines,
  type EditorialFoodPairingNote,
  type GrapeVarietyShare,
} from "@/lib/schema";
import { mapCsvCategoryToWineType } from "@/lib/wine-csv-schema";
import { buildWineImageAlt } from "@/lib/wine-images";
import { buildWineSlug, normalizeSourceUrl, slugify } from "@/lib/wine-url";
import type { WineType } from "@/types";

export interface AnalyzeWineResult {
  status: "existing" | "created" | "rejected";
  slug?: string;
  message?: string;
  wineId?: number;
}

function inferCategoryFromText(
  category: string | undefined,
  pageText: string,
): string {
  if (category?.trim()) return category;
  const lower = pageText.toLowerCase();
  if (lower.includes("spumant") || lower.includes("sparkling")) return "spumant";
  if (lower.includes("rose")) return "rose";
  if (lower.includes("alb") || lower.includes("white")) return "alb";
  if (lower.includes("orange")) return "orange";
  return "rosu";
}

function parseFoodPairingNotes(
  value: string | EditorialFoodPairingNote[] | undefined,
): EditorialFoodPairingNote[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [{ dish: "Mancare romaneasca", note: value }];
}

function toGrapeShares(names: string[]): GrapeVarietyShare[] {
  return names.map((name) => ({ name }));
}

async function resolveRegionId(regionName: string): Promise<number | null> {
  const regionSlug = slugify(regionName);
  const existing = await db.query.regions.findFirst({
    where: or(eq(regions.slug, regionSlug), eq(regions.name, regionName)),
  });
  if (existing) return existing.id;

  const [created] = await db
    .insert(regions)
    .values({ slug: regionSlug, name: regionName })
    .onConflictDoNothing()
    .returning();
  return created?.id ?? null;
}

async function resolveWineryId(
  producer: string,
  regionId: number | null,
  website: string,
): Promise<number> {
  const producerSlug = slugify(producer);
  const existing = await db.query.wineries.findFirst({
    where: or(eq(wineries.slug, producerSlug), eq(wineries.name, producer)),
  });
  if (existing) return existing.id;

  const [created] = await db
    .insert(wineries)
    .values({
      slug: producerSlug,
      name: producer,
      regionId,
      website,
    })
    .onConflictDoNothing()
    .returning();

  if (created) return created.id;

  const fallback = await db.query.wineries.findFirst({
    where: eq(wineries.slug, producerSlug),
  });
  if (!fallback) throw new Error("Nu am putut crea crama.");
  return fallback.id;
}

export async function findWineBySourceUrl(
  sourceUrl: string,
): Promise<{ slug: string; id: number } | null> {
  const normalized = normalizeSourceUrl(sourceUrl);
  const row = await db.query.wines.findFirst({
    where: eq(wines.sourceUrl, normalized),
    columns: { id: true, slug: true },
  });
  return row ?? null;
}

export async function analyzeAndSaveWineFromUrl(
  rawUrl: string,
  submittedBy = "anonymous",
): Promise<AnalyzeWineResult> {
  const sourceUrl = normalizeSourceUrl(rawUrl);

  const existing = await findWineBySourceUrl(sourceUrl);
  if (existing) {
    return { status: "existing", slug: existing.slug, wineId: existing.id };
  }

  const pageText = await fetchPageText(sourceUrl);

  const { object: analysis } = await generateObject({
    model: getSommelierModel(),
    schema: wineLinkAnalysisSchema,
    system: ANALYZE_WINE_LINK_SYSTEM_PROMPT,
    prompt: `Analizeaza vinul de la acest link:\n${sourceUrl}\n\nContinut pagina (extras):\n${pageText}`,
    temperature: 0.35,
  });

  if (!analysis.isRomanianWine) {
    return {
      status: "rejected",
      message:
        analysis.reasonIfNotRomanian ??
        "Cred ca acest vin nu este romanesc. VinIntel.ro se concentreaza doar pe vinuri produse in Romania.",
    };
  }

  const category = inferCategoryFromText(analysis.category, pageText);
  const wineType: WineType = mapCsvCategoryToWineType(category);
  const slug = buildWineSlug({
    producer: analysis.producer,
    name: analysis.name,
    vintage: analysis.vintage,
  });

  const duplicateSlug = await db.query.wines.findFirst({
    where: eq(wines.slug, slug),
    columns: { slug: true, id: true },
  });
  if (duplicateSlug) {
    return {
      status: "existing",
      slug: duplicateSlug.slug,
      wineId: duplicateSlug.id,
    };
  }

  const price = analysis.price ?? 0;
  const ruleScores = calculateInitialScores({
    price: price > 0 ? price : 50,
    category,
    region: analysis.region,
    grapeVarieties: analysis.grapeVarieties,
  });

  const valueScore =
    analysis.valueScore != null
      ? Math.min(100, Math.max(10, Math.round(analysis.valueScore * 10)))
      : ruleScores.valueScore;

  const regionId = await resolveRegionId(analysis.region);
  const wineryId = await resolveWineryId(
    analysis.producer,
    regionId,
    new URL(sourceUrl).origin,
  );

  const grapeVarieties = toGrapeShares(analysis.grapeVarieties);
  const foodPairingNotes = parseFoodPairingNotes(analysis.foodPairingNotes);
  const checkedAt = new Date().toISOString();

  const [created] = await db
    .insert(wines)
    .values({
      slug,
      name: analysis.name,
      wineryId,
      regionId,
      type: wineType,
      vintage: analysis.vintage ?? undefined,
      grapeVarieties,
      priceAvg: analysis.price ?? undefined,
      valueScore,
      giftScore: ruleScores.giftScore,
      foodMatchScore: ruleScores.foodMatchScore,
      overpricedRisk: ruleScores.overpricedRisk,
      beginnerFriendly: ruleScores.beginnerFriendly,
      cellarPotential: ruleScores.cellarPotential,
      descriptionEditorial: analysis.descriptionEditorial,
      valueExplanation: analysis.valueExplanation,
      thingsYouShouldKnow: analysis.thingsYouShouldKnow,
      tasteProfile: analysis.tasteProfile,
      foodPairingNotes,
      sourceUrl,
      submittedBy,
      status: "user_submitted",
      sourceBadge: COMMUNITY_SOURCE_BADGE,
      availability: [
        {
          retailer: analysis.producer,
          url: sourceUrl,
          priceRon: analysis.price ?? undefined,
          inStock: true,
          lastCheckedAt: checkedAt,
        },
      ],
      affiliateLinks: [
        {
          retailer: analysis.producer,
          url: sourceUrl,
          priceRon: analysis.price ?? undefined,
        },
      ],
      imageAlt: buildWineImageAlt({
        name: analysis.name,
        vintage: analysis.vintage,
        type: wineType,
        wineryName: analysis.producer,
      }),
    })
    .returning({ id: wines.id, slug: wines.slug });

  return {
    status: "created",
    slug: created.slug,
    wineId: created.id,
  };
}
