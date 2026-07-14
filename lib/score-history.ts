import { db } from "@/lib/db";
import {
  scoreOverrides,
  scoresHistory,
  type ScoreChangeReason,
  type ScoreOverrideField,
} from "@/lib/schema";
import type { OverpricedRisk } from "@/types";

export interface ScoreSnapshotInput {
  wineId: number;
  priceAvg?: number | null;
  valueScore?: number | null;
  giftScore?: number | null;
  foodMatchScore?: number | null;
  overpricedRisk?: OverpricedRisk | null;
  algorithmVersion?: number | null;
  confidencePercent?: number | null;
  changeReason: ScoreChangeReason;
  /** "system" pentru joburi automate, sau identificatorul adminului. */
  changedBy?: string;
}

/**
 * Inregistreaza un snapshot in `scores_history`. Append-only: niciodata nu
 * modificam sau stergem randuri existente, astfel incat orice scor afisat
 * public sa poata fi reconstituit din istoric.
 *
 * Trebuie apelata de fiecare data cand `valueScore`/`giftScore`/
 * `foodMatchScore` se schimba efectiv (recalculare, actualizare pret,
 * regenerare editoriala sau override manual admin), nu doar la creare.
 */
export async function recordScoreSnapshot(
  input: ScoreSnapshotInput,
): Promise<void> {
  try {
    await db.insert(scoresHistory).values({
      wineId: input.wineId,
      priceAvg: input.priceAvg ?? null,
      valueScore: input.valueScore ?? null,
      giftScore: input.giftScore ?? null,
      foodMatchScore: input.foodMatchScore ?? null,
      overpricedRisk: input.overpricedRisk ?? null,
      algorithmVersion: input.algorithmVersion ?? null,
      confidencePercent: input.confidencePercent ?? null,
      changeReason: input.changeReason,
      changedBy: input.changedBy ?? "system",
    });
  } catch (error) {
    // Istoricul de scoruri e auxiliar (audit); nu trebuie sa blocheze fluxul
    // principal de scoring/publicare daca scrierea in istoric pica.
    console.error("recordScoreSnapshot failed", error);
  }
}

export interface ScoreOverrideInput {
  wineId: number;
  field: ScoreOverrideField;
  previousValue: string | number | null;
  newValue: string | number | null;
  reason: string;
  changedBy: string;
  expiresAt?: string | null;
}

/**
 * Inregistreaza un override manual (admin) intr-un audit trail dedicat,
 * separat de `scores_history`. Un override este intotdeauna o decizie
 * umana explicita, nu un rezultat al algoritmului, deci trebuie sa aiba
 * un motiv obligatoriu.
 */
export async function recordScoreOverride(
  input: ScoreOverrideInput,
): Promise<void> {
  if (!input.reason.trim()) {
    throw new Error("Motivul override-ului este obligatoriu.");
  }

  await db.insert(scoreOverrides).values({
    wineId: input.wineId,
    field: input.field,
    previousValue:
      input.previousValue == null ? null : String(input.previousValue),
    newValue: input.newValue == null ? null : String(input.newValue),
    reason: input.reason.trim(),
    changedBy: input.changedBy,
    expiresAt: input.expiresAt ?? null,
  });
}

export async function getScoreHistoryForWine(wineId: number, limit = 50) {
  return db.query.scoresHistory.findMany({
    where: (table, { eq: eqOp }) => eqOp(table.wineId, wineId),
    orderBy: (table, { desc }) => [desc(table.recordedAt)],
    limit,
  });
}

export async function getScoreOverridesForWine(wineId: number, limit = 50) {
  return db.query.scoreOverrides.findMany({
    where: (table, { eq: eqOp }) => eqOp(table.wineId, wineId),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    limit,
  });
}
