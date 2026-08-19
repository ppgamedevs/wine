import { describe, expect, it, vi } from "vitest";
import englishMessages from "@/messages/en/winery-profile.json";
import romanianMessages from "@/messages/ro/winery-profile.json";
import {
  applyEnglishWineryProfileTranslations,
  buildWineryProfileJsonLd,
  isWineryProfileIndexable,
  type WineryProfileTranslationValues,
} from "@/lib/i18n/winery-profile";
import type { WineryEvent, WineryWithWines } from "@/types";

vi.mock("server-only", () => ({}));

function winery(): WineryWithWines {
  return {
    id: 27,
    slug: "crama-test",
    name: "Crama Test",
    description: "Descriere romaneasca a cramei.",
    customStory: "Poveste romaneasca despre vie.",
    isPremium: true,
    verified: true,
    website: "https://example.com",
    foundedYear: 1998,
    logoUrl: null,
    updatedAt: "2026-08-19T10:00:00.000Z",
    region: {
      id: 4,
      slug: "dealu-mare",
      name: "Dealu Mare",
    },
    wines: [
      {
        id: 91,
        slug: "cuvee-noir",
        name: "Cuvée Noir",
        priceAvg: 89,
        currentPrice: 87,
        lowestPrice30d: 84,
        valueScore: 82,
        tastingNotes: "Fructe negre si condimente.",
        type: "red",
        winery: {
          id: 27,
          slug: "crama-test",
          name: "Crama Test",
        },
        region: {
          id: 4,
          slug: "dealu-mare",
          name: "Dealu Mare",
        },
      },
    ],
  } as unknown as WineryWithWines;
}

function events(): WineryEvent[] {
  return [
    {
      id: 301,
      wineryId: 27,
      slug: "degustare-de-toamna",
      title: "Degustare de toamna",
      description: "Descopera noile vinuri ale cramei.",
      location: "Sala de degustare",
      eventType: "tasting",
      startsAt: "2026-10-03T16:00:00.000Z",
      endsAt: "2026-10-03T19:00:00.000Z",
      registrationUrl: "https://example.com/event",
      isPublished: true,
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-19T10:00:00.000Z",
    },
  ];
}

function sortedShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedShape);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortedShape(nested)]),
    );
  }
  return typeof value;
}

describe("Prompt 27B winery profile localization", () => {
  it("keeps Romanian and English fragment keys identical", () => {
    expect(sortedShape(englishMessages)).toEqual(sortedShape(romanianMessages));
    expect(JSON.stringify(englishMessages)).not.toMatch(/[\u2013\u2014]/);
    expect(JSON.stringify(romanianMessages)).not.toMatch(/[\u2013\u2014]/);
  });

  it("removes untranslated Romanian prose from the English profile", () => {
    const localized = applyEnglishWineryProfileTranslations(
      winery(),
      events(),
      {},
    );
    const serialized = JSON.stringify(localized);

    expect(localized.limitedData).toBe(true);
    expect(localized.missingFields).toEqual([
      "winery.description",
      "winery.customStory",
      "event.301.title",
      "event.301.description",
      "event.301.location",
    ]);
    expect(serialized).not.toContain("Descriere romaneasca");
    expect(serialized).not.toContain("Poveste romaneasca");
    expect(serialized).not.toContain("Degustare de toamna");
    expect(serialized).not.toContain("Fructe negre");
    expect(localized.winery.name).toBe("Crama Test");
    expect(localized.winery.wines[0]?.id).toBe(91);
    expect(localized.winery.wines[0]?.valueScore).toBe(82);
    expect(localized.winery.wines[0]?.imageAlt).toBe(
      "Bottle of Cuvée Noir.",
    );
    expect(localized.events[0]?.id).toBe(301);
    expect(localized.events[0]?.startsAt).toBe(
      "2026-10-03T16:00:00.000Z",
    );
    expect(isWineryProfileIndexable(1, "en", localized.limitedData)).toBe(
      false,
    );
    expect(isWineryProfileIndexable(1, "ro", false)).toBe(true);
    expect(isWineryProfileIndexable(0, "ro", false)).toBe(false);
  });

  it("uses translated winery and event prose without changing facts", () => {
    const translations: WineryProfileTranslationValues = {
      winery: {
        description: "An established winery in Dealu Mare.",
        customStory: "A family story shaped by the vineyard.",
      },
      events: {
        "301": {
          title: "Autumn tasting",
          description: "Discover the winery's new releases.",
          location: "Tasting room",
        },
      },
    };
    const localized = applyEnglishWineryProfileTranslations(
      winery(),
      events(),
      translations,
    );

    expect(localized.limitedData).toBe(false);
    expect(localized.winery.description).toBe(
      translations.winery?.description,
    );
    expect(localized.events[0]?.title).toBe("Autumn tasting");
    expect(localized.events[0]?.registrationUrl).toBe(
      "https://example.com/event",
    );
    expect(localized.winery.wines[0]?.priceAvg).toBe(89);
  });

  it("builds English structured data with localized URLs and prose", () => {
    const localized = applyEnglishWineryProfileTranslations(
      winery(),
      events(),
      {
        winery: {
          description: "An established winery in Dealu Mare.",
          customStory: "A family story shaped by the vineyard.",
        },
        events: {
          "301": {
            title: "Autumn tasting",
            description: "Discover the winery's new releases.",
            location: "Tasting room",
          },
        },
      },
    );
    const schemas = buildWineryProfileJsonLd(
      localized.winery,
      [
        {
          question: "Where is Crama Test located?",
          answer: "Crama Test is in Dealu Mare.",
        },
      ],
      "en",
      null,
      {
        home: "Home",
        wineries: "Wineries",
        wineList: "Wines from Crama Test",
      },
    );
    const serialized = JSON.stringify(schemas);

    expect(serialized).toContain("/en/wineries/crama-test");
    expect(serialized).toContain("/en/wines/cuvee-noir");
    expect(serialized).toContain('"inLanguage":"en-GB"');
    expect(serialized).toContain("Romanian wine Cuvée Noir.");
    expect(serialized).not.toContain("Fructe negre");
    expect(serialized).not.toContain("Descriere romaneasca");
  });
});
