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
    id: 1,
    field: "alcohol",
    value: 12.5,
    verificationStatus: "verified_official",
    sourceClass: "official_producer_page",
    sourceUrl: "https://murfatlar-vinul.ro/zestrea/",
    sourceTitle: "Murfatlar Zestrea",
    unit: "% vol",
    excerpt: "12.5% vol",
    confidence: 0.9,
    observedAt: "2026-11-03T10:00:00.000Z",
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
    expect(alcohol?.verification).toBe("verified_official");
  });

  it("uses one record for value, source and badge regardless of DB row order", () => {
    const official = row({
      id: 2,
      field: "alcohol",
      value: 12.5,
      verificationStatus: "verified_official",
      sourceClass: "official_producer_page",
      sourceUrl: "https://producer.example/technical",
      sourceTitle: "Producer technical sheet",
      confidence: 0.95,
      observedAt: "2026-11-03T11:00:00.000Z",
    });
    const retailer = row({
      id: 1,
      field: "alcohol",
      value: 13.5,
      verificationStatus: "attributed_retailer",
      sourceClass: "retailer",
      sourceUrl: "https://retailer.example/wine",
      sourceTitle: "Retailer listing",
      confidence: 0.99,
      observedAt: "2026-11-03T12:00:00.000Z",
    });

    for (const rows of [
      [retailer, official],
      [official, retailer],
    ]) {
      const profile = buildUniversalWineProfile({
        wine,
        locale: "ro",
        claimRows: rows,
      });
      const alcohol = profile.sections
        .find((section) => section.id === "technical")
        ?.fields.find((field) => field.key === "alcohol");
      expect(alcohol).toMatchObject({
        value: "12.5 % vol",
        sourceUrl: "https://producer.example/technical",
        sourceTitle: "Producer technical sheet",
        verification: "verified_official",
        conflict: true,
      });
    }
  });

  it("never shows a retailer value with an official verification badge", () => {
    const profile = buildUniversalWineProfile({
      wine,
      locale: "ro",
      claimRows: [
        row({
          id: 7,
          field: "alcohol",
          value: 13.5,
          verificationStatus: "verified_official",
          sourceClass: "retailer",
          sourceUrl: "https://retailer.example/wine",
          sourceTitle: "Retailer listing",
        }),
      ],
    });
    const alcohol = profile.sections
      .find((section) => section.id === "technical")
      ?.fields.find((field) => field.key === "alcohol");
    expect(alcohol).toMatchObject({
      value: "13.5 % vol",
      sourceUrl: "https://retailer.example/wine",
      sourceTitle: "Retailer listing",
      verification: "attributed_retailer",
    });
  });

  it("prefers the official record when conflicting evidence is reversed in the DB", () => {
    const official = row({
      id: 1,
      field: "food_pairing",
      value: ["pește"],
      verificationStatus: "verified_official",
      sourceClass: "official_producer_page",
      sourceUrl: "https://producer.example/pairing",
      sourceTitle: "Official pairing",
      unit: null,
    });
    const retailer = row({
      id: 2,
      field: "food_pairing",
      value: ["pui"],
      verificationStatus: "attributed_retailer",
      sourceClass: "retailer",
      sourceUrl: "https://retailer.example/pairing",
      sourceTitle: "Retailer pairing",
      unit: null,
    });
    const first = buildUniversalWineProfile({
      wine,
      locale: "ro",
      claimRows: [retailer, official],
    });
    const second = buildUniversalWineProfile({
      wine,
      locale: "ro",
      claimRows: [official, retailer],
    });
    const field = (profile: typeof first) =>
      profile.sections
        .find((section) => section.id === "serving")
        ?.fields.find((item) => item.key === "food_pairing");
    expect(field(first)).toEqual(field(second));
    expect(field(first)).toMatchObject({
      value: "pește",
      sourceUrl: "https://producer.example/pairing",
      verification: "verified_official",
      conflict: true,
    });
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
    expect(alcohol).toMatchObject({
      value: "12.5 % vol",
      sourceUrl: "https://murfatlar-vinul.ro/zestrea/",
      sourceTitle: "Murfatlar Zestrea",
      verification: "verified_official",
      conflict: true,
    });
  });
});
