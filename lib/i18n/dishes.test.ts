import { describe, expect, it } from "vitest";
import {
  CANONICAL_DISH_PRESENTATION_COUNT,
  ENGLISH_DISH_COPY,
  getDishPresentation,
  getDishPresentations,
} from "@/lib/i18n/dishes";
import { ROMANIAN_DISHES } from "@/lib/pairing/romanian-dishes";

const canonicalProfiles = [
  ...new Map(ROMANIAN_DISHES.map((profile) => [profile.id, profile])).values(),
];

describe("canonical dish locale presentation", () => {
  it("has explicit English coverage for every unique canonical identity", () => {
    const canonicalIds = canonicalProfiles.map((profile) => profile.id).sort();
    const translatedIds = Object.keys(ENGLISH_DISH_COPY).sort();
    const englishPresentations = getDishPresentations("en");

    expect(CANONICAL_DISH_PRESENTATION_COUNT).toBe(88);
    expect(englishPresentations).toHaveLength(canonicalIds.length);
    expect(translatedIds).toEqual(canonicalIds);
    expect(englishPresentations.every((item) => item.displayName.trim().length > 0))
      .toBe(true);
  });

  it("preserves every Romanian display name exactly", () => {
    const romanianById = new Map(
      getDishPresentations("ro").map((item) => [item.id, item]),
    );

    for (const profile of canonicalProfiles) {
      const presentation = romanianById.get(profile.id);
      expect(presentation).toEqual({
        id: profile.id,
        slug: profile.id,
        locale: "ro",
        displayName: profile.name,
      });
    }
  });

  it("never silently reuses Romanian descriptive copy in English", () => {
    for (const profile of canonicalProfiles) {
      const presentation = getDishPresentation(profile.id, "en");
      if (presentation.displayName === profile.name) {
        expect(presentation.explanation?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("applies the approved presentation policy to iconic dishes", () => {
    expect(getDishPresentation("sarmale", "en")).toMatchObject({
      id: "sarmale",
      slug: "sarmale",
      displayName: "Sarmale",
      explanation: "Romanian cabbage rolls filled with pork and rice.",
    });
    expect(getDishPresentation("mici", "en")).toMatchObject({
      displayName: "Mici",
      explanation:
        "Romanian grilled skinless sausages made from seasoned minced meat.",
    });
    expect(
      getDishPresentation("mamaliga-cu-branza-si-smantana", "en"),
    ).toMatchObject({
      displayName: "Polenta with cheese and sour cream",
    });
    expect(getDishPresentation("ciorba-de-burta", "en")).toMatchObject({
      displayName: "Romanian tripe soup",
    });
    expect(getDishPresentation("papanasi", "en")).toMatchObject({
      displayName: "Papanași",
      explanation:
        "Romanian fried cheese doughnuts served with sour cream and fruit preserve.",
    });
    expect(getDishPresentation("piftie-de-curcan", "en")).toMatchObject({
      displayName: "Turkey aspic",
    });
    expect(getDishPresentation("piftie-de-porc", "en")).toMatchObject({
      displayName: "Pork aspic",
    });
  });

  it("keeps locale presentation separate from pairing identity and traits", () => {
    const before = JSON.stringify(ROMANIAN_DISHES);

    getDishPresentations("ro");
    getDishPresentations("en");

    expect(JSON.stringify(ROMANIAN_DISHES)).toBe(before);
    for (const presentation of getDishPresentations("en")) {
      expect(presentation.id).toBe(presentation.slug);
    }
  });

  it("rejects unknown identities instead of fabricating fallback copy", () => {
    expect(() => getDishPresentation("missing-dish", "en")).toThrow(
      "Unknown canonical dish: missing-dish",
    );
  });

  it("contains no long dash characters in public dish copy", () => {
    const copy = JSON.stringify(ENGLISH_DISH_COPY);
    expect(copy).not.toMatch(/[\u2013\u2014]/);
  });
});
