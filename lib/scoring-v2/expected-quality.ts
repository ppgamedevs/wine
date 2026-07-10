import { clamp, round1 } from "@/lib/scoring-v2/math";

/** Parametric expected quality E(price, type): monoton in log(pret). */
const TYPE_CURVES: Record<string, { intercept: number; logSlope: number }> = {
  red: { intercept: 46, logSlope: 6.2 },
  white: { intercept: 47, logSlope: 6.0 },
  rose: { intercept: 45, logSlope: 6.1 },
  sparkling: { intercept: 45, logSlope: 6.5 },
  orange: { intercept: 48, logSlope: 6.0 },
  dessert: { intercept: 44, logSlope: 6.3 },
};

const DEFAULT_CURVE = { intercept: 46, logSlope: 6.1 };

function normalizeWineTypeKey(wineType: string | undefined): string {
  const value = (wineType ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (value === "rosu" || value === "red") return "red";
  if (value === "alb" || value === "white") return "white";
  if (value === "rose" || value === "roze" || value === "roz") return "rose";
  if (value === "spumant" || value === "sparkling") return "sparkling";
  if (value === "orange") return "orange";
  if (value === "desert" || value === "dulce" || value === "dessert") {
    return "dessert";
  }
  return value || "white";
}

export function expectedQualityAtPrice(
  price: number,
  wineType: string | undefined,
  curveOverrides?: Map<string, { intercept: number; logSlope: number }>,
): number {
  const safePrice = Math.max(price, 1);
  const typeKey = normalizeWineTypeKey(wineType);
  const curve =
    curveOverrides?.get(typeKey) ?? TYPE_CURVES[typeKey] ?? DEFAULT_CURVE;
  const raw = curve.intercept + curve.logSlope * Math.log(safePrice);
  return round1(clamp(raw, 40, 92));
}

export interface ExpectedQualitySample {
  price: number;
  wineType: string | undefined;
  modelQuality: number;
}

/**
 * Build log-price regression curves from catalog samples (batch recalc pass 1).
 */
export function buildExpectedQualityCurvesFromCatalog(
  samples: ExpectedQualitySample[],
): Map<string, { intercept: number; logSlope: number }> {
  const grouped = new Map<string, ExpectedQualitySample[]>();

  for (const sample of samples) {
    const key = normalizeWineTypeKey(sample.wineType);
    const bucket = grouped.get(key) ?? [];
    bucket.push(sample);
    grouped.set(key, bucket);
  }

  const curves = new Map<string, { intercept: number; logSlope: number }>();

  for (const [typeKey, rows] of grouped) {
    if (rows.length < 8) {
      curves.set(typeKey, TYPE_CURVES[typeKey] ?? DEFAULT_CURVE);
      continue;
    }

    let sumX = 0;
    let sumY = 0;
    let sumXX = 0;
    let sumXY = 0;
    const n = rows.length;

    for (const row of rows) {
      const x = Math.log(Math.max(row.price, 1));
      const y = row.modelQuality;
      sumX += x;
      sumY += y;
      sumXX += x * x;
      sumXY += x * y;
    }

    const denominator = n * sumXX - sumX * sumX;
    if (Math.abs(denominator) < 1e-6) {
      curves.set(typeKey, TYPE_CURVES[typeKey] ?? DEFAULT_CURVE);
      continue;
    }

    const logSlope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - logSlope * sumX) / n;

    curves.set(typeKey, {
      intercept: clamp(intercept, 38, 55),
      logSlope: clamp(logSlope, 4.5, 8.5),
    });
  }

  return curves;
}

export function priceBucketForPeerPrior(price: number): string {
  if (price < 35) return "under35";
  if (price < 55) return "35-55";
  if (price < 85) return "55-85";
  if (price < 120) return "85-120";
  return "120+";
}
