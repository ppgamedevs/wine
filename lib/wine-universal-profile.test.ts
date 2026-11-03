import { describe, expect, it } from "vitest";
import {
  buildUniversalWineProfile,
  type WineClaimRow,
} from "@/lib/wine-universal-profile";
import type { WineWithRelations } from "@/types";

const wine = {
  id: 418,
  slug: "zestrea-muscat-ottonel-demisec-0-75l",
  name: "Zestrea Muscat Ottonel Demisec",
  type: "white",
  sweetness: "demisec",
  vintage: null,
  grapeVarieties: [{ name: "Muscat Ottonel" }],
  region: { name: "Murfatlar" },
  winery: { name: "Murfatlar" },
} as unknown as WineWithRelations;

function row(overrides: Partial<WineClaimRow>): WineClaimRow {
  return {
    field: "alcohol",
    value: 12.5,
    verificationStatus: "verified_official",
    sourceUrl: "https://murfatlar-vinul.ro/zestrea/",
    sourceTitle: "Murfatlar Zestrea",
    unit: "% vol",
    excerpt: "12.5% vol",
    ...overrides,
  };
}

describe("Universal wine profile", () => {
  it("renders structured sensory, serving and grape facts with sources", () => {
    const profile = buildUniversalWineProfile({
      wine,
      locale: "ro",
      claimRows: [
        row({}),
        row({ field: "serving_temperature", value: "7-8", unit: "°C" }),
        row({ field: "aroma_descriptors", value: ["soc", "pere"], unit: null }),
        row({ field: "taste_descriptors", value: ["echilibrat"], unit: null }),
        row({ field: "food_pairing", value: ["pește"], unit: null }),
      ],
    });
    expect(profile.hasStructuredClaims).toBe(true);
    expect(profile.evidenceCount).toBe(5);
    expect(profile.grapes).toEqual([
      { name: "Muscat Ottonel", percentage: null, guideSlug: "muscat-ottonel" },
    ]);
    expect(
      profile.sections.find((section) => section.id === "sensory")?.fields.map(
        (field) => field.key,
      ),
    ).toEqual(["aroma_descriptors", "taste_descriptors"]);
    expect(
      profile.sections.find((section) => section.id === "serving")?.fields.map(
        (field) => field.key,
      ),
    ).toEqual(["serving_temperature", "food_pairing"]);
    const alcohol = profile.sections
      .find((section) => section.id === "technical")
      ?.fields.find((field) => field.key === "alcohol");
    expect(alcohol?.value).toBe("12.5 % vol");
    expect(alcohol?.sourceUrl).toContain("murfatlar");
  });

  it("leaves sensory fields empty when only free text exists", () => {
    const profile = buildUniversalWineProfile({
      wine,
      locale: "en",
      claimRows: [],
    });
    expect(profile.hasStructuredClaims).toBe(false);
    expect(profile.sections.find((section) => section.id === "sensory")?.fields).toEqual([]);
    expect(profile.sections.find((section) => section.id === "serving")?.fields).toEqual([]);
  });

  it("marks contradictory structured evidence as a conflict", () => {
    const profile = buildUniversalWineProfile({
      wine,
      locale: "ro",
      claimRows: [
        row({ field: "alcohol", value: 12.5 }),
        row({
          field: "alcohol",
          value: 13.5,
          verificationStatus: "attributed_retailer",
          sourceUrl: "https://retailer.example/wine",
          sourceTitle: "Retailer",
        }),
      ],
    });
    const alcohol = profile.sections
      .find((section) => section.id === "technical")
      ?.fields.find((field) => field.key === "alcohol");
    expect(alcohol?.conflict).toBe(true);
  });
});
