import { describe, expect, it } from "vitest";
import { loadTargetSources, loadTargetWine } from "@/lib/intelligence/fixtures";
import { runWineIntelligence } from "@/lib/intelligence/pipeline";
import {
  planStructuredClaims,
  type ExistingStructuredClaim,
} from "@/lib/intelligence/structured-claims-backfill";

async function report() {
  return (
    await runWineIntelligence({
      wine: loadTargetWine(),
      fixtures: loadTargetSources(),
      dryRun: true,
    })
  ).report;
}

function existingFromWrites(
  writes: ReturnType<typeof planStructuredClaims>["writes"],
): ExistingStructuredClaim[] {
  return writes.map((write, index) => ({
    id: index + 1,
    wineId: write.wineId,
    field: write.field,
    sourceHash: write.sourceHash,
    claimHash: write.claimHash,
    normalizedValue: write.normalizedValue,
    verificationStatus: write.verificationStatus,
  }));
}

describe("structured claim backfill plan", () => {
  it("plans only source-backed sensory, serving and culinary claims", async () => {
    const plan = planStructuredClaims({ report: await report(), existing: [] });
    expect(plan.writes.length).toBeGreaterThan(0);
    expect(
      plan.writes.every((write) =>
        [
          "visual_appearance",
          "aroma_descriptors",
          "taste_descriptors",
          "body",
          "acidity_perception",
          "tannin_perception",
          "finish",
          "serving_temperature",
          "food_pairing",
        ].includes(write.field),
      ),
    ).toBe(true);
    expect(plan.writes.every((write) => /^https?:\/\//.test(write.sourceUrl))).toBe(
      true,
    );
    expect(plan.writes.every((write) => write.excerpt.length > 0)).toBe(true);
    expect(plan.writes.every((write) => write.claimHash.length > 0)).toBe(true);
  });

  it("is idempotent when the same evidence is already persisted", async () => {
    const first = planStructuredClaims({ report: await report(), existing: [] });
    const second = planStructuredClaims({
      report: await report(),
      existing: existingFromWrites(first.writes),
    });
    expect(first.writes.length).toBeGreaterThan(0);
    expect(second.writes).toEqual([]);
    expect(second.alreadyPresent).toBe(first.writes.length);
    expect(second.existingValueConflict).toBe(0);
  });

  it("does not overwrite an existing different value", async () => {
    const first = planStructuredClaims({ report: await report(), existing: [] });
    const target = first.writes[0]!;
    const existing = existingFromWrites(first.writes);
    existing[0] = {
      ...existing[0]!,
      claimHash: "different-claim",
      normalizedValue: "different-value",
    };
    const second = planStructuredClaims({
      report: await report(),
      existing,
    });
    expect(second.existingValueConflict).toBeGreaterThan(0);
    expect(
      second.writes.some(
        (write) =>
          write.field === target.field &&
          write.wineId === target.wineId &&
          write.sourceHash === target.sourceHash,
      ),
    ).toBe(false);
    expect(second.skipped.some((item) => item.reason === "existing_different_value")).toBe(
      true,
    );
  });
});
