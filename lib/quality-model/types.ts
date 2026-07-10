/** Observatie de calitate reala pentru antrenare / validare. */
export interface QualityDataPoint {
  wineId: string;
  slug: string;
  name: string;
  /** Decanter, James Suckling etc. (0-100). */
  criticScore?: number;
  /** Vivino sau similar, scala 1-5. */
  vivinoRating?: number;
  /** Degustari proprii VinIntel (0-100). */
  expertRating?: number;
  /** Community score sau review-uri utilizatori (0-100). */
  consumerRating?: number;
}

export interface QualityTrainingRow extends QualityDataPoint {
  /** Eticheta compusa din sursele disponibile (40-98). */
  label: number;
  labelSources: string[];
  features: QualityFeatureInput;
}

export interface QualityFeatureInput {
  wineType?: string | null;
  vintage?: number | null;
  grapeVarieties?: string[];
  region?: string | null;
  wineryName?: string | null;
  alcohol?: number | null;
  acidity?: number | null;
  cellarPotential?: number | null;
  medalWeight?: number;
  isAutochthonous?: boolean;
  isPremiumRegion?: boolean;
}

export interface QualityModelMetadata {
  version: string;
  trainedAt: string;
  trainSize: number;
  testSize: number;
  testRmse: number;
  labelWeights: QualityLabelWeights;
  featureNames: string[];
}

export interface QualityLabelWeights {
  critic: number;
  expert: number;
  vivino: number;
  consumer: number;
}

export interface QualityModelArtifact {
  metadata: QualityModelMetadata;
  intercept: number;
  coefficients: Record<string, number>;
  encodings: {
    globalMean: number;
    region: Record<string, number>;
    winery: Record<string, number>;
    primaryGrape: Record<string, number>;
  };
  normalization: {
    vintageAge: { mean: number; std: number };
    alcohol: { mean: number; std: number };
    acidity: { mean: number; std: number };
    cellarPotential: { mean: number; std: number };
    medalLog: { mean: number; std: number };
  };
}

export const QUALITY_MODEL_PATH = "data/quality-model.json";
export const QUALITY_DATASET_PATH = "data/quality-training.json";
export const QUALITY_OVERRIDES_PATH = "data/quality-label-overrides.json";

export const DEFAULT_LABEL_WEIGHTS: QualityLabelWeights = {
  critic: 0.45,
  expert: 0.25,
  vivino: 0.15,
  consumer: 0.15,
};

export const QUALITY_LABEL_MIN = 40;
export const QUALITY_LABEL_MAX = 98;
export const DECENT_TEST_RMSE = 5;
