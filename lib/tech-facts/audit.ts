/**
 * Read-only baseline coverage for verified wines.
 */
import type { RecoverableWine, WineTechRecovery } from "@/lib/tech-facts/recover";

export interface WineryCoverageRow {
  winery: string;
  wines: number;
  alcohol: number;
  acidity: number;
  sugar: number;
  sweetness: number;
  vintage: number;
  grapes: number;
  producerPageUrl: number;
  tastingSheetUrl: number;
  producerFacts: number;
  sourceUrls: number;
}

export interface TechAuditReport {
  totalVerified: number;
  alcoholPresent: number;
  acidityPresent: number;
  sugarPresent: number;
  sweetnessPresent: number;
  vintagePresent: number;
  grapesPresent: number;
  producerPageUrl: number;
  tastingSheetUrl: number;
  producerFacts: number;
  sourceUrls: number;
  byWinery: WineryCoverageRow[];
  unsourced: {
    alcohol: number;
    acidity: number;
    sugar: number;
    sweetness: number;
    vintage: number;
  };
  outliers: Array<{ slug: string; field: string; value: number }>;
}

function present<T>(value: T | null | undefined): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function buildTechAuditReport(
  wines: RecoverableWine[],
  recoveries?: WineTechRecovery[],
): TechAuditReport {
  const byWinery = new Map<string, WineryCoverageRow>();
  const outliers: TechAuditReport["outliers"] = [];
  const unsourced = { alcohol: 0, acidity: 0, sugar: 0, sweetness: 0, vintage: 0 };
  const recoveryById = new Map((recoveries ?? []).map((row) => [row.wineId, row]));

  for (const wine of wines) {
    const key = wine.winerySlug ?? wine.wineryName ?? "unknown";
    const row = byWinery.get(key) ?? {
      winery: key,
      wines: 0,
      alcohol: 0,
      acidity: 0,
      sugar: 0,
      sweetness: 0,
      vintage: 0,
      grapes: 0,
      producerPageUrl: 0,
      tastingSheetUrl: 0,
      producerFacts: 0,
      sourceUrls: 0,
    };
    row.wines += 1;
    if (present(wine.alcohol)) row.alcohol += 1;
    if (present(wine.acidity)) row.acidity += 1;
    if (present(wine.sugar)) row.sugar += 1;
    if (present(wine.sweetness)) row.sweetness += 1;
    if (present(wine.vintage)) row.vintage += 1;
    if (wine.grapeVarieties.length > 0) row.grapes += 1;
    if (present(wine.producerPageUrl)) row.producerPageUrl += 1;
    if (present(wine.tastingSheetUrl)) row.tastingSheetUrl += 1;
    if (wine.producerContent?.facts) row.producerFacts += 1;
    if ((wine.producerContent?.sourceUrls?.length ?? 0) > 0) row.sourceUrls += 1;
    byWinery.set(key, row);

    if (wine.alcohol != null && (wine.alcohol < 8 || wine.alcohol > 18)) {
      outliers.push({ slug: wine.slug, field: "alcohol", value: wine.alcohol });
    }
    if (wine.acidity != null && (wine.acidity < 2 || wine.acidity > 12)) {
      outliers.push({ slug: wine.slug, field: "acidity", value: wine.acidity });
    }

    const recovery = recoveryById.get(wine.id);
    if (recovery) {
      for (const field of recovery.fields) {
        if (field.storedClass === "UNSOURCED_STORED") {
          if (field.field === "alcohol") unsourced.alcohol += 1;
          if (field.field === "acidity") unsourced.acidity += 1;
          if (field.field === "sugar") unsourced.sugar += 1;
          if (field.field === "sweetness") unsourced.sweetness += 1;
          if (field.field === "vintage") unsourced.vintage += 1;
        }
      }
    }
  }

  return {
    totalVerified: wines.length,
    alcoholPresent: wines.filter((wine) => present(wine.alcohol)).length,
    acidityPresent: wines.filter((wine) => present(wine.acidity)).length,
    sugarPresent: wines.filter((wine) => present(wine.sugar)).length,
    sweetnessPresent: wines.filter((wine) => present(wine.sweetness)).length,
    vintagePresent: wines.filter((wine) => present(wine.vintage)).length,
    grapesPresent: wines.filter((wine) => wine.grapeVarieties.length > 0).length,
    producerPageUrl: wines.filter((wine) => present(wine.producerPageUrl)).length,
    tastingSheetUrl: wines.filter((wine) => present(wine.tastingSheetUrl)).length,
    producerFacts: wines.filter((wine) => Boolean(wine.producerContent?.facts)).length,
    sourceUrls: wines.filter((wine) => (wine.producerContent?.sourceUrls?.length ?? 0) > 0).length,
    byWinery: [...byWinery.values()].sort((left, right) => right.wines - left.wines),
    unsourced,
    outliers,
  };
}
