import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("translation source registry", () => {
  it("includes public prose without translating hidden legacy sections", async () => {
    const source = await readFile(
      new URL("./content-sources.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain('"descriptionEditorial"');
    expect(source).toContain('"valueExplanation"');
    expect(source).toContain('"foodPairings"');
    expect(source).not.toContain("foodPairingNotes");
    expect(source).not.toContain("dessertPairings");
    expect(source).not.toContain("recommendedOccasions");
  });

  it("keeps canonical identity separate from translated values", async () => {
    const source = await readFile(
      new URL("./content-sources.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain("protectedNames");
    expect(source).toContain("entityId: String(input.entityId)");
    expect(source).not.toMatch(/update\(wines\)|insert\(wines\)|delete\(wines\)/);
  });
});

