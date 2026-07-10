import { mkdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  QUALITY_DATASET_PATH,
  QUALITY_MODEL_PATH,
  QUALITY_OVERRIDES_PATH,
  type QualityDataPoint,
  type QualityModelArtifact,
  type QualityTrainingRow,
} from "@/lib/quality-model/types";

function resolveDataPath(relativePath: string): string {
  return path.join(process.cwd(), relativePath);
}

export async function ensureDataDir(): Promise<void> {
  await mkdir(resolveDataPath("data"), { recursive: true });
}

export async function saveQualityDataset(rows: QualityTrainingRow[]): Promise<string> {
  await ensureDataDir();
  const filePath = resolveDataPath(QUALITY_DATASET_PATH);
  await writeFile(filePath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  return filePath;
}

export async function loadQualityDataset(): Promise<QualityTrainingRow[]> {
  const filePath = resolveDataPath(QUALITY_DATASET_PATH);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as QualityTrainingRow[];
}

export async function saveQualityModel(model: QualityModelArtifact): Promise<string> {
  await ensureDataDir();
  const filePath = resolveDataPath(QUALITY_MODEL_PATH);
  await writeFile(filePath, `${JSON.stringify(model, null, 2)}\n`, "utf8");
  return filePath;
}

export async function loadQualityModel(): Promise<QualityModelArtifact | null> {
  try {
    const raw = readFileSync(resolveDataPath(QUALITY_MODEL_PATH), "utf8");
    return JSON.parse(raw) as QualityModelArtifact;
  } catch {
    return null;
  }
}

export function loadQualityModelSync(): QualityModelArtifact | null {
  try {
    const raw = readFileSync(resolveDataPath(QUALITY_MODEL_PATH), "utf8");
    return JSON.parse(raw) as QualityModelArtifact;
  } catch {
    return null;
  }
}

export async function loadQualityLabelOverrides(): Promise<
  Record<string, Partial<QualityDataPoint>>
> {
  try {
    const filePath = resolveDataPath(QUALITY_OVERRIDES_PATH);
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as Record<string, Partial<QualityDataPoint>>;
  } catch {
    return {};
  }
}

export function applyLabelOverrides(
  point: QualityDataPoint,
  overrides: Record<string, Partial<QualityDataPoint>>,
): QualityDataPoint {
  const override = overrides[point.slug] ?? overrides[point.wineId];
  if (!override) return point;
  return {
    ...point,
    ...override,
    wineId: point.wineId,
    slug: point.slug,
    name: point.name,
  };
}
