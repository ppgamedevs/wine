import { db } from "@/lib/db";
import { buildQualityLabel } from "@/lib/quality-model/metrics";
import {
  buildFeatureInputFromWine,
  computeMedalWeight,
} from "@/lib/quality-model/features";
import {
  applyLabelOverrides,
  loadQualityLabelOverrides,
} from "@/lib/quality-model/storage";
import {
  QUALITY_LABEL_MAX,
  QUALITY_LABEL_MIN,
  type QualityDataPoint,
  type QualityTrainingRow,
} from "@/lib/quality-model/types";

function bootstrapLabelFromMedals(medalWeight: number): number {
  const raw = 58 + Math.min(22, 3 * Math.log2(1 + medalWeight));
  return Math.max(
    QUALITY_LABEL_MIN,
    Math.min(QUALITY_LABEL_MAX, Math.round(raw * 10) / 10),
  );
}

export interface CollectQualityOptions {
  /** Permite etichete bootstrap din medalii daca lipsesc scoruri reale. */
  bootstrap?: boolean;
}

export async function collectQualityDataFromDb(
  options: CollectQualityOptions = {},
): Promise<QualityTrainingRow[]> {
  const overrides = await loadQualityLabelOverrides();

  const rows = await db.query.wines.findMany({
    columns: {
      id: true,
      slug: true,
      name: true,
      criticScore: true,
      ratingAvg: true,
      ratingCount: true,
      communityScore: true,
      communityVoteCount: true,
      type: true,
      vintage: true,
      grapeVarieties: true,
      alcohol: true,
      acidity: true,
      cellarPotential: true,
      medals: true,
    },
    with: {
      region: { columns: { name: true } },
      winery: { columns: { name: true } },
    },
  });

  const trainingRows: QualityTrainingRow[] = [];

  for (const wine of rows) {
    const basePoint: QualityDataPoint = {
      wineId: String(wine.id),
      slug: wine.slug,
      name: wine.name,
      criticScore: wine.criticScore ?? undefined,
      vivinoRating:
        wine.ratingAvg != null && wine.ratingAvg > 0
          ? wine.ratingAvg
          : undefined,
      consumerRating:
        wine.communityVoteCount > 0 && wine.communityScore != null
          ? wine.communityScore
          : wine.ratingAvg != null && wine.ratingAvg > 0
            ? Math.round(wine.ratingAvg * 20)
            : undefined,
    };

    const point = applyLabelOverrides(basePoint, overrides);
    let { label, sources } = buildQualityLabel(point);

    const features = buildFeatureInputFromWine({
      type: wine.type,
      vintage: wine.vintage,
      grapeVarieties: wine.grapeVarieties,
      region: wine.region,
      winery: wine.winery,
      alcohol: wine.alcohol,
      acidity: wine.acidity,
      cellarPotential: wine.cellarPotential,
      medals: wine.medals,
    });

    if (label == null && options.bootstrap) {
      const medalWeight = computeMedalWeight(wine.medals);
      if (medalWeight > 0) {
        label = bootstrapLabelFromMedals(medalWeight);
        sources = ["bootstrap_medals"];
      }
    }

    if (label == null) continue;

    trainingRows.push({
      ...point,
      label,
      labelSources: sources,
      features,
    });
  }

  return trainingRows;
}

export function summarizeQualityDataset(rows: QualityTrainingRow[]): {
  total: number;
  withCritic: number;
  withVivino: number;
  withExpert: number;
  withConsumer: number;
  bootstrap: number;
  avgLabel: number;
} {
  const withCritic = rows.filter((row) => row.criticScore != null).length;
  const withVivino = rows.filter((row) => row.vivinoRating != null).length;
  const withExpert = rows.filter((row) => row.expertRating != null).length;
  const withConsumer = rows.filter((row) => row.consumerRating != null).length;
  const bootstrap = rows.filter((row) =>
    row.labelSources.includes("bootstrap_medals"),
  ).length;
  const avgLabel =
    rows.length > 0
      ? Math.round(
          (rows.reduce((sum, row) => sum + row.label, 0) / rows.length) * 10,
        ) / 10
      : 0;

  return {
    total: rows.length,
    withCritic,
    withVivino,
    withExpert,
    withConsumer,
    bootstrap,
    avgLabel,
  };
}
