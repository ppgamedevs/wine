import { describe, expect, it } from "vitest";
import { buildCurationWritePatch, toApprovedFoodPairings } from "@/lib/pairing-curation";
import type { CurationCard } from "@/lib/pairing-curation-cards";
import {
  addSkippedSlug,
  applyApprovedPairingsToCards,
  approvalSuccessMessage,
  formatCuratedAt,
  canApproveCurationSelection,
  NO_NEW_CURATION_DRAFTS_MESSAGE,
  UNKNOWN_DISH_CATEGORY_CARD_MESSAGE,
  dishFromCurationError,
  reviewPairingMeta,
  clearKeyedStateForSlug,
  draftSelectionKey,
  mergeServerCardsPreserveOrder,
  nextReviewSlug,
  pairingCurationPath,
  parseSkippedSlugs,
  prevReviewSlug,
  resolveCurrentSlug,
  reviewCardStatus,
  reviewPosition,
  reviewProgress,
} from "@/lib/pairing-curation-review";
import { compareScoreSnapshots } from "@/lib/food-evidence";
import { getSecondaryScoringMode } from "@/lib/scoring-v2/secondary-scoring-mode";
import type { PairingDraft } from "@/lib/pairing-curation-types";

function card(
  slug: string,
  pairings: CurationCard["existingPairings"] = [],
): CurationCard {
  return {
    id: slug.length,
    slug,
    name: slug,
    existingPairings: pairings,
    drafts: [],
  } as unknown as CurationCard;
}

function draft(dish: string): PairingDraft {
  return {
    dish,
    category: "fish",
    rationale: "Un alb sec din acest stil este o alegere editoriala.",
    basis: ["verified_style"],
    confidence: "MEDIUM",
    strength: "good",
    styleOnlyWarning: true,
    provenanceLocked: true,
  };
}

describe("pairing curation review session", () => {
  it("B: current wine identity is slug-stable", () => {
    const slugs = ["wine-a", "wine-b", "wine-c"];
    expect(resolveCurrentSlug(slugs, "wine-b")).toBe("wine-b");
    expect(resolveCurrentSlug(slugs, "missing")).toBe("wine-a");
    expect(nextReviewSlug(slugs, "wine-a")).toBe("wine-b");
    expect(prevReviewSlug(slugs, "wine-b")).toBe("wine-a");
    expect(reviewPosition(slugs, "wine-c")).toBe(3);
    expect(pairingCurationPath("wine-b")).toBe(
      "/admin/pairing-curation?slug=wine-b",
    );
  });

  it("C: approval increments curated progress", () => {
    const before = [card("wine-a"), card("wine-b"), card("wine-c")];
    expect(reviewProgress(before, []).curated).toBe(0);
    const after = applyApprovedPairingsToCards(before, "wine-a", [
      { dish: "Peste alb", source: "vinintel_curated" },
    ]);
    const progress = reviewProgress(after, []);
    expect(progress.curated).toBe(1);
    expect(progress.reviewed).toBe(1);
    expect(progress.pending).toBe(2);
    expect(progress.total).toBe(3);
  });

  it("D: hard reload reconstructs curated progress from card data", () => {
    const reloaded = [
      card("wine-a", [{ dish: "Peste alb", source: "vinintel_curated" }]),
      card("wine-b"),
      card("wine-c"),
    ];
    const skipped = parseSkippedSlugs(null);
    const progress = reviewProgress(reloaded, skipped);
    expect(progress.curated).toBe(1);
    expect(progress.reviewed).toBe(1);
    expect(progress.pending).toBe(2);
    expect(reviewCardStatus(reloaded[0]!, skipped)).toBe("curated");
  });

  it("E: same-named drafts across two wines do not share state", () => {
    const wineA = "balla-geza-feteasca-regala-2025";
    const wineB = "sauvignon-blanc-feteasca-regala";
    const keyA = draftSelectionKey(wineA, "Peste alb");
    const keyB = draftSelectionKey(wineB, "Peste alb");
    expect(keyA).not.toBe(keyB);
    const selected = { [keyA]: true };
    expect(selected[keyB]).toBeUndefined();
    const edits = {
      [keyA]: { dish: "Peste alb edit", rationale: "A", strength: "strong" as const },
    };
    expect(edits[keyB]).toBeUndefined();
  });

  it("existing pairing review copy leads with rationale, not raw metadata", () => {
    expect(reviewPairingMeta("good", ["verified_style", "editorial_judgment"])).toBe(
      "Recomandare: Good · Stil verificat",
    );
    expect(reviewPairingMeta("good", ["verified_style"])).not.toContain(
      "vinintel_curated",
    );
    expect(reviewPairingMeta("good", ["verified_style"])).not.toContain(
      "verified_style",
    );
    expect(canApproveCurationSelection(0, 1)).toBe(false);
    expect(canApproveCurationSelection(2, 0)).toBe(false);
    expect(canApproveCurationSelection(2, 1)).toBe(true);
    expect(NO_NEW_CURATION_DRAFTS_MESSAGE).toContain("deja revizuite");
    expect(formatCuratedAt("2026-08-16T18:03:50.827Z")).toContain("2026");
  });

  it("F: success message references the approved wine, not the next wine", () => {
    const message = approvalSuccessMessage(2, "Frizzy");
    expect(message).toContain("Frizzy");
    expect(message).toContain("2");
    expect(message).not.toContain("Feteasca Regala");
    expect(message).not.toContain("Fetească Regală");
  });

  it("G: selected state is cleared after approval for that wine only", () => {
    const wineA = "wine-a";
    const wineB = "wine-b";
    const selected = {
      [draftSelectionKey(wineA, "Peste alb")]: true,
      [draftSelectionKey(wineB, "Peste alb")]: true,
    };
    const cleared = clearKeyedStateForSlug(selected, wineA);
    expect(cleared[draftSelectionKey(wineA, "Peste alb")]).toBeUndefined();
    expect(cleared[draftSelectionKey(wineB, "Peste alb")]).toBe(true);
  });

  it("H: skip does not create foodPairings", () => {
    const cards = [card("wine-a"), card("wine-b")];
    const skipped = addSkippedSlug([], "wine-a");
    expect(cards[0]?.existingPairings).toEqual([]);
    expect(reviewCardStatus(cards[0]!, skipped)).toBe("skipped");
    expect(reviewProgress(cards, skipped).curated).toBe(0);
    expect(reviewProgress(cards, skipped).skipped).toBe(1);
    expect(reviewProgress(cards, skipped).reviewed).toBe(1);
  });

  it("I: curated state overrides skipped state", () => {
    const curated = card("wine-a", [
      { dish: "Sarmale", source: "vinintel_curated" },
    ]);
    expect(reviewCardStatus(curated, ["wine-a"])).toBe("curated");
    expect(reviewProgress([curated, card("wine-b")], ["wine-a"]).curated).toBe(1);
    expect(reviewProgress([curated, card("wine-b")], ["wine-a"]).skipped).toBe(0);
  });

  it("J: approval write patch contains no stored score fields", () => {
    const patch = buildCurationWritePatch(
      toApprovedFoodPairings([draft("Peste alb")], []),
    );
    expect(Object.keys(patch)).toEqual(["foodPairings"]);
    expect("valueScore" in patch).toBe(false);
    expect("giftScore" in patch).toBe(false);
    expect("foodMatchScore" in patch).toBe(false);
    const before = [
      { id: 1, valueScore: 68, giftScore: 64, foodMatchScore: 84 },
    ];
    expect(compareScoreSnapshots(before, before).identical).toBe(true);
  });

  it("K: shadow remains shadow", () => {
    expect(getSecondaryScoringMode()).toBe("shadow");
  });

  it("approval error can be attached to the edited dish", () => {
    expect(
      dishFromCurationError(
        'Categoria pentru "Tocanita de vanat" nu este in taxonomie.',
      ),
    ).toBe("Tocanita de vanat");
    expect(UNKNOWN_DISH_CATEGORY_CARD_MESSAGE).toContain("taxonomie");
  });

  it("Mai tarziu does not count as reviewed", () => {
    const cards = [card("wine-a"), card("wine-b")];
    expect(reviewProgress(cards, []).reviewed).toBe(0);
    expect(reviewCardStatus(cards[0]!, [])).toBe("pending");
  });

  it("locked batch order survives a reshuffled server payload", () => {
    const locked = ["wine-a", "wine-b", "wine-c"];
    const local = [card("wine-a"), card("wine-b"), card("wine-c")];
    const server = [
      card("wine-x"),
      card("wine-c"),
      card("wine-b", [{ dish: "Mici", source: "vinintel_curated" }]),
    ];
    const merged = mergeServerCardsPreserveOrder(locked, server, local);
    expect(merged.map((item) => item.slug)).toEqual(locked);
    expect(merged[1]?.existingPairings[0]?.dish).toBe("Mici");
  });
});
