import { describe, expect, it } from "vitest";
import { localizedHref } from "@/i18n/paths";
import { getDishPairingPage } from "@/lib/dish-pairing-pages";
import {
  buildLocalizedAlternates,
  buildLocalizedDishPresentation,
  buildLocalizedTopListPresentation,
  getPseoMessages,
} from "@/lib/i18n/pseo";
import {
  resolveTopListDefinition,
  topListSlugForLocale,
} from "@/lib/i18n/top-list-routes";
import type { ResolvedTopList } from "@/lib/top-lists";
import type { WineWithRelations } from "@/types";

function messageKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, nested]) =>
      messageKeys(nested, prefix.length > 0 ? `${prefix}.${key}` : key),
  );
}

function wine(id: number): WineWithRelations {
  return {
    id,
    slug: `wine-${id}`,
    name: `Wine ${id}`,
    priceAvg: 40 + id,
    valueScore: 80 - id,
  } as unknown as WineWithRelations;
}

function listFixture(wines: WineWithRelations[]): ResolvedTopList {
  return {
    slug: "vinuri-sub-50-lei",
    heading: "Vinuri ieftine si bune",
    metaTitle: "Vinuri romanesti sub 50 lei",
    metaDescription: "Clasament romanesc.",
    intro: "Selectie romaneasca.",
    wines,
    rankScores: wines.map((item) => item.valueScore ?? 0),
    faq: [{ question: "Care?", answer: "Acestea." }],
    breadcrumbName: "Sub 50 lei",
    rankMetric: "value",
  };
}

describe("Prompt 27B pSEO fragments", () => {
  it("keeps Romanian and English fragment keys identical", () => {
    expect(messageKeys(getPseoMessages("en")).sort()).toEqual(
      messageKeys(getPseoMessages("ro")).sort(),
    );
  });

  it("provides English metadata copy and localized alternates", () => {
    const definition = resolveTopListDefinition("vinuri-sub-50-lei", "ro");
    expect(definition).not.toBeNull();
    if (!definition) return;

    const presentation = buildLocalizedTopListPresentation(
      definition,
      listFixture([wine(1), wine(2)]),
      "en",
    );
    const englishSlug = topListSlugForLocale(definition, "en");
    const alternates = buildLocalizedAlternates(
      "en",
      localizedHref("ro", "topWine", { slug: "vinuri-sub-50-lei" }),
      localizedHref("en", "topWine", { slug: englishSlug }),
    );

    expect(presentation.metaTitle).toMatch(/best/i);
    expect(presentation.metaDescription).toContain("prices in RON");
    expect(JSON.stringify(presentation)).not.toMatch(
      /\b(cele|vinuri|pret|clasament)\b/i,
    );
    expect(alternates.canonical).toBe(
      "https://www.vinintel.ro/en/top-wines/wines-under-50-ron",
    );
    expect(alternates.languages).toMatchObject({
      ro: "https://www.vinintel.ro/topuri/vinuri-sub-50-lei",
      en: "https://www.vinintel.ro/en/top-wines/wines-under-50-ron",
    });
  });

  it("keeps ranking IDs and order unchanged while localizing copy", () => {
    const definition = resolveTopListDefinition(
      "cele-mai-bune-vinuri-romanesti",
      "ro",
    );
    expect(definition).not.toBeNull();
    if (!definition) return;

    const list = listFixture([wine(7), wine(3), wine(9)]);
    const before = list.wines.map(({ id }) => id);

    buildLocalizedTopListPresentation(definition, list, "ro");
    buildLocalizedTopListPresentation(definition, list, "en");

    expect(list.wines.map(({ id }) => id)).toEqual(before);
    expect(list.rankScores).toEqual([73, 77, 71]);
  });

  it("localizes dish metadata without changing the internal dish ID", () => {
    const config = getDishPairingPage("sarmale");
    expect(config).not.toBeNull();
    if (!config) return;

    const presentation = buildLocalizedDishPresentation(config, "en");

    expect(config.slug).toBe("sarmale");
    expect(config.occasionId).toBe("sarmale");
    expect(presentation.metaTitle).toBe(
      "Wine for sarmale: Romanian picks under 50 RON",
    );
    expect(presentation.intro).not.toMatch(/\b(vin|pret|recomandari)\b/i);
  });

  it("contains no long dash characters in either pSEO fragment", () => {
    expect(JSON.stringify(getPseoMessages("ro"))).not.toMatch(/[\u2013\u2014]/);
    expect(JSON.stringify(getPseoMessages("en"))).not.toMatch(/[\u2013\u2014]/);
  });
});
