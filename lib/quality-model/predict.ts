import type { QualityFeatureInput } from "@/lib/quality-model/types";
import { loadQualityModelSync } from "@/lib/quality-model/storage";
import { predictQuality } from "@/lib/quality-model/ridge";

let cachedModel = loadQualityModelSync();

export function resetQualityModelCache(): void {
  cachedModel = loadQualityModelSync();
}

export async function getQualityModel() {
  if (!cachedModel) {
    cachedModel = loadQualityModelSync();
  }
  return cachedModel;
}

export function predictEstimatedQualitySync(
  features: QualityFeatureInput,
): number | null {
  if (!cachedModel) {
    cachedModel = loadQualityModelSync();
  }
  if (!cachedModel) return null;
  return predictQuality(features, cachedModel);
}

export async function predictEstimatedQuality(
  features: QualityFeatureInput,
): Promise<number | null> {
  return predictEstimatedQualitySync(features);
}

export async function preloadQualityModel(): Promise<boolean> {
  cachedModel = loadQualityModelSync();
  return cachedModel != null;
}
