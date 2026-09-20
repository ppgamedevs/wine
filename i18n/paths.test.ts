import { describe, expect, it } from "vitest";
import {
  activeAppLocale,
  alternateLocaleHref,
  localizedHref,
  pathnameWithLocale,
  resolveLocalizedPath,
} from "@/i18n/paths";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isAppLocale,
} from "@/i18n/locale";

describe("Prompt 27B locale configuration", () => {
  it("keeps Romanian as the unprefixed default", () => {
    expect(DEFAULT_LOCALE).toBe("ro");
    expect(SUPPORTED_LOCALES).toEqual(["ro", "en"]);
    expect(isAppLocale("ro")).toBe(true);
    expect(isAppLocale("en")).toBe(true);
    expect(isAppLocale("de")).toBe(false);
  });
});

describe("activeAppLocale", () => {
  it("prefers the public /en prefix even if the route param is stale", () => {
    expect(activeAppLocale("/en", "ro")).toBe("en");
    expect(activeAppLocale("/en/wines", "ro")).toBe("en");
    expect(activeAppLocale("/wines", "en")).toBe("en");
    expect(activeAppLocale("/", "en")).toBe("en");
    expect(activeAppLocale("/vinuri", "ro")).toBe("ro");
  });

  it("reads the public URL prefix when the route param is missing", () => {
    expect(activeAppLocale("/en")).toBe("en");
    expect(activeAppLocale("/en/wines")).toBe("en");
    expect(activeAppLocale("/ro/vinuri")).toBe("ro");
    expect(activeAppLocale("/vinuri")).toBe("ro");
  });

  it("rebuilds a prefixed path from a stripped next-intl pathname", () => {
    expect(pathnameWithLocale("/wines", "en")).toBe("/en/wines");
    expect(pathnameWithLocale("/", "en")).toBe("/en");
    expect(pathnameWithLocale("/en/wines", "en")).toBe("/en/wines");
    expect(pathnameWithLocale("/vinuri", "ro")).toBe("/vinuri");
  });
});

describe("localizedHref", () => {
  it("uses the exact localized public route prefixes", () => {
    expect(localizedHref("ro", "home")).toBe("/");
    expect(localizedHref("en", "home")).toBe("/en");
    expect(localizedHref("ro", "wines")).toBe("/vinuri");
    expect(localizedHref("en", "wines")).toBe("/en/wines");
    expect(localizedHref("en", "wineries")).toBe("/en/wineries");
    expect(localizedHref("en", "topWines")).toBe("/en/top-wines");
    expect(localizedHref("en", "howScoresWork")).toBe(
      "/en/how-scores-work",
    );
    expect(localizedHref("en", "addWine")).toBe("/en/add-wine");
    expect(localizedHref("en", "privacyPolicy")).toBe("/en/privacy-policy");
    expect(localizedHref("en", "cookiePolicy")).toBe("/en/cookie-policy");
    expect(localizedHref("en", "search")).toBe("/en/search");
    expect(localizedHref("ro", "grapeVarieties")).toBe("/soiuri");
    expect(localizedHref("en", "grapeVarieties")).toBe("/en/grape-varieties");
    expect(localizedHref("ro", "regions")).toBe("/regiuni");
    expect(localizedHref("en", "regions")).toBe("/en/regions");
  });

  it("keeps canonical entity identity stable", () => {
    expect(localizedHref("en", "wine", { slug: "selene-feteasca-neagra" }))
      .toBe("/en/wines/selene-feteasca-neagra");
    expect(localizedHref("en", "winery", { slug: "cramele-recas" })).toBe(
      "/en/wineries/cramele-recas",
    );
    expect(localizedHref("en", "wineFor", { dish: "sarmale" })).toBe(
      "/en/wine-for/sarmale",
    );
    expect(localizedHref("en", "grapeVariety", { slug: "feteasca-neagra" }))
      .toBe("/en/grape-varieties/feteasca-neagra");
    expect(localizedHref("en", "region", { slug: "dealu-mare" })).toBe(
      "/en/regions/dealu-mare",
    );
  });
});

describe("alternateLocaleHref", () => {
  it.each([
    ["/wines/selene-feteasca-neagra", "/en/wines/selene-feteasca-neagra"],
    ["/en/wineries/cramele-recas", "/wineries/cramele-recas"],
    ["/vin-pentru/sarmale", "/en/wine-for/sarmale"],
    ["/en/grape-varieties/feteasca-neagra", "/soiuri/feteasca-neagra"],
    ["/en/grape-varieties", "/soiuri"],
    ["/en/regions", "/regiuni"],
    ["/en/regions/dealu-mare", "/regiuni/dealu-mare"],
  ])("round-trips %s to %s", (source, expected) => {
    const targetLocale = source.startsWith("/en") ? "ro" : "en";
    expect(alternateLocaleHref(source, targetLocale)).toBe(expected);
  });

  it("exposes canonical slug hooks for top lists", () => {
    expect(
      alternateLocaleHref(
        "/topuri/cele-mai-bune-vinuri-romanesti",
        "en",
        {
          topWineSlug: () => "best-romanian-wines",
        },
      ),
    ).toBe("/en/top-wines/best-romanian-wines");
  });

  it("canonicalizes Romanian permanent aliases", () => {
    expect(alternateLocaleHref("/vinuri/example", "en")).toBe(
      "/en/wines/example",
    );
    expect(alternateLocaleHref("/crame/example", "en")).toBe(
      "/en/wineries/example",
    );
    expect(alternateLocaleHref("/perechi/sarmale", "en")).toBe(
      "/en/wine-for/sarmale",
    );
    expect(alternateLocaleHref("/jurnal-vin", "en")).toBe("/en/journal");
  });

  it("does not invent an equivalent for an excluded route", () => {
    expect(resolveLocalizedPath("/admin/wines")).toBeNull();
    expect(alternateLocaleHref("/wineries/example/dashboard", "en")).toBeNull();
  });
});
