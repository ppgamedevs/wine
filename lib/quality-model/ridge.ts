import {
  buildNormalizationFromRows,
  buildTargetEncodings,
  encodeFeatures,
  type EncodedCategoryMaps,
  type NormalizationStats,
} from "@/lib/quality-model/features";
import { computeMae, computeRmse } from "@/lib/quality-model/metrics";
import {
  DEFAULT_LABEL_WEIGHTS,
  QUALITY_LABEL_MAX,
  QUALITY_LABEL_MIN,
  type QualityFeatureInput,
  type QualityModelArtifact,
  type QualityTrainingRow,
} from "@/lib/quality-model/types";

export interface RidgeTrainResult {
  artifact: QualityModelArtifact;
  trainRmse: number;
  testRmse: number;
  trainMae: number;
  testMae: number;
}

interface DesignMatrix {
  featureNames: string[];
  x: number[][];
  y: number[];
}

const RIDGE_LAMBDA = 0.75;
const LEARNING_RATE = 0.002;
const EPOCHS = 6000;

function buildDesignMatrix(
  rows: Array<{ features: QualityFeatureInput; label: number }>,
  encodings: EncodedCategoryMaps,
  normalization: {
    vintageAge: NormalizationStats;
    alcohol: NormalizationStats;
    acidity: NormalizationStats;
    cellarPotential: NormalizationStats;
    medalLog: NormalizationStats;
  },
): DesignMatrix {
  if (rows.length === 0) {
    return { featureNames: ["bias"], x: [], y: [] };
  }

  const encoded = rows.map((row) =>
    encodeFeatures(row.features, encodings, normalization),
  );
  const featureNames = encoded[0].names;

  const x = encoded.map((vector) => [1, ...vector.values]);
  const y = rows.map((row) => row.label);

  return {
    featureNames: ["bias", ...featureNames],
    x,
    y,
  };
}

function trainRidgeWeights(
  design: DesignMatrix,
  lambda: number,
): Record<string, number> {
  const featureCount = design.featureNames.length;
  const weights = new Array<number>(featureCount).fill(0);

  for (let epoch = 0; epoch < EPOCHS; epoch += 1) {
    for (let i = 0; i < design.x.length; i += 1) {
      const row = design.x[i];
      let prediction = 0;
      for (let j = 0; j < featureCount; j += 1) {
        prediction += weights[j] * row[j];
      }

      const error = prediction - design.y[i];
      for (let j = 0; j < featureCount; j += 1) {
        const penalty = j === 0 ? 0 : lambda * weights[j];
        weights[j] -= LEARNING_RATE * (error * row[j] + penalty);
      }
    }
  }

  const coefficients: Record<string, number> = {};
  for (let i = 0; i < featureCount; i += 1) {
    coefficients[design.featureNames[i]] = Math.round(weights[i] * 10000) / 10000;
  }
  return coefficients;
}

function predictWithCoefficients(
  features: QualityFeatureInput,
  artifact: Pick<
    QualityModelArtifact,
    "coefficients" | "encodings" | "normalization" | "metadata"
  >,
): number {
  const vector = encodeFeatures(
    features,
    artifact.encodings,
    artifact.normalization,
  );
  const names = ["bias", ...vector.names];
  const values = [1, ...vector.values];

  let prediction = 0;
  for (let i = 0; i < names.length; i += 1) {
    prediction += (artifact.coefficients[names[i]] ?? 0) * values[i];
  }

  return Math.max(
    QUALITY_LABEL_MIN,
    Math.min(QUALITY_LABEL_MAX, Math.round(prediction * 10) / 10),
  );
}

export function predictQuality(
  features: QualityFeatureInput,
  artifact: QualityModelArtifact,
): number {
  return predictWithCoefficients(features, artifact);
}

export function trainQualityModel(
  rows: QualityTrainingRow[],
  options?: {
    testRows?: QualityTrainingRow[];
    trainSize?: number;
    testSize?: number;
    testRmse?: number;
  },
): RidgeTrainResult {
  const trainRows = rows.map((row) => ({
    features: row.features,
    label: row.label,
  }));

  const encodings = buildTargetEncodings(trainRows);
  const normalization = buildNormalizationFromRows(trainRows);
  const design = buildDesignMatrix(trainRows, encodings, normalization);
  const coefficients = trainRidgeWeights(design, RIDGE_LAMBDA);

  const trainPredictions = trainRows.map((row) =>
    predictWithCoefficients(row.features, {
      coefficients,
      encodings,
      normalization,
      metadata: { featureNames: design.featureNames } as QualityModelArtifact["metadata"],
    }),
  );
  const trainActual = trainRows.map((row) => row.label);
  const trainRmse = computeRmse(trainActual, trainPredictions);
  const trainMae = computeMae(trainActual, trainPredictions);

  let testRmse = options?.testRmse ?? NaN;
  let testMae = NaN;
  if (options?.testRows?.length) {
    const testPredictions = options.testRows.map((row) =>
      predictWithCoefficients(row.features, {
        coefficients,
        encodings,
        normalization,
        metadata: { featureNames: design.featureNames } as QualityModelArtifact["metadata"],
      }),
    );
    const testActual = options.testRows.map((row) => row.label);
    testRmse = computeRmse(testActual, testPredictions);
    testMae = computeMae(testActual, testPredictions);
  }

  const artifact: QualityModelArtifact = {
    metadata: {
      version: "ridge-v1",
      trainedAt: new Date().toISOString(),
      trainSize: options?.trainSize ?? rows.length,
      testSize: options?.testSize ?? options?.testRows?.length ?? 0,
      testRmse,
      labelWeights: DEFAULT_LABEL_WEIGHTS,
      featureNames: design.featureNames,
    },
    intercept: coefficients.bias ?? 0,
    coefficients,
    encodings,
    normalization,
  };

  return {
    artifact,
    trainRmse,
    testRmse,
    trainMae,
    testMae,
  };
}
