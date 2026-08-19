import { describe, expect, it } from "vitest";
import {
  isSommelierQuery,
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

  it("preserves the explicit locale in Sommelier links", () => {
    expect(sommelierQueryHref("wine for sarmale", "en")).toBe(
      "/en/ai-sommelier?q=wine%20for%20sarmale",
    );
    expect(sommelierQueryHref("vin pentru sarmale", "ro")).toBe(
      "/ai-sommelier?q=vin%20pentru%20sarmale",
    );
  });
});

