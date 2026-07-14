import { describe, expect, it } from "vitest";
import {
  buildWineFullTitle,
  extractVintageFromPageText,
  getMaxValidWineVintage,
  isValidWineVintage,
  parseVintageFromBareText,
  parseVintageFromSlug,
  resolveWineVintage,
  stripEmbeddedVintageFromName,
} from "@/lib/wine-vintage";

describe("getMaxValidWineVintage", () => {
  it("is always current year + 1, not a hardcoded constant", () => {
    expect(getMaxValidWineVintage(2026)).toBe(2027);
    expect(getMaxValidWineVintage(2030)).toBe(2031);
    expect(getMaxValidWineVintage(1999)).toBe(2000);
  });

  it("defaults to the real current year when no reference is given", () => {
    const expected = new Date().getFullYear() + 1;
    expect(getMaxValidWineVintage()).toBe(expected);
  });
});

describe("isValidWineVintage", () => {
  it("rejects vintages before the minimum accepted year", () => {
    expect(isValidWineVintage(1989, 2026)).toBe(false);
    expect(isValidWineVintage(1990, 2026)).toBe(true);
  });

  it("rejects vintages further in the future than current year + 1", () => {
    expect(isValidWineVintage(2028, 2026)).toBe(false);
    expect(isValidWineVintage(2027, 2026)).toBe(true);
  });

  it("moves the acceptable ceiling forward as the reference year advances", () => {
    expect(isValidWineVintage(2031, 2026)).toBe(false);
    expect(isValidWineVintage(2031, 2030)).toBe(true);
  });

  it("rejects non-integer years", () => {
    expect(isValidWineVintage(2020.5, 2026)).toBe(false);
  });
});

describe("parseVintageFromSlug", () => {
  it("extracts a trailing 4-digit vintage from a slug", () => {
    expect(parseVintageFromSlug("crama-x-cabernet-sauvignon-2019")).toBe(2019);
  });

  it("returns null when there is no trailing vintage", () => {
    expect(parseVintageFromSlug("crama-x-cabernet-sauvignon")).toBeNull();
  });

  it("returns null for undefined or empty slugs", () => {
    expect(parseVintageFromSlug(undefined)).toBeNull();
    expect(parseVintageFromSlug("")).toBeNull();
  });
});

describe("parseVintageFromBareText", () => {
  it("finds the last plausible 4-digit year mentioned in free text", () => {
    expect(parseVintageFromBareText("Cabernet Sauvignon 2020, sticla 0.75L")).toBe(2020);
  });

  it("ignores numbers outside the plausible vintage range", () => {
    expect(parseVintageFromBareText("Sticla de 750 ml, alcool 13.5%")).toBeNull();
  });
});

describe("extractVintageFromPageText", () => {
  it("prefers explicitly labeled vintage mentions", () => {
    expect(extractVintageFromPageText("Vintage 2021, recolta de exceptie")).toBe(
      2021,
    );
  });

  it("returns null when nothing matches", () => {
    expect(extractVintageFromPageText("Vin fara vintage mentionat")).toBeNull();
  });
});

describe("resolveWineVintage", () => {
  it("prefers an explicit numeric vintage over any inferred source", () => {
    expect(
      resolveWineVintage({
        vintage: 2018,
        slug: "wine-2099",
        name: "Wine 2099",
      }),
    ).toBe(2018);
  });

  it("falls back to slug, then name, then page text in that order", () => {
    expect(resolveWineVintage({ slug: "wine-2019" })).toBe(2019);
    expect(resolveWineVintage({ name: "Wine 2020" })).toBe(2020);
    expect(
      resolveWineVintage({ pageText: "Vintage 2021" }),
    ).toBe(2021);
  });

  it("returns null (never NV as a number) when nothing usable is found", () => {
    expect(resolveWineVintage({ name: "Wine NV" })).toBeNull();
  });
});

describe("stripEmbeddedVintageFromName / buildWineFullTitle", () => {
  it("does not duplicate the vintage in the built title", () => {
    const name = "Cabernet Sauvignon 2019";
    const stripped = stripEmbeddedVintageFromName(name, 2019);
    expect(stripped).toBe("Cabernet Sauvignon");
    expect(buildWineFullTitle(name, 2019)).toBe("Cabernet Sauvignon 2019");
  });

  it("leaves the name untouched when there is no vintage", () => {
    expect(buildWineFullTitle("Cabernet Sauvignon NV", null)).toBe(
      "Cabernet Sauvignon NV",
    );
  });
});
