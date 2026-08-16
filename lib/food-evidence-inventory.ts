/**
 * Official culinary source inventory. No network. No writes.
 */
import { classifySourceUrl, isOfficialProducerSource } from "@/lib/source-trust";
import type { WineWithRelations } from "@/types";

export const CULINARY_SOURCE_KINDS = [
  "exact_producer_page",
  "producer_catalog",
  "tasting_sheet",
  "technical_pdf",
  "existing_producer_content",
  "existing_tasting_notes",
  "retailer_only",
  "no_source",
] as const;

export type CulinarySourceKind = (typeof CULINARY_SOURCE_KINDS)[number];

export interface WineCulinarySourceInventory {
  slug: string;
  winery: string;
  winerySlug: string;
  kinds: CulinarySourceKind[];
  exactProducerUrl: string | null;
  catalogUrl: string | null;
  tastingSheetUrl: string | null;
  technicalPdf: boolean;
  hasProducerContent: boolean;
  hasTastingNotes: boolean;
  retailerOnly: boolean;
  noSource: boolean;
}

export interface WinerySourceCoverage {
  winery: string;
  winerySlug: string;
  wineCount: number;
  exactProducerUrls: number;
  tastingSheets: number;
  catalogUrls: number;
  technicalPdfs: number;
  existingProducerContent: number;
  existingTastingNotes: number;
  retailerOnly: number;
  noSource: number;
}

function isPdfUrl(url: string | null | undefined): boolean {
  return Boolean(url && /\.pdf(\?|#|$)/i.test(url));
}

function officialUrlOfType(
  url: string | null | undefined,
  wanted: "producer_page" | "producer_catalog" | "tasting_sheet",
): string | null {
  if (!url?.trim()) return null;
  return classifySourceUrl(url, { isPdf: isPdfUrl(url) }) === wanted ? url : null;
}

export function inventoryWineCulinarySources(
  wine: WineWithRelations,
): WineCulinarySourceInventory {
  const producerPage = wine.producerPageUrl?.trim() || null;
  const tastingSheet = wine.tastingSheetUrl?.trim() || null;
  const sourceUrl = wine.sourceUrl?.trim() || null;
  const exactProducerUrl =
    officialUrlOfType(producerPage, "producer_page") ??
    officialUrlOfType(sourceUrl, "producer_page");
  const catalogUrl =
    officialUrlOfType(producerPage, "producer_catalog") ??
    officialUrlOfType(sourceUrl, "producer_catalog");
  const tastingSheetUrl =
    tastingSheet ?? officialUrlOfType(sourceUrl, "tasting_sheet");
  const technicalPdf = isPdfUrl(tastingSheetUrl) || isPdfUrl(producerPage);
  const hasProducerContent = Boolean(
    wine.producerContent?.culinaryPairings?.trim() ||
      wine.producerContent?.tastingNotes?.trim() ||
      wine.producerContent?.viticulture?.trim(),
  );
  const hasTastingNotes = Boolean(wine.tastingNotes?.trim());

  const kinds: CulinarySourceKind[] = [];
  if (exactProducerUrl) kinds.push("exact_producer_page");
  if (catalogUrl) kinds.push("producer_catalog");
  if (tastingSheetUrl) kinds.push("tasting_sheet");
  if (technicalPdf) kinds.push("technical_pdf");
  if (hasProducerContent) kinds.push("existing_producer_content");
  if (hasTastingNotes) kinds.push("existing_tasting_notes");

  const official = [producerPage, tastingSheet, sourceUrl].some((url) =>
    isOfficialProducerSource(classifySourceUrl(url, { isPdf: isPdfUrl(url) })),
  );
  const retailerOnly =
    !official &&
    [producerPage, tastingSheet, sourceUrl].some((url) => {
      const kind = classifySourceUrl(url);
      return kind === "retailer" || kind === "marketplace";
    });
  if (retailerOnly) kinds.push("retailer_only");
  const noSource = kinds.length === 0;
  if (noSource) kinds.push("no_source");

  return {
    slug: wine.slug,
    winery: wine.winery?.name ?? "",
    winerySlug: wine.winery?.slug ?? "",
    kinds,
    exactProducerUrl,
    catalogUrl,
    tastingSheetUrl,
    technicalPdf,
    hasProducerContent,
    hasTastingNotes,
    retailerOnly,
    noSource,
  };
}

export function summarizeCulinarySourceInventory(
  rows: WineCulinarySourceInventory[],
): WinerySourceCoverage[] {
  const byWinery = new Map<string, WinerySourceCoverage>();
  for (const row of rows) {
    const key = row.winerySlug || row.winery || "unknown";
    const current = byWinery.get(key) ?? {
      winery: row.winery,
      winerySlug: row.winerySlug,
      wineCount: 0,
      exactProducerUrls: 0,
      tastingSheets: 0,
      catalogUrls: 0,
      technicalPdfs: 0,
      existingProducerContent: 0,
      existingTastingNotes: 0,
      retailerOnly: 0,
      noSource: 0,
    };
    current.wineCount += 1;
    if (row.exactProducerUrl) current.exactProducerUrls += 1;
    if (row.tastingSheetUrl) current.tastingSheets += 1;
    if (row.catalogUrl) current.catalogUrls += 1;
    if (row.technicalPdf) current.technicalPdfs += 1;
    if (row.hasProducerContent) current.existingProducerContent += 1;
    if (row.hasTastingNotes) current.existingTastingNotes += 1;
    if (row.retailerOnly) current.retailerOnly += 1;
    if (row.noSource) current.noSource += 1;
    byWinery.set(key, current);
  }
  return [...byWinery.values()].sort((left, right) => right.wineCount - left.wineCount);
}
