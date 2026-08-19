import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import englishWineMessages from "@/messages/en/wine.json";
import romanianWineMessages from "@/messages/ro/wine.json";
import {
  applyEnglishWineDetailTranslations,
  type WineDetailTranslationValues,
} from "@/lib/i18n/wine-detail";
import {
  buildWineJsonLd,
  buildWineMetadataDescription,
} from "@/lib/wine-json-ld";
import type { PublicTechnicalTrust } from "@/lib/tech-facts/public-trust";
import type { WineWithRelations } from "@/types";

vi.mock("server-only", () => ({}));

function wine(): WineWithRelations {
  return {
    id: 27,
    slug: "selene-feteasca-neagra",
    name: "Selene Fetească Neagră",
    type: "red",
    sweetness: "sec",
    vintage: 2022,
    status: "verified",
    valueScore: 82,
    giftScore: null,
    foodMatchScore: null,
    priceAvg: 78,
    currentPrice: 78,
    descriptionEditorial: "Text editorial romanesc.",
    valueExplanation: "Explicatie de valoare in romana.",
    tasteProfile: "Fructe negre si condimente.",
    thingsYouShouldKnow: ["A se servi la temperatura potrivita."],
    tastingNotes: "Note de degustare in romana.",
    imageAlt: "Sticla de vin rosu.",
    grapeVarieties: [{ name: "Fetească Neagră" }],
    foodPairings: [],
    dessertPairings: [],
    medals: [],
    priceHistory: [],
    availability: [],
    affiliateLinks: [],
    producerContent: {
      viticulture: "Vie romaneasca.",
      tastingNotes: "Text romanesc.",
      culinaryPairings: "Preparat romanesc.",
    },
    winery: {
      id: 1,
      name: "Cramele Recaș",
      slug: "cramele-recas",
      verified: true,
    },
    region: { id: 1, name: "Banat", slug: "banat" },
  } as unknown as WineWithRelations;
}

function trust(): PublicTechnicalTrust {
  const fields = Object.fromEntries(
    ["alcohol", "acidity", "sugar", "sweetness", "vintage"].map((field) => [
      field,
      {
        field,
        value: null,
        status: "unknown",
        sourceCount: 0,
        sources: [],
      },
    ]),
  ) as unknown as PublicTechnicalTrust["fields"];
  return {
    fields,
    hasVerifiedFields: false,
    verifiedFieldCount: 0,
    sources: [],
  };
}

function sortedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortedKeys(nested)]),
    );
  }
  return typeof value;
}

describe("Prompt 27B wine detail localization", () => {
  it("keeps Romanian and English domain message keys identical", () => {
    expect(sortedKeys(englishWineMessages)).toEqual(
      sortedKeys(romanianWineMessages),
    );
    expect(JSON.stringify(englishWineMessages)).not.toMatch(
      /[\u2013\u2014]/,
    );
    expect(JSON.stringify(romanianWineMessages)).not.toMatch(
      /[\u2013\u2014]/,
    );
  });

  it("strips untranslated Romanian editorial and marks limited data", () => {
    const localized = applyEnglishWineDetailTranslations(wine(), {});
    const serialized = JSON.stringify(localized.wine);

    expect(localized.limitedData).toBe(true);
    expect(localized.missingFields).toContain("descriptionEditorial");
    expect(serialized).not.toContain("Text editorial romanesc");
    expect(serialized).not.toContain("Fructe negre");
    expect(serialized).not.toContain("Vie romaneasca");
    expect(localized.wine.name).toBe("Selene Fetească Neagră");
    expect(localized.wine.valueScore).toBe(82);
  });

  it("uses only READY-shaped English values on editorial surfaces", () => {
    const translations: WineDetailTranslationValues = {
      descriptionEditorial: "A structured Romanian red wine.",
      valueExplanation: "Strong value at the tracked price.",
      tasteProfile: "Black fruit and gentle spice.",
      thingsYouShouldKnow: ["Serve slightly below room temperature."],
      tastingNotes: "Black cherry with a dry finish.",
      imageAlt: "Bottle of Selene Fetească Neagră 2022.",
    };
    const localized = applyEnglishWineDetailTranslations(wine(), translations);

    expect(localized.limitedData).toBe(false);
    expect(localized.wine.descriptionEditorial).toBe(
      translations.descriptionEditorial,
    );
    expect(localized.wine.thingsYouShouldKnow).toEqual(
      translations.thingsYouShouldKnow,
    );
    expect(localized.wine.name).toBe("Selene Fetească Neagră");
    expect(localized.wine.valueScore).toBe(82);
  });

  it("builds English metadata and structured data with localized URLs", () => {
    const localized = applyEnglishWineDetailTranslations(wine(), {
      descriptionEditorial: "A structured Romanian red wine.",
      valueExplanation: "Strong value at the tracked price.",
      tasteProfile: "Black fruit and gentle spice.",
      thingsYouShouldKnow: ["Serve slightly below room temperature."],
      tastingNotes: "Black cherry with a dry finish.",
      imageAlt: "Bottle of Selene Fetească Neagră 2022.",
    }).wine;
    const schemas = buildWineJsonLd(localized, [], trust(), "en");
    const serialized = JSON.stringify(schemas);

    expect(buildWineMetadataDescription(localized, "en")).toContain(
      "Full analysis",
    );
    expect(serialized).toContain("/en/wines/selene-feteasca-neagra");
    expect(serialized).toContain('"name":"Home"');
    expect(serialized).not.toContain("Note de degustare in romana");
  });

  it("keeps the Wine dictionary out of the client provider payload", async () => {
    const layout = await readFile(
      new URL("../../app/layout.tsx", import.meta.url),
      "utf8",
    );
    expect(layout).not.toMatch(
      /clientMessages\s*=\s*\{[\s\S]*?Wine:/,
    );
  });
});
