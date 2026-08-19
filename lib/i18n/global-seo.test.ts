import { describe, expect, it } from "vitest";
import {
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
} from "@/lib/seo";

describe("global localized structured data", () => {
  it("uses English copy and the English search route", () => {
    const organization = buildOrganizationJsonLd("en");
    const website = buildWebsiteJsonLd("en");
    const serialized = JSON.stringify([organization, website]);

    expect(serialized).toContain("/en/search?q=");
    expect(serialized).toContain('"inLanguage":"en"');
    expect(serialized).toContain('"availableLanguage":["English"]');
    expect(serialized).not.toMatch(
      /\b(ghidul|vinurilor|recomandari|mancarea|cauta)\b/i,
    );
  });

  it("preserves Romanian structured-data routes", () => {
    const website = buildWebsiteJsonLd("ro");
    expect(website.potentialAction.target.urlTemplate).toContain(
      "/cauta?q={search_term_string}",
    );
    expect(website.inLanguage).toBe("ro-RO");
  });
});

