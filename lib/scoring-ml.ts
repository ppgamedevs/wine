/**
 * ML quality estimation stub. Replace with internal microservice when deployed.
 */
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
}

export interface MlQualityEstimateResponse {
  qHat: number;
  confidence: number;
  modelVersion: string;
}

const ML_SERVICE_URL = process.env.VALUE_SCORE_ML_URL;

export async function fetchMlEstimatedQuality(
  request: MlQualityEstimateRequest,
): Promise<number | null> {
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
