import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import enDiscovery from "@/messages/en/discovery.json";
import roDiscovery from "@/messages/ro/discovery.json";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

function leafStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }
  return Object.values(value).flatMap(leafStrings);
}

describe("Prompt 27B discovery message fragments", () => {
  it("keeps Romanian and English fragment keys in sync", () => {
    expect(leafKeys(enDiscovery).sort()).toEqual(leafKeys(roDiscovery).sort());
  });

  it("contains no known Romanian interface labels in English copy", () => {
    const englishCopy = leafStrings(enDiscovery);
    const knownRomanianLabels = [
      "Cauta vinuri",
      "Cauta crame",
      "Culoare / tip",
      "Dulceata",
      "Pret crescator",
      "Toate scorurile",
      "Reseteaza filtrele",
      "Crame din Romania",
      "Intrebari frecvente",
      "Vezi crama",
      "Politica de confidentialitate",
    ];

    for (const label of knownRomanianLabels) {
      expect(englishCopy).not.toContain(label);
    }
  });

  it("keeps proper names and Romanian currency semantics unchanged", () => {
    expect(enDiscovery.TopLists.items.feteasca.title).toContain(
      "Feteasca Neagra",
    );
    expect(enDiscovery.TopLists.items.sarmale.title).toContain("sarmale");
    expect(enDiscovery.Wineries.card.country).toBe("Romania");
    expect(enDiscovery.Catalog.directory.prices.under50).toBe("Under 50 RON");
    expect(roDiscovery.Catalog.directory.prices.under50).toBe("Sub 50 RON");
  });
});

describe("Prompt 27B client localization boundaries", () => {
  it("passes scoped copy and locale props to interactive discovery clients", async () => {
    const [hero, catalog, wineryDirectory, cookies, smartSearch] =
      await Promise.all([
        readFile(new URL("../components/hero.tsx", import.meta.url), "utf8"),
        readFile(
          new URL(
            "../components/wines/wine-catalog-directory.tsx",
            import.meta.url,
          ),
          "utf8",
        ),
        readFile(
          new URL(
            "../components/wineries/winery-directory.tsx",
            import.meta.url,
          ),
          "utf8",
        ),
        readFile(
          new URL(
            "../components/cookie-consent/cookie-consent-client.tsx",
            import.meta.url,
          ),
          "utf8",
        ),
        readFile(
          new URL("../components/smart-search-client.tsx", import.meta.url),
          "utf8",
        ),
      ]);

    for (const source of [
      hero,
      catalog,
      wineryDirectory,
      cookies,
      smartSearch,
    ]) {
      expect(source).toMatch(/\bcopy\b/);
      expect(source).toMatch(/\blocale\b/);
      expect(source).not.toMatch(/messages\/(?:ro|en)\/discovery/);
    }
  });

  it("builds the catalog model for the active locale", async () => {
    const catalogPage = await readFile(
      new URL("../app/vinuri/page.tsx", import.meta.url),
      "utf8",
    );

    expect(catalogPage).toContain("buildLocalizedPublicWineCatalogItem");
    expect(catalogPage).toContain(
      "buildLocalizedPublicWineCatalogItem(wine, locale)",
    );
    expect(catalogPage).not.toContain("buildPublicWineCatalogItem(");
  });

  it("keeps discovery dictionaries on the server boundary", async () => {
    const discoveryServer = await readFile(
      new URL("./i18n/discovery.ts", import.meta.url),
      "utf8",
    );

    expect(discoveryServer).toContain('import "server-only"');
    expect(discoveryServer).toContain('from "next-intl/server"');
    expect(discoveryServer).toContain("createTranslator");
  });
});
