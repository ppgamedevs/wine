import { generateObject } from "ai";
import { eq, or } from "drizzle-orm";
import { getSommelierModel } from "@/lib/ai/model";
import { ANALYZE_WINE_LINK_SYSTEM_PROMPT, buildWineMedalExtractionUserPrompt } from "@/lib/ai/prompts";
import {
  wineLinkAnalysisSchema,
  type WineLinkAnalysis,
} from "@/lib/ai/schemas";
import { db } from "@/lib/db";
import { fetchProducerEnrichmentForWine } from "@/lib/fetch-producer-page-content";
import { fetchPageWithResolution } from "@/lib/fetch-page-html";
import { stripHtml } from "@/lib/fetch-page-text-utils";
import {
  extractProductFromHtml,
  inferImageSourceFromUrl,
} from "@/lib/price-extractor";
import { updatePrice } from "@/lib/price-tracker";
import {
  detectRetailerLabel,
  isProfitshareUrl,
  resolveCatalogProductUrl,
} from "@/lib/retailer-links";
import {
  regions,
  wineries,
  wines,
  DEFAULT_WINE_SOURCE_BADGE,
  type GrapeVarietyShare,
  type ProducerPageContent,
  type WineSubmitType,
} from "@/lib/schema";
import { mapCsvCategoryToWineType } from "@/lib/wine-csv-schema";
import { loadWineForEditorial } from "@/lib/regenerate-wine-editorial";
import { generateAndApplyFullEditorial } from "@/lib/wine-enrichment";
import { buildWineImageAlt } from "@/lib/wine-images";
import { resolveTechSpecs, techSpecsForDb } from "@/lib/wine-tech-specs";
import {
  buildBallaGezaFocusedPageText,
  inferBallaGezaProducerPageUrl,
  isBallaGezaUrl,
  parseBallaGezaProducerFacts,
  resolveBallaGezaLineSlugSuffix,
} from "@/lib/ballageza-producer";
import {
  inferBudureascaProducerPageUrl,
  isBudureascaUrl,
  parseBudureascaProducerFacts,
} from "@/lib/budureasca-producer";
import {
  inferGabaiProducerPageUrl,
  isGabaiUrl,
  parseGabaiProducerFacts,
} from "@/lib/gabai-producer";
import {
  inferMurfatlarProducerPageUrl,
  isMurfatlarUrl,
  parseMurfatlarProducerFacts,
} from "@/lib/murfatlar-producer";
import {
  enrichWineFromProducerSite,
  inferAvincisProducerPageUrl,
  inferRecasProducerPageUrl,
  parseAvincisProducerFacts,
  parseRecasProducerFacts,
  producerImageSourceFromUrl,
  type ProducerEnrichment,
} from "@/lib/wine-producer-enrichment";
import { buildWineSlug, normalizeSourceUrl, slugify } from "@/lib/wine-url";
import { resolveStoredWineVintage } from "@/lib/wine-vintage";
import { resolveWineSubmitContext } from "@/lib/wine-submit-context";
import { normalizeWineMedals } from "@/lib/wine-medals";
import { findExistingWine, findWineBySourceUrl } from "@/lib/wine-duplicate-detection";
import {
  EXISTING_WINE_CATALOG_MESSAGE,
  WINE_ALREADY_PENDING_MESSAGE,
  WINE_PENDING_REVIEW_MESSAGE,
} from "@/lib/wine-submission-messages";
import { resolveWineryIdFromDetection, detectWineryNameFromCatalog, KNOWN_WINERY_ALIASES } from "@/lib/winery-detection";
import type { WineType, WineWithRelations } from "@/types";

const MAX_PAGE_CHARS = 14_000;

function resolvePreferredProducerPageUrl(finalUrl: string): string | null {
  try {
    const parsed = new URL(finalUrl);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host.includes("cramelerecas.ro") || host.includes("avincis.ro") || host.includes("ballageza.com") || host.includes("budureasca.ro") || host.includes("cramagabai.ro") || host.includes("murfatlar-vinul.ro")) {
      return finalUrl;
    }

    return null;
  } catch {
    return null;
  }
}

function resolvePreferredProducerPageForImport(
  finalUrl: string,
  productName: string,
): string | null {
  return (
    resolvePreferredProducerPageUrl(finalUrl) ??
    inferRecasProducerPageUrl("", finalUrl) ??
    inferAvincisProducerPageUrl("", finalUrl) ??
    inferGabaiProducerPageUrl("", finalUrl) ??
    inferMurfatlarProducerPageUrl("", finalUrl) ??
    inferBallaGezaProducerPageUrl("", finalUrl) ??
    inferBudureascaProducerPageUrl("", finalUrl) ??
    inferRecasProducerPageUrl(productName, finalUrl) ??
    inferAvincisProducerPageUrl(productName, finalUrl) ??
    inferGabaiProducerPageUrl(productName, finalUrl) ??
    inferMurfatlarProducerPageUrl(productName, finalUrl) ??
    inferBallaGezaProducerPageUrl(productName, finalUrl) ??
    inferBudureascaProducerPageUrl(productName, finalUrl)
  );
}

function applySourceProducerFacts<T extends { name: string }>(
  product: T,
  html: string,
  finalUrl: string,
): T {
  const preferredUrl = resolvePreferredProducerPageUrl(finalUrl);
  if (!preferredUrl) return product;

  const facts = finalUrl.includes("avincis.ro")
    ? parseAvincisProducerFacts(html, finalUrl)
    : isGabaiUrl(finalUrl)
      ? parseGabaiProducerFacts(html, finalUrl)
      : isMurfatlarUrl(finalUrl)
        ? parseMurfatlarProducerFacts(html, finalUrl, product.name)
        : finalUrl.includes("ballageza.com")
        ? parseBallaGezaProducerFacts(html, finalUrl)
        : isBudureascaUrl(finalUrl)
          ? parseBudureascaProducerFacts(html, finalUrl)
          : parseRecasProducerFacts(html, finalUrl);
  if (!facts?.name) return product;

  return { ...product, name: facts.name };
}

function qualifiesAsRomanianCatalogWine(
  analysis: Pick<WineLinkAnalysis, "isRomanianWine">,
  product: { name: string; producer: string | null },
  pageText: string,
): boolean {
  if (analysis.isRomanianWine) return true;

  const haystack = `${product.producer ?? ""} ${product.name} ${pageText}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return KNOWN_WINERY_ALIASES.some(
    (winery) =>
      haystack.includes(winery.name.toLowerCase()) ||
      winery.aliases.some((alias) => haystack.includes(alias)),
  );
}

export type AnalyzeWineApiWine = Omit<WineWithRelations, "embedding">;

export interface AnalyzeWineFlowMeta {
  sourceUrl: string;
  finalUrl: string;
  redirectChain: string[];
  submitType: WineSubmitType;
}

export interface AnalyzeWineResult {
  status: "existing" | "created" | "updated" | "rejected" | "pending_review";
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
  wineName = "",
): string {
  const lower = `${wineName} ${pageText}`.toLowerCase();
  const lead = lower.slice(0, 4_000);
  const hasRoseSignal =
    lead.includes("vin rose") ||
    lead.includes("vin roze") ||
    lead.includes("culoare roz") ||
    lead.includes("culoare: roz") ||
    lead.includes("product option roz");
  const hasWhiteSignal =
    lead.includes("vin alb") ||
    lead.includes("white wine") ||
    lead.includes("culoare alb") ||
    lead.includes("culoare: alb") ||
    /\balb\b/.test(lead) && lead.includes("solo quinta cupaj");
  const hasSparklingSignal =
    lead.includes("spumant") ||
    lead.includes("sparkling") ||
    lead.includes("perlaj") ||
    lead.includes("prosecco") ||
    lead.includes("sampanie") ||
    lead.includes("champagne");

  if (hasSparklingSignal) return "spumant";
  if (hasRoseSignal) return "rose";
  if (/\borange\b/.test(lower)) return "orange";
  if (hasWhiteSignal) return "alb";
  if (category?.trim()) return category;
  if (lower.includes("spumant") || lower.includes("sparkling")) return "spumant";
  if (lower.includes("rose") || lower.includes("roze")) return "rose";
  if (lower.includes("orange")) return "orange";
  if (lower.includes("alb") || lower.includes("white")) return "alb";
  return "rosu";
}

function toGrapeShares(names: string[]): GrapeVarietyShare[] {
  return names.map((name) => ({ name }));
}

function resolveWineAnalysis(
  analysis: WineLinkAnalysis,
  pageText: string,
  wineName = "",
): ResolvedWineAnalysis {
  const category = inferCategoryFromText(analysis.category, pageText, wineName);
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

function resolveImportVintage(
  analysis: WineLinkAnalysis,
  product: { vintage: number | null; name: string },
  pageText: string,
  html: string,
  producer: string,
): number | null {
  return resolveStoredWineVintage({
    vintage: analysis.vintage ?? product.vintage ?? null,
    name: product.name,
    slug: buildWineSlug({
      producer,
      name: product.name,
      vintage: analysis.vintage ?? product.vintage ?? null,
    }),
    pageText,
    html,
  });
}

function serializeWineForApi(
  wine: NonNullable<Awaited<ReturnType<typeof loadWineForEditorial>>>,
): AnalyzeWineApiWine {
  const { embedding, ...rest } = wine;
  void embedding;
  return rest;
}

function buildStoredRetailerLinks(
  finalUrl: string,
  fallbackRetailer: string,
  price: number | null | undefined,
  checkedAt: string,
  sourceUrl?: string | null,
) {
  const retailerUrl = resolveCatalogProductUrl(finalUrl);
  const retailer = detectRetailerLabel(retailerUrl) ?? fallbackRetailer;
  const affiliateUrl =
    sourceUrl?.trim() && isProfitshareUrl(sourceUrl)
      ? sourceUrl.trim()
      : retailerUrl;

  return {
    retailer,
    url: retailerUrl,
    availability: [
      {
        retailer,
        url: retailerUrl,
        priceRon: price ?? undefined,
        inStock: true,
        lastCheckedAt: checkedAt,
      },
    ],
    affiliateLinks: [
      {
        retailer,
        url: affiliateUrl,
        priceRon: price ?? undefined,
      },
    ],
  };
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
  const focusedText = isBallaGezaUrl(page.finalUrl)
    ? buildBallaGezaFocusedPageText(page.html, page.finalUrl)
    : null;
  const pageText = (focusedText ?? stripHtml(page.html)).slice(0, MAX_PAGE_CHARS);
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
  vintage: number | null;
} {
  return {
    name: extracted.name ?? analysis.name,
    producer: extracted.producer ?? analysis.producer,
    price: extracted.price ?? analysis.price ?? null,
    retailUrl: extracted.finalUrl,
    vintage: extracted.vintage ?? analysis.vintage ?? null,
  };
}

async function runLinkAnalysis(sourceUrl: string, pageText: string) {
  return generateObject({
    model: getSommelierModel(),
    schema: wineLinkAnalysisSchema,
    system: ANALYZE_WINE_LINK_SYSTEM_PROMPT,
    prompt: buildWineMedalExtractionUserPrompt(sourceUrl, pageText),
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

async function resolveProducerEnrichment(
  wineryId: number,
  wineName: string,
  preferredPageUrl?: string | null,
) {
  const winery = await db.query.wineries.findFirst({
    where: eq(wineries.id, wineryId),
    columns: { website: true, slug: true },
  });

  if (!winery) {
    return enrichWineFromProducerSite({
      wineryWebsite: null,
      winerySlug: "",
      wineName,
      preferredPageUrl,
    });
  }

  return enrichWineFromProducerSite({
    wineryWebsite: winery.website,
    winerySlug: winery.slug,
    wineName,
    preferredPageUrl,
  });
}

function mergeAnalysisPageText(
  retailerPageText: string,
  producerCombinedText: string,
): string {
  return [retailerPageText, producerCombinedText].filter(Boolean).join("\n\n");
}

function producerFieldsForDb(
  producer: Awaited<ReturnType<typeof enrichWineFromProducerSite>>,
  extras?: {
    producerContent?: ProducerPageContent | null;
    producerPageUrl?: string | null;
  },
) {
  const producerPageUrl = extras?.producerPageUrl ?? producer.producerPageUrl;
  return {
    ...(producerPageUrl ? { producerPageUrl } : {}),
    ...(producer.tastingSheetUrl ? { tastingSheetUrl: producer.tastingSheetUrl } : {}),
    ...(extras?.producerContent ? { producerContent: extras.producerContent } : {}),
  };
}

async function resolveWineMedalsAndProducerContent(input: {
  wineName: string;
  sourceUrl: string;
  preferredProducerUrl: string | null;
  llmMedals: WineLinkAnalysis["medals"];
}): Promise<{
  medals: ReturnType<typeof normalizeWineMedals>;
  producerContent: ProducerPageContent | null;
  producerPageUrl: string | null;
}> {
  try {
    const enrichment = await fetchProducerEnrichmentForWine({
      name: input.wineName,
      sourceUrl: input.sourceUrl,
      producerPageUrl: input.preferredProducerUrl,
    });
    const llmMedals = normalizeWineMedals(input.llmMedals);
    return {
      medals: enrichment.medals.length > 0 ? enrichment.medals : llmMedals,
      producerContent: enrichment.content,
      producerPageUrl:
        enrichment.producerPageUrl ?? input.preferredProducerUrl,
    };
  } catch {
    return {
      medals: normalizeWineMedals(input.llmMedals),
      producerContent: null,
      producerPageUrl: input.preferredProducerUrl,
    };
  }
}

function mergeProducerDbFields(
  base: ReturnType<typeof producerFieldsForDb>,
  extras: {
    producerContent: ProducerPageContent | null;
    producerPageUrl: string | null;
  },
) {
  return {
    ...base,
    ...(extras.producerPageUrl ? { producerPageUrl: extras.producerPageUrl } : {}),
    ...(extras.producerContent ? { producerContent: extras.producerContent } : {}),
  };
}

async function resolveTechSpecsPatch(
  wineName: string,
  retailerPageText: string,
  analysis: WineLinkAnalysis,
  wineryId: number,
  preferredPageUrl?: string | null,
) {
  const producer = await resolveProducerEnrichment(
    wineryId,
    wineName,
    preferredPageUrl,
  );
  const enrichedPageText = mergeAnalysisPageText(
    retailerPageText,
    producer.combinedText,
  );
  const canonical = producer.canonical;
  const techSpecs = resolveTechSpecs({
    wineName: canonical?.name ?? wineName,
    pageText: enrichedPageText,
    ai: {
      sweetness: canonical?.sweetness ?? analysis.sweetness ?? null,
      alcohol: canonical?.alcohol ?? analysis.alcohol ?? null,
      sugar: analysis.sugar ?? null,
      acidity: canonical?.acidity ?? analysis.acidity ?? null,
    },
  });

  return {
    techSpecsPatch: techSpecsForDb(techSpecs),
    producerFields: producerFieldsForDb(producer),
    producer,
  };
}

function buildWineDisplayFacts(input: {
  productName: string;
  producer: ProducerEnrichment;
  resolvedVintage: number | null;
  grapeVarieties: GrapeVarietyShare[];
  techSpecsPatch: ReturnType<typeof techSpecsForDb>;
  extractedImage: string | null;
  retailerFinalUrl: string;
  wineryName: string;
  wineType: WineType;
}) {
  const canonical = input.producer.canonical;
  const name = canonical?.name ?? input.productName;
  const vintage = canonical?.vintage ?? input.resolvedVintage;
  const grapeVarieties =
    canonical?.grapeVarieties && canonical.grapeVarieties.length > 0
      ? canonical.grapeVarieties
      : input.grapeVarieties;

  const producerImage = canonical?.imageUrl ?? null;
  const imageUrl = producerImage ?? input.extractedImage ?? undefined;
  const imageSource = imageUrl
    ? producerImage && input.producer.producerPageUrl
      ? producerImageSourceFromUrl(input.producer.producerPageUrl)
      : inferImageSourceFromUrl(input.retailerFinalUrl)
    : undefined;

  return {
    name,
    vintage,
    grapeVarieties,
    imageUrl,
    imageSource,
    imageAlt: buildWineImageAlt({
      name,
      vintage,
      type: input.wineType,
      wineryName: input.wineryName,
    }),
    techSpecsPatch: input.techSpecsPatch,
  };
}

function buildExistingCatalogResult(
  wineId: number,
  slug: string,
  wine: AnalyzeWineApiWine,
  meta: AnalyzeWineFlowMeta,
): AnalyzeWineResult {
  return {
    ...buildAnalyzeSuccessResult("existing", wineId, slug, wine, meta),
    message: EXISTING_WINE_CATALOG_MESSAGE,
  };
}

export async function analyzeAndSaveWineFromUrl(
  rawUrl: string,
  submittedBy = "anonymous",
): Promise<AnalyzeWineResult> {
  const submitContext = resolveWineSubmitContext(rawUrl);
  const { sourceUrl, submitType, initialStatus, sourceBadge } = submitContext;

  const existingBySource = await findWineBySourceUrl(sourceUrl);
  if (existingBySource) {
    const wine = await loadWineForApiResponse(existingBySource.id);
    if (!wine) {
      return { status: "rejected", message: "Vinul exista dar nu a putut fi incarcat." };
    }
    return buildExistingCatalogResult(
      existingBySource.id,
      existingBySource.slug,
      wine,
      {
        sourceUrl,
        finalUrl: sourceUrl,
        redirectChain: [sourceUrl],
        submitType: wine.submitType,
      },
    );
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
  const product = applySourceProducerFacts(
    mergeExtractedWithAnalysis(analysis, extracted),
    html,
    finalUrl,
  );
  const preferredProducerUrl = resolvePreferredProducerPageForImport(
    finalUrl,
    product.name,
  );
  const { medals: resolvedMedals, producerContent, producerPageUrl: enrichedProducerUrl } =
    await resolveWineMedalsAndProducerContent({
      wineName: product.name,
      sourceUrl,
      preferredProducerUrl,
      llmMedals: analysis.medals,
    });
  const analysisForScoring =
    product.price != null ? { ...analysis, price: product.price } : analysis;

  if (!qualifiesAsRomanianCatalogWine(analysis, product, pageText)) {
    return {
      status: "rejected",
      message:
        analysis.reasonIfNotRomanian ??
        "Cred ca acest vin nu este romanesc. VinIntel.ro se concentreaza doar pe vinuri produse in Romania.",
      meta: flowMeta,
    };
  }

  const resolved = resolveWineAnalysis(analysisForScoring, pageText, product.name);
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

  const resolvedVintage = resolveImportVintage(
    analysis,
    product,
    pageText,
    html,
    detectedWineryName,
  );
  const { techSpecsPatch, producerFields, producer } =
    await resolveTechSpecsPatch(
      product.name,
      pageText,
      analysisForScoring,
      wineryId,
      enrichedProducerUrl ?? preferredProducerUrl,
    );
  const display = buildWineDisplayFacts({
    productName: product.name,
    producer,
    resolvedVintage,
    grapeVarieties: resolved.grapeVarieties,
    techSpecsPatch,
    extractedImage: extracted.imageUrl,
    retailerFinalUrl: finalUrl,
    wineryName: detectedWineryName,
    wineType: resolved.wineType,
  });
  const slug = `${buildWineSlug({
    producer: detectedWineryName,
    name: display.name,
    vintage: display.vintage,
  })}${resolveBallaGezaLineSlugSuffix(finalUrl)}`;

  const existingMatch = await findExistingWine({
    sourceUrl,
    finalUrl,
    name: display.name,
    producer: detectedWineryName,
    vintage: display.vintage,
    wineryId,
  });

  if (existingMatch) {
    const wine = await loadWineForApiResponse(existingMatch.id);
    if (!wine) {
      return { status: "rejected", message: "Vin duplicat dar nu a putut fi incarcat." };
    }
    return buildExistingCatalogResult(
      existingMatch.id,
      existingMatch.slug,
      wine,
      flowMeta,
    );
  }

  const retailerLinks = buildStoredRetailerLinks(
    finalUrl,
    detectedWineryName,
    product.price,
    resolved.checkedAt,
    sourceUrl,
  );

  const status =
    submittedBy === "admin-cli" ? ("verified" as const) : initialStatus;
  const badge =
    submittedBy === "admin-cli" ? DEFAULT_WINE_SOURCE_BADGE : sourceBadge;

  const [created] = await db
    .insert(wines)
    .values({
      slug,
      name: display.name,
      wineryId,
      regionId,
      type: resolved.wineType,
      vintage: display.vintage ?? undefined,
      grapeVarieties: display.grapeVarieties,
      priceAvg: product.price ?? undefined,
      sourceUrl,
      submittedBy,
      submitType,
      status,
      sourceBadge: badge,
      availability: retailerLinks.availability,
      affiliateLinks: retailerLinks.affiliateLinks,
      imageUrl: display.imageUrl,
      imageSource: display.imageSource,
      imageAlt: display.imageAlt,
      medals: resolvedMedals,
      ...display.techSpecsPatch,
      ...mergeProducerDbFields(producerFields, {
        producerContent,
        producerPageUrl: enrichedProducerUrl,
      }),
    })
    .returning({ id: wines.id, slug: wines.slug });

  if (product.price != null) {
    await updatePrice(created.id, product.price, retailerLinks.url);
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

export async function analyzeWineSubmissionFromUrl(
  rawUrl: string,
  email?: string,
): Promise<AnalyzeWineResult> {
  const submitContext = resolveWineSubmitContext(rawUrl);
  const { sourceUrl, submitType, sourceBadge } = submitContext;
  const flowMetaBase = {
    sourceUrl,
    finalUrl: sourceUrl,
    redirectChain: [sourceUrl],
    submitType,
  };

  const { html, pageText, finalUrl, redirectChain } =
    await fetchSourcePageContent(sourceUrl);
  const flowMeta: AnalyzeWineFlowMeta = {
    ...flowMetaBase,
    finalUrl,
    redirectChain,
  };

  const extracted = await extractProductFromHtml(html, finalUrl, { sourceUrl });
  const { object: analysis } = await runLinkAnalysis(finalUrl, pageText);
  const product = applySourceProducerFacts(
    mergeExtractedWithAnalysis(analysis, extracted),
    html,
    finalUrl,
  );
  const preferredProducerUrl = resolvePreferredProducerPageForImport(
    finalUrl,
    product.name,
  );
  const { medals: resolvedMedals, producerContent, producerPageUrl: enrichedProducerUrl } =
    await resolveWineMedalsAndProducerContent({
      wineName: product.name,
      sourceUrl,
      preferredProducerUrl,
      llmMedals: analysis.medals,
    });
  const analysisForScoring =
    product.price != null ? { ...analysis, price: product.price } : analysis;

  if (!qualifiesAsRomanianCatalogWine(analysis, product, pageText)) {
    return {
      status: "rejected",
      message:
        analysis.reasonIfNotRomanian ??
        "Cred ca acest vin nu este romanesc. VinIntel.ro se concentreaza doar pe vinuri produse in Romania.",
      meta: flowMeta,
    };
  }

  const resolved = resolveWineAnalysis(analysisForScoring, pageText, product.name);
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

  const existingMatch = await findExistingWine({
    sourceUrl,
    finalUrl,
    name: product.name,
    producer: detectedWineryName,
    vintage: resolveImportVintage(
      analysis,
      product,
      pageText,
      html,
      detectedWineryName,
    ),
    wineryId,
  });

  if (existingMatch) {
    if (existingMatch.status === "verified") {
      const wine = await loadWineForApiResponse(existingMatch.id);
      if (!wine) {
        return { status: "rejected", message: "Vinul exista dar nu a putut fi incarcat." };
      }
      return buildExistingCatalogResult(
        existingMatch.id,
        existingMatch.slug,
        wine,
        flowMeta,
      );
    }

    return {
      status: "existing",
      wineId: existingMatch.id,
      slug: existingMatch.slug,
      message: WINE_ALREADY_PENDING_MESSAGE,
      meta: flowMeta,
      submitType,
    };
  }

  const resolvedVintage = resolveImportVintage(
    analysis,
    product,
    pageText,
    html,
    detectedWineryName,
  );
  const slug = `${buildWineSlug({
    producer: detectedWineryName,
    name: product.name,
    vintage: resolvedVintage,
  })}${resolveBallaGezaLineSlugSuffix(finalUrl)}`;

  const { techSpecsPatch, producerFields } = await resolveTechSpecsPatch(
    product.name,
    pageText,
    analysisForScoring,
    wineryId,
    enrichedProducerUrl ?? preferredProducerUrl,
  );

  const retailerLinks = buildStoredRetailerLinks(
    finalUrl,
    detectedWineryName,
    product.price,
    resolved.checkedAt,
    sourceUrl,
  );

  const normalizedEmail = email?.trim().toLowerCase() ?? "";

  const [created] = await db
    .insert(wines)
    .values({
      slug,
      name: product.name,
      wineryId,
      regionId,
      type: resolved.wineType,
      vintage: resolvedVintage ?? undefined,
      grapeVarieties: resolved.grapeVarieties,
      priceAvg: product.price ?? undefined,
      sourceUrl,
      submittedBy: normalizedEmail || undefined,
      submittedEmail: normalizedEmail || undefined,
      submitType: "community",
      status: "user_submitted",
      sourceBadge,
      availability: retailerLinks.availability,
      affiliateLinks: retailerLinks.affiliateLinks,
      imageUrl: extracted.imageUrl ?? undefined,
      imageSource: extracted.imageUrl
        ? inferImageSourceFromUrl(finalUrl)
        : undefined,
      imageAlt: buildWineImageAlt({
        name: product.name,
        vintage: resolvedVintage,
        type: resolved.wineType,
        wineryName: detectedWineryName,
      }),
      medals: resolvedMedals,
      ...techSpecsPatch,
      ...mergeProducerDbFields(producerFields, {
        producerContent,
        producerPageUrl: enrichedProducerUrl,
      }),
    })
    .returning({ id: wines.id, slug: wines.slug });

  if (product.price != null) {
    await updatePrice(created.id, product.price, retailerLinks.url);
  }

  const { saveWineSubmissionNotification } = await import(
    "@/lib/wine-submission-notifications"
  );
  await saveWineSubmissionNotification({
    email: normalizedEmail,
    sourceUrl,
    wineId: created.id,
  });

  return {
    status: "pending_review",
    wineId: created.id,
    slug: created.slug,
    message: WINE_PENDING_REVIEW_MESSAGE,
    meta: flowMeta,
    submitType: "community",
  };
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
  const product = applySourceProducerFacts(
    mergeExtractedWithAnalysis(analysis, extracted),
    html,
    finalUrl,
  );
  const preferredProducerUrl = resolvePreferredProducerPageForImport(
    finalUrl,
    product.name,
  );
  const { medals: resolvedMedals, producerContent, producerPageUrl: enrichedProducerUrl } =
    await resolveWineMedalsAndProducerContent({
      wineName: product.name,
      sourceUrl,
      preferredProducerUrl,
      llmMedals: analysis.medals,
    });
  const analysisForScoring =
    product.price != null ? { ...analysis, price: product.price } : analysis;

  if (!qualifiesAsRomanianCatalogWine(analysis, product, pageText)) {
    return {
      status: "rejected",
      message:
        analysis.reasonIfNotRomanian ??
        "Re-analiza indica ca vinul nu este romanesc.",
      meta: flowMeta,
    };
  }

  const resolved = resolveWineAnalysis(analysisForScoring, pageText, product.name);
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

  const resolvedVintage = resolveImportVintage(
    analysis,
    product,
    pageText,
    html,
    detectedWineryName,
  );

  const { techSpecsPatch, producerFields } = await resolveTechSpecsPatch(
    product.name,
    pageText,
    analysisForScoring,
    wineryId,
    enrichedProducerUrl ?? preferredProducerUrl,
  );

  const imagePatch =
    shouldUpdateImageFromSource(extracted.imageUrl, wine.imageSource) &&
    extracted.imageUrl
      ? {
          imageUrl: extracted.imageUrl,
          imageSource: inferImageSourceFromUrl(finalUrl),
        }
      : {};

  const retailerLinks = buildStoredRetailerLinks(
    finalUrl,
    detectedWineryName,
    product.price,
    resolved.checkedAt,
    sourceUrl,
  );

  await db
    .update(wines)
    .set({
      name: product.name,
      wineryId,
      regionId,
      type: resolved.wineType,
      vintage: resolvedVintage ?? undefined,
      grapeVarieties: resolved.grapeVarieties,
      priceAvg: product.price ?? undefined,
      availability: retailerLinks.availability,
      affiliateLinks: retailerLinks.affiliateLinks,
      imageAlt: buildWineImageAlt({
        name: product.name,
        vintage: resolvedVintage,
        type: resolved.wineType,
        wineryName: detectedWineryName,
      }),
      medals: resolvedMedals,
      ...imagePatch,
      ...techSpecsPatch,
      ...mergeProducerDbFields(producerFields, {
        producerContent,
        producerPageUrl: enrichedProducerUrl,
      }),
    })
    .where(eq(wines.id, wine.id));

  if (product.price != null) {
    await updatePrice(wine.id, product.price, retailerLinks.url);
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
