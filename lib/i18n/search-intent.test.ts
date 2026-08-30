import { describe, expect, it } from "vitest";
import {
  isSommelierQuery,
  sommelierPageHref,
  sommelierQueryHref,
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
  });

  it("keeps Sommelier links free of the prompt query string", () => {
    expect(sommelierPageHref("en")).toBe("/en/ai-sommelier");
    expect(sommelierQueryHref("wine for sarmale", "en")).toBe(
      "/en/ai-sommelier",
    );
    expect(sommelierQueryHref("vin pentru sarmale", "ro")).toBe(
      "/ai-sommelier",
    );
  });
});
