import { isAutochthonousGrapeMix, isPremiumValueRegion } from "@/lib/scoring";
import type { WineMedal } from "@/lib/schema";
import type { QualityFeatureInput } from "@/lib/quality-model/types";

function normalizeWineType(wineType: string | null | undefined): string {
  return (wineType ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function medalWeight(medal: WineMedal): number {
  switch (medal.medal) {
    case "gold":
    case "double_gold":
    case "best_in_class":
      return 7;
    case "silver":
      return 4;
    case "bronze":
      return 2;
    default:
      return 1;
  }
}

export function computeMedalWeight(medals: WineMedal[] | null | undefined): number {
  return (medals ?? []).reduce((sum, medal) => sum + medalWeight(medal), 0);
}

export function primaryGrape(grapeVarieties: string[] | undefined): string {
  const first = grapeVarieties?.[0]?.trim();
  if (!first) return "unknown";
  return first
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeRegionKey(region: string | null | undefined): string {
  if (!region?.trim()) return "unknown";
  return region
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function normalizeWineryKey(wineryName: string | null | undefined): string {
  if (!wineryName?.trim()) return "unknown";
  return wineryName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function buildFeatureInputFromWine(input: {
  type?: string | null;
  vintage?: number | null;
  grapeVarieties?: { name: string }[] | string[] | null;
  region?: { name: string } | string | null;
  winery?: { name: string } | string | null;
  alcohol?: number | null;
  acidity?: number | null;
  cellarPotential?: number | null;
  medals?: WineMedal[] | null;
}): QualityFeatureInput {
  const grapes = (input.grapeVarieties ?? []).map((entry) =>
    typeof entry === "string" ? entry : entry.name,
  );
  const regionName =
    typeof input.region === "string"
      ? input.region
      : input.region?.name ?? null;
  const wineryName =
    typeof input.winery === "string"
      ? input.winery
      : input.winery?.name ?? null;

  return {
    wineType: input.type ?? null,
    vintage: input.vintage ?? null,
    grapeVarieties: grapes,
    region: regionName,
    wineryName,
    alcohol: input.alcohol ?? null,
    acidity: input.acidity ?? null,
    cellarPotential: input.cellarPotential ?? null,
    medalWeight: computeMedalWeight(input.medals),
    isAutochthonous: isAutochthonousGrapeMix(grapes),
    isPremiumRegion: isPremiumValueRegion(regionName ?? ""),
  };
}

export function vintageAge(
  vintage: number | null | undefined,
  referenceYear = new Date().getFullYear(),
): number {
  if (vintage == null) return 3;
  return Math.max(0, referenceYear - vintage);
}

export interface EncodedCategoryMaps {
  globalMean: number;
  region: Record<string, number>;
  winery: Record<string, number>;
  primaryGrape: Record<string, number>;
}

export function buildTargetEncodings(
  rows: Array<{ features: QualityFeatureInput; label: number }>,
): EncodedCategoryMaps {
  const globalMean =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + row.label, 0) / rows.length
      : 70;

  return {
    globalMean,
    region: buildCategoryMeans(rows, (row) =>
      normalizeRegionKey(row.features.region),
    ),
    winery: buildCategoryMeans(rows, (row) =>
      normalizeWineryKey(row.features.wineryName),
    ),
    primaryGrape: buildCategoryMeans(rows, (row) =>
      primaryGrape(row.features.grapeVarieties),
    ),
  };
}

function buildCategoryMeans(
  rows: Array<{ features: QualityFeatureInput; label: number }>,
  keyFn: (row: { features: QualityFeatureInput; label: number }) => string,
): Record<string, number> {
  const buckets = new Map<string, number[]>();
  for (const row of rows) {
    const key = keyFn(row);
    const list = buckets.get(key) ?? [];
    list.push(row.label);
    buckets.set(key, list);
  }

  const result: Record<string, number> = {};
  for (const [key, values] of buckets) {
    result[key] = values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  return result;
}

export interface NormalizationStats {
  mean: number;
  std: number;
}

export function computeNormalization(values: number[]): NormalizationStats {
  if (values.length === 0) return { mean: 0, std: 1 };
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    values.length;
  const std = Math.sqrt(variance) || 1;
  return { mean, std };
}

export function normalizeValue(value: number, stats: NormalizationStats): number {
  return (value - stats.mean) / stats.std;
}

export interface FeatureVector {
  names: string[];
  values: number[];
}

export function encodeFeatures(
  features: QualityFeatureInput,
  encodings: EncodedCategoryMaps,
  normalization: {
    vintageAge: NormalizationStats;
    alcohol: NormalizationStats;
    acidity: NormalizationStats;
    cellarPotential: NormalizationStats;
    medalLog: NormalizationStats;
  },
  referenceYear = new Date().getFullYear(),
): FeatureVector {
  const type = normalizeWineType(features.wineType);
  const age = vintageAge(features.vintage, referenceYear);
  const medalLog = Math.log2(1 + (features.medalWeight ?? 0));
  const alcohol = features.alcohol ?? normalization.alcohol.mean;
  const acidity = features.acidity ?? normalization.acidity.mean;
  const cellar = features.cellarPotential ?? normalization.cellarPotential.mean;

  const regionKey = normalizeRegionKey(features.region);
  const wineryKey = normalizeWineryKey(features.wineryName);
  const grapeKey = primaryGrape(features.grapeVarieties);

  const names = [
    "type_red",
    "type_white",
    "type_rose",
    "type_sparkling",
    "type_other",
    "autochthonous",
    "premium_region",
    "vintage_age",
    "alcohol",
    "acidity",
    "cellar_potential",
    "medal_log",
    "region_enc",
    "winery_enc",
    "grape_enc",
  ];

  const values = [
    type === "red" || type === "rosu" ? 1 : 0,
    type === "white" || type === "alb" ? 1 : 0,
    type === "rose" || type === "roze" ? 1 : 0,
    type === "sparkling" || type === "spumant" ? 1 : 0,
    type === "dessert" || type === "orange" || type === "dulce" ? 1 : 0,
    features.isAutochthonous ? 1 : 0,
    features.isPremiumRegion ? 1 : 0,
    normalizeValue(age, normalization.vintageAge),
    normalizeValue(alcohol, normalization.alcohol),
    normalizeValue(acidity, normalization.acidity),
    normalizeValue(cellar, normalization.cellarPotential),
    normalizeValue(medalLog, normalization.medalLog),
    (encodings.region[regionKey] ?? encodings.globalMean) / 100,
    (encodings.winery[wineryKey] ?? encodings.globalMean) / 100,
    (encodings.primaryGrape[grapeKey] ?? encodings.globalMean) / 100,
  ];

  return { names, values };
}

export function buildNormalizationFromRows(
  rows: Array<{ features: QualityFeatureInput }>,
  referenceYear = new Date().getFullYear(),
): {
  vintageAge: NormalizationStats;
  alcohol: NormalizationStats;
  acidity: NormalizationStats;
  cellarPotential: NormalizationStats;
  medalLog: NormalizationStats;
} {
  const ages = rows.map((row) => vintageAge(row.features.vintage, referenceYear));
  const alcohols = rows.map((row) => row.features.alcohol ?? 12.5);
  const acids = rows.map((row) => row.features.acidity ?? 5.5);
  const cellars = rows.map((row) => row.features.cellarPotential ?? 2);
  const medalLogs = rows.map((row) =>
    Math.log2(1 + (row.features.medalWeight ?? 0)),
  );

  return {
    vintageAge: computeNormalization(ages),
    alcohol: computeNormalization(alcohols),
    acidity: computeNormalization(acids),
    cellarPotential: computeNormalization(cellars),
    medalLog: computeNormalization(medalLogs),
  };
}
