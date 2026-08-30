import { describe, expect, it } from "vitest";
import {
  classifySearchQuery,
  echoableCatalogQuery,
  isSommelierQuery,
  searchPageHref,
  sommelierPageHref,
} from "@/lib/search-intent";

describe("locale-aware search intent", () => {
  it("understands English buyer and pairing questions", () => {
    expect(isSommelierQuery("I want a dry red wine under 60 RON", "en")).toBe(
      true,
    );
    expect(isSommelierQuery("What should I drink with sarmale?", "en")).toBe(
      true,
    );
    expect(isSommelierQuery("Selene Fetească Neagră", "en")).toBe(false);
  });

  it("sends natural-language food pairing requests to the Sommelier", () => {
    expect(
      isSommelierQuery(
        "Vreau vin sa beau cu mamaliga cu branza si smantana",
        "ro",
      ),
    ).toBe(true);
    expect(
      isSommelierQuery(
        "vreau un vin sa mearga bine cu cheesecake",
        "ro",
      ),
    ).toBe(true);
    expect(
      isSommelierQuery(
        "vreau un vin sa mearga bine cu cranati de casa de porc",
        "ro",
      ),
    ).toBe(true);
    expect(isSommelierQuery("vin pentru mamaliga cu branza", "ro")).toBe(true);
    expect(isSommelierQuery("as vrea un vin la mici", "ro")).toBe(true);
    expect(
      isSommelierQuery(
        "I want wine to drink with polenta with cheese and sour cream",
        "en",
      ),
    ).toBe(true);
  });

  it("keeps catalog lookups in catalog search", () => {
    expect(isSommelierQuery("Cramele Recas Feteasca Neagra 2022", "ro")).toBe(
      false,
    );
    expect(isSommelierQuery("Davino", "ro")).toBe(false);
    expect(isSommelierQuery("Feteasca Neagra", "ro")).toBe(false);
    expect(classifySearchQuery("Davino", "ro")).toBe("catalog");
  });

  it("does not treat shop URLs as catalog names or sommelier questions", () => {
    const shopUrl =
      "https://shop.dancinglobster.ro/products/vin-rosu-carm-douro?country=RO";
    expect(classifySearchQuery(shopUrl, "ro")).toBe("link");
    expect(isSommelierQuery(shopUrl, "ro")).toBe(false);
    expect(echoableCatalogQuery(shopUrl)).toBe(null);
  });

  it("keeps Sommelier and search notice links free of the prompt query string", () => {
    expect(sommelierPageHref("en")).toBe("/en/ai-sommelier");
    expect(sommelierPageHref("ro")).toBe("/ai-sommelier");
    expect(searchPageHref("ro", "link")).toBe("/cauta?notice=link");
    expect(searchPageHref("en", "link")).toBe("/en/search?notice=link");
  });
});
