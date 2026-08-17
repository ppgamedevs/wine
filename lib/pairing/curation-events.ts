/**
 * Lightweight curation feedback events. Never affect Value/Gift/Food scores.
 */
import { ROMANIAN_PAIRING_GENERATOR_VERSION } from "@/lib/pairing/romanian-dishes";
import type { FoodPairingBasis, FoodPairingStrength } from "@/lib/schema";

export const CURATION_EVENT_ACTIONS = [
  "approved",
  "approved_after_edit",
  "rejected",
  "skipped_wine",
  "review_later",
] as const;

export type CurationEventAction = (typeof CURATION_EVENT_ACTIONS)[number];

export interface PairingCurationEventInput {
  wineId: number;
  wineSlug: string;
  action: CurationEventAction;
  proposedDishId?: string | null;
  proposedDish?: string | null;
  proposedRationale?: string | null;
  proposedStrength?: FoodPairingStrength | null;
  proposedBasis?: FoodPairingBasis[] | null;
  finalDishId?: string | null;
  finalDish?: string | null;
  finalRationale?: string | null;
  finalStrength?: FoodPairingStrength | null;
  finalBasis?: FoodPairingBasis[] | null;
  reviewer?: string;
  generatorVersion?: number;
}

export function curationEventFromApproval(input: {
  wineId: number;
  wineSlug: string;
  proposedDish: string;
  proposedRationale: string;
  proposedStrength: FoodPairingStrength;
  proposedBasis: FoodPairingBasis[];
  finalDish: string;
  finalRationale: string;
  finalStrength: FoodPairingStrength;
  finalBasis: FoodPairingBasis[];
  proposedDishId?: string | null;
  finalDishId?: string | null;
}): PairingCurationEventInput {
  const edited =
    input.proposedDish !== input.finalDish ||
    input.proposedRationale !== input.finalRationale ||
    input.proposedStrength !== input.finalStrength;
  return {
    wineId: input.wineId,
    wineSlug: input.wineSlug,
    action: edited ? "approved_after_edit" : "approved",
    proposedDish: input.proposedDish,
    proposedRationale: input.proposedRationale,
    proposedStrength: input.proposedStrength,
    proposedBasis: input.proposedBasis,
    proposedDishId: input.proposedDishId ?? null,
    finalDish: input.finalDish,
    finalRationale: input.finalRationale,
    finalStrength: input.finalStrength,
    finalBasis: input.finalBasis,
    finalDishId: input.finalDishId ?? null,
    reviewer: "admin",
    generatorVersion: ROMANIAN_PAIRING_GENERATOR_VERSION,
  };
}

export async function recordCurationEvents(
  events: PairingCurationEventInput[],
): Promise<void> {
  if (events.length === 0) return;
  try {
    const { db } = await import("@/lib/db");
    const { pairingCurationEvents } = await import("@/lib/schema");
    await db.insert(pairingCurationEvents).values(
      events.map((event) => ({
        wineId: event.wineId,
        wineSlug: event.wineSlug,
        action: event.action,
        proposedDishId: event.proposedDishId ?? null,
        proposedDish: event.proposedDish ?? null,
        proposedRationale: event.proposedRationale ?? null,
        proposedStrength: event.proposedStrength ?? null,
        proposedBasis: event.proposedBasis ?? null,
        finalDishId: event.finalDishId ?? null,
        finalDish: event.finalDish ?? null,
        finalRationale: event.finalRationale ?? null,
        finalStrength: event.finalStrength ?? null,
        finalBasis: event.finalBasis ?? null,
        reviewer: event.reviewer ?? "admin",
        generatorVersion: event.generatorVersion ?? ROMANIAN_PAIRING_GENERATOR_VERSION,
      })),
    );
  } catch (error) {
    console.warn(
      "[pairing-curation-events] skip persist",
      error instanceof Error ? error.message : error,
    );
  }
}
