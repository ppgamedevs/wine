import { generateObject } from "ai";
import { eq, or } from "drizzle-orm";
import { getSommelierModel } from "@/lib/ai/model";
import { ANALYZE_WINE_LINK_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import {
  wineLinkAnalysisSchema,
  type WineLinkAnalysis,
} from "@/lib/ai/schemas";
import { db } from "@/lib/db";
import { fetchPageWithResolution } from "@/lib/fetch-page-html";
import { stripHtml } from "@/lib/fetch-page-text-utils";
import {
  extractProductFromHtml,
  inferImageSourceFromUrl,
} from "@/lib/price-extractor";
import { updatePrice } from "@/lib/price-tracker";
import {
  regions,
  wines,
  type GrapeVarietyShare,
  type WineSubmitType,
} from "@/lib/schema";
import { mapCsvCategoryToWineType } from "@/lib/wine-csv-schema";
import { loadWineForEditorial } from "@/lib/regenerate-wine-editorial";
import { generateAndApplyFullEditorial } from "@/lib/wine-enrichment";
import { buildWineImageAlt } from "@/lib/wine-images";
import { buildWineSlug, normalizeSourceUrl, slugify } from "@/lib/wine-url";
import { resolveWineSubmitContext } from "@/lib/wine-submit-context";
import { resolveWineryIdFromDetection, detectWineryNameFromCatalog } from "@/lib/winery-detection";
import type { WineType, WineWithRelations } from "@/types";

const MAX_PAGE_CHARS = 14_000;

export type AnalyzeWineApiWine = Omit<WineWithRelations, "embedding">;

export interface AnalyzeWineFlowMeta {
  sourceUrl: string;
  finalUrl: string;
  redirectChain: string[];
  submitType: WineSubmitType;
}

export interface AnalyzeWineResult {
  status: "existing" | "created" | "updated" | "rejected";
  slug?: string;
  message?: string;
  wineId?: number;
  redirectUrl?: string;
  wine?: AnalyzeWineApiWine;
  meta?: AnalyzeWineFlowMeta;
  submitType?: WineSubmitType;
}

interface ResolvedWineAnalysis {
  analysis: WineLinkAnalysis;
  category: string;
  wineType: WineType;
  checkedAt: string;
  grapeVarieties: GrapeVarietyShare[];
}

function inferCategoryFromText(
  category: string | undefined,
  pageText: string,
): string {
  const lower = pageText.toLowerCase();
  const lead = lower.slice(0, 4_000);
  const hasRoseSignal =
    lead.includes("vin rose") ||
    lead.includes("vin roze") ||
    lead.includes("culoare roz") ||
    lead.includes("culoare: roz") ||
    lead.includes("product option roz");
  const hasSparklingSignal =
    lead.includes("spumant") ||
    lead.includes("sparkling") ||
    lead.includes("perlaj") ||
    lead.includes("prosecco") ||
    lead.includes("sampanie") ||
    lead.includes("champagne");

  if (hasRoseSignal && !hasSparklingSignal) return "rose";
  if (category?.trim()) return category;
  if (lower.includes("spumant") || lower.includes("sparkling")) return "spumant";
  if (lower.includes("rose")) return "rose";
  if (lower.includes("alb") || lower.includes("white")) return "alb";
  if (lower.includes("orange")) return "orange";
  return "rosu";
}

function toGrapeShares(names: string[]): GrapeVarietyShare[] {
  return names.map((name) => ({ name }));
}

function resolveWineAnalysis(
  analysis: WineLinkAnalysis,
  pageText: string,
): ResolvedWineAnalysis {
  const category = inferCategoryFromText(analysis.category, pageText);
  const wineType = mapCsvCategoryToWineType(category);
  const checkedAt = new Date().toISOString();

  return {
    analysis,
    category,
    wineType,
    checkedAt,
    grapeVarieties: toGrapeShares(analysis.grapeVarieties),
  };
}

function serializeWineForApi(
  wine: NonNullable<Awaited<ReturnType<typeof loadWineForEditorial>>>,
): AnalyzeWineApiWine {
  const { embedding, ...rest } = wine;
  void embedding;
  return rest;
}

async function loadWineForApiResponse(
  wineId: number,
): Promise<AnalyzeWineApiWine | null> {
  const wine = await loadWineForEditorial(wineId);
  return wine ? serializeWineForApi(wine) : null;
}

function buildAnalyzeSuccessResult(
  status: "existing" | "created",
  wineId: number,
  slug: string,
  wine: AnalyzeWineApiWine,
  meta: AnalyzeWineFlowMeta,
): AnalyzeWineResult {
  return {
    status,
    wineId,
    slug,
    redirectUrl: `/wines/${slug}`,
    wine,
    meta,
    submitType: meta.submitType,
  };
}

function shouldUpdateImageFromSource(
  extractedUrl: string | null,
  currentImageSource: string | null | undefined,
): boolean {
  if (!extractedUrl) return false;
  return currentImageSource !== "manual";
}


async function fetchSourcePageContent(sourceUrl: string): Promise<{
  html: string;
  pageText: string;
  finalUrl: string;
  redirectChain: string[];
}> {
  const page = await fetchPageWithResolution(sourceUrl);
  const pageText = stripHtml(page.html).slice(0, MAX_PAGE_CHARS);
  return {
    html: page.html,
    pageText,
    finalUrl: page.finalUrl,
    redirectChain: page.redirectChain,
  };
}

function mergeExtractedWithAnalysis(
  analysis: WineLinkAnalysis,
  extracted: Awaited<ReturnType<typeof extractProductFromHtml>>,
): {
  name: string;
  producer: string;
  price: number | null;
  retailUrl: string;
} {
  return {
    name: extracted.name ?? analysis.name,
    producer: extracted.producer ?? analysis.producer,
    price: extracted.price ?? analysis.price ?? null,
    retailUrl: extracted.finalUrl,
  };
}

async function runLinkAnalysis(sourceUrl: string, pageText: string) {
  return generateObject({
    model: getSommelierModel(),
    schema: wineLinkAnalysisSchema,
    system: ANALYZE_WINE_LINK_SYSTEM_PROMPT,
    prompt: `Analizeaza vinul de la acest link:\n${sourceUrl}\n\nContinut pagina (extras):\n${pageText}`,
    temperature: 0.35,
  });
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

async function resolveWineryIdForProduct(
  product: { name: string; producer: string },
  pageText: string,
  finalUrl: string,
  regionId: number | null,
): Promise<number> {
  return resolveWineryIdFromDetection(
    {
      producer: product.producer,
      wineName: product.name,
      pageText,
      finalUrl,
    },
    regionId,
  );
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
  const submitContext = resolveWineSubmitContext(rawUrl);
  const { sourceUrl, submitType, initialStatus, sourceBadge } = submitContext;

  const existing = await findWineBySourceUrl(sourceUrl);
  if (existing) {
    const wine = await loadWineForApiResponse(existing.id);
    if (!wine) {
      return { status: "rejected", message: "Vinul exista dar nu a putut fi incarcat." };
    }
    return buildAnalyzeSuccessResult("existing", existing.id, existing.slug, wine, {
      sourceUrl,
      finalUrl: sourceUrl,
      redirectChain: [sourceUrl],
      submitType: wine.submitType,
    });
  }

  const { html, pageText, finalUrl, redirectChain } =
    await fetchSourcePageContent(sourceUrl);
  const flowMeta: AnalyzeWineFlowMeta = {
    sourceUrl,
    finalUrl,
    redirectChain,
    submitType,
  };
  const extracted = await extractProductFromHtml(html, finalUrl, { sourceUrl });
  const { object: analysis } = await runLinkAnalysis(finalUrl, pageText);
  const product = mergeExtractedWithAnalysis(analysis, extracted);
  const analysisForScoring =
    product.price != null ? { ...analysis, price: product.price } : analysis;

  if (!analysis.isRomanianWine) {
    return {
      status: "rejected",
      message:
        analysis.reasonIfNotRomanian ??
        "Cred ca acest vin nu este romanesc. VinIntel.ro se concentreaza doar pe vinuri produse in Romania.",
      meta: flowMeta,
    };
  }

  const resolved = resolveWineAnalysis(analysisForScoring, pageText);
  const detectedWineryName =
    (await detectWineryNameFromCatalog({
      producer: product.producer,
      wineName: product.name,
      pageText,
      finalUrl,
    })) ?? product.producer;
  const slug = buildWineSlug({
    producer: detectedWineryName,
    name: product.name,
    vintage: analysis.vintage,
  });

  const duplicateSlug = await db.query.wines.findFirst({
    where: eq(wines.slug, slug),
    columns: { slug: true, id: true },
  });
  if (duplicateSlug) {
    const wine = await loadWineForApiResponse(duplicateSlug.id);
    if (!wine) {
      return { status: "rejected", message: "Vin duplicat dar nu a putut fi incarcat." };
    }
    return buildAnalyzeSuccessResult(
      "existing",
      duplicateSlug.id,
      duplicateSlug.slug,
      wine,
      flowMeta,
    );
  }

  const regionId = await resolveRegionId(analysis.region);
  const wineryId = await resolveWineryIdForProduct(
    product,
    pageText,
    finalUrl,
    regionId,
  );

  const [created] = await db
    .insert(wines)
    .values({
      slug,
      name: product.name,
      wineryId,
      regionId,
      type: resolved.wineType,
      vintage: analysis.vintage ?? undefined,
      grapeVarieties: resolved.grapeVarieties,
      priceAvg: product.price ?? undefined,
      sourceUrl,
      submittedBy,
      submitType,
      status: initialStatus,
      sourceBadge,
      availability: [
        {
          retailer: detectedWineryName,
          url: finalUrl,
          priceRon: product.price ?? undefined,
          inStock: true,
          lastCheckedAt: resolved.checkedAt,
        },
      ],
      affiliateLinks: [
        {
          retailer: detectedWineryName,
          url: finalUrl,
          priceRon: product.price ?? undefined,
        },
      ],
      imageUrl: extracted.imageUrl ?? undefined,
      imageSource: extracted.imageUrl
        ? inferImageSourceFromUrl(finalUrl)
        : undefined,
      imageAlt: buildWineImageAlt({
        name: product.name,
        vintage: analysis.vintage,
        type: resolved.wineType,
        wineryName: detectedWineryName,
      }),
    })
    .returning({ id: wines.id, slug: wines.slug });

  if (product.price != null) {
    await updatePrice(created.id, product.price, finalUrl);
  }

  await generateAndApplyFullEditorial(created.id);

  const wine = await loadWineForApiResponse(created.id);
  if (!wine) {
    return {
      status: "rejected",
      message: "Vin salvat dar raspunsul complet nu a putut fi generat.",
      wineId: created.id,
      slug: created.slug,
      meta: flowMeta,
    };
  }

  return buildAnalyzeSuccessResult("created", created.id, created.slug, wine, flowMeta);
}

export async function reanalyzeAndUpdateWine(
  wineId: number,
): Promise<AnalyzeWineResult> {
  const wine = await db.query.wines.findFirst({
    where: eq(wines.id, wineId),
    columns: {
      id: true,
      slug: true,
      sourceUrl: true,
      submitType: true,
      imageUrl: true,
      imageSource: true,
      status: true,
      submittedBy: true,
      reportCount: true,
    },
  });

  if (!wine) {
    return { status: "rejected", message: "Vin negasit." };
  }

  if (!wine.sourceUrl) {
    return {
      status: "rejected",
      message: "Acest vin nu are link sursa pentru re-analiza.",
    };
  }

  const sourceUrl = normalizeSourceUrl(wine.sourceUrl);
  const { html, pageText, finalUrl, redirectChain } =
    await fetchSourcePageContent(sourceUrl);
  const flowMeta: AnalyzeWineFlowMeta = {
    sourceUrl,
    finalUrl,
    redirectChain,
    submitType: wine.submitType,
  };
  const extracted = await extractProductFromHtml(html, finalUrl, { sourceUrl });
  const { object: analysis } = await runLinkAnalysis(finalUrl, pageText);
  const product = mergeExtractedWithAnalysis(analysis, extracted);
  const analysisForScoring =
    product.price != null ? { ...analysis, price: product.price } : analysis;

  if (!analysis.isRomanianWine) {
    return {
      status: "rejected",
      message:
        analysis.reasonIfNotRomanian ??
        "Re-analiza indica ca vinul nu este romanesc.",
      meta: flowMeta,
    };
  }

  const resolved = resolveWineAnalysis(analysisForScoring, pageText);
  const detectedWineryName =
    (await detectWineryNameFromCatalog({
      producer: product.producer,
      wineName: product.name,
      pageText,
      finalUrl,
    })) ?? product.producer;
  const regionId = await resolveRegionId(analysis.region);
  const wineryId = await resolveWineryIdForProduct(
    product,
    pageText,
    finalUrl,
    regionId,
  );

  const imagePatch =
    shouldUpdateImageFromSource(extracted.imageUrl, wine.imageSource) &&
    extracted.imageUrl
      ? {
          imageUrl: extracted.imageUrl,
          imageSource: inferImageSourceFromUrl(finalUrl),
        }
      : {};

  await db
    .update(wines)
    .set({
      name: product.name,
      wineryId,
      regionId,
      type: resolved.wineType,
      vintage: analysis.vintage ?? undefined,
      grapeVarieties: resolved.grapeVarieties,
      priceAvg: product.price ?? undefined,
      availability: [
        {
          retailer: detectedWineryName,
          url: finalUrl,
          priceRon: product.price ?? undefined,
          inStock: true,
          lastCheckedAt: resolved.checkedAt,
        },
      ],
      affiliateLinks: [
        {
          retailer: detectedWineryName,
          url: finalUrl,
          priceRon: product.price ?? undefined,
        },
      ],
      imageAlt: buildWineImageAlt({
        name: product.name,
        vintage: analysis.vintage,
        type: resolved.wineType,
        wineryName: detectedWineryName,
      }),
      ...imagePatch,
    })
    .where(eq(wines.id, wine.id));

  if (product.price != null) {
    await updatePrice(wine.id, product.price, finalUrl);
  }

  await generateAndApplyFullEditorial(wine.id);

  const updatedWine = await loadWineForApiResponse(wine.id);
  if (!updatedWine) {
    return {
      status: "rejected",
      message: "Vin actualizat dar raspunsul complet nu a putut fi generat.",
      wineId: wine.id,
      slug: wine.slug,
      meta: flowMeta,
    };
  }

  return {
    status: "updated",
    slug: wine.slug,
    wineId: wine.id,
    redirectUrl: `/wines/${wine.slug}`,
    wine: updatedWine,
    meta: flowMeta,
    submitType: wine.submitType,
    message: "Vin re-analizat cu succes.",
  };
}
