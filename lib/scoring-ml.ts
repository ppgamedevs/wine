/**
 * Estimare calitate via model local antrenat (data/quality-model.json)
 * sau microserviciu extern daca VALUE_SCORE_ML_URL este setat.
 */
import type { QualityFeatureInput } from "@/lib/quality-model/types";
import { buildFeatureInputFromWine } from "@/lib/quality-model/features";
import { predictEstimatedQualitySync } from "@/lib/quality-model/predict";

export interface MlQualityEstimateRequest {
  wineId?: number;
  slug?: string;
  grapeVarieties?: string[];
  region?: string;
  wineryName?: string;
  wineType?: string;
  vintage?: number | null;
  alcohol?: number | null;
  acidity?: number | null;
  cellarPotential?: number | null;
  medals?: import("@/lib/schema").WineMedal[];
}

export interface MlQualityEstimateResponse {
  qHat: number;
  confidence: number;
  modelVersion: string;
}

const ML_SERVICE_URL = process.env.VALUE_SCORE_ML_URL;

export function estimateQualityLocally(
  request: MlQualityEstimateRequest,
): number | null {
  const features: QualityFeatureInput = buildFeatureInputFromWine({
    type: request.wineType,
    vintage: request.vintage,
    grapeVarieties: request.grapeVarieties,
    region: request.region,
    winery: request.wineryName,
    alcohol: request.alcohol,
    acidity: request.acidity,
    cellarPotential: request.cellarPotential,
    medals: request.medals,
  });

  return predictEstimatedQualitySync(features);
}

export async function fetchMlEstimatedQuality(
  request: MlQualityEstimateRequest,
): Promise<number | null> {
  const local = estimateQualityLocally(request);
  if (local != null) return local;

  if (!ML_SERVICE_URL) return null;

  try {
    const response = await fetch(`${ML_SERVICE_URL}/estimate-quality`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as MlQualityEstimateResponse;
    if (!Number.isFinite(data.qHat)) return null;

    return data.qHat;
  } catch {
    return null;
  }
}
