import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractConstrainedCulinaryClaims,
  extractCulinarySectionFromHtml,
} from "@/lib/culinary-extract";
import { categorizeFoodText } from "@/lib/food-taxonomy";

function fixture(name: string): string {
  return readFileSync(join(process.cwd(), "lib/fixtures/culinary", name), "utf8");
}

describe("culinary section extraction", () => {
  it("keeps the Recas culinary heading and rejects related products", () => {
    const section = extractCulinarySectionFromHtml(fixture("recas-focused.html"));
    expect(section.found).toBe(true);
    expect(section.text.toLowerCase()).toContain("mici");
    expect(section.text.toLowerCase()).not.toContain("produse similare");
    expect(section.chromeRejected).toBe(false);
    const claims = extractConstrainedCulinaryClaims(section.text, {
      sourceUrl: "https://www.cramelerecas.ro/vin/sole",
    });
    expect(claims.categories).toEqual(["grilled_meat"]);
  });

  it("rejects chrome-only culinary blocks", () => {
    const section = extractCulinarySectionFromHtml(fixture("chrome-only.html"));
    expect(section.found).toBe(false);
    expect(section.chromeRejected).toBe(true);
    const claims = extractConstrainedCulinaryClaims(section.sourceExcerpt);
    expect(claims.claims).toEqual([]);
  });

  it("rejects tasting-note dessert leaks", () => {
    const section = extractCulinarySectionFromHtml(fixture("tasting-leak-dessert.html"));
    expect(section.tastingNoteRejected).toBe(true);
    expect(section.found).toBe(false);
  });

  it("rejects laundry-list gastronomy blurbs", () => {
    const section = extractCulinarySectionFromHtml(fixture("laundry-list.html"));
    expect(section.laundryListRejected).toBe(true);
    const claims = extractConstrainedCulinaryClaims(section.text);
    expect(claims.claims).toEqual([]);
  });

  it("keeps fish grill distinct from meat grill", () => {
    const section = extractCulinarySectionFromHtml(fixture("white-grill-fish.html"));
    expect(section.found).toBe(true);
    const claims = extractConstrainedCulinaryClaims(section.text);
    expect(claims.categories).toContain("grilled_fish");
    expect(claims.categories).not.toContain("grilled_meat");
    expect(categorizeFoodText("peste la gratar")).toEqual(["grilled_fish"]);
    expect(categorizeFoodText("mici")).toEqual(["grilled_meat"]);
  });
});
