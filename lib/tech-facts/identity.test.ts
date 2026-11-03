import { describe, expect, it } from "vitest";
import {
  classifyAgainstSourceIdentity,
  classifyProductIdentity,
} from "@/lib/tech-facts/identity";
import { extractSourceIdentityFromHtml } from "@/lib/tech-facts/source-identity";

const dbWine = {
  wineName: "Zestrea Muscat Ottonel Demisec",
  wineryName: "Murfatlar",
  vintage: null,
  type: "alb",
  sweetness: "demisec",
  grapes: ["Muscat Ottonel"],
  bottleSizeMl: 750,
};

function sourceHtml(input: {
  name: string;
  sweetness?: string;
  grape?: string;
  volume?: string;
  type?: string;
}): string {
  return `<html><head><title>${input.name}</title></head><body>
    <h1>${input.name}</h1>
    <p>Vin ${input.type ?? "alb"} ${input.sweetness ?? "demisec"}, ${input.grape ?? "Muscat Ottonel"}, ${input.volume ?? "0,75 l"}.</p>
    <p>Concentratie alcoolica: 12,5% vol.</p>
  </body></html>`;
}

describe("exact product identity matching", () => {
  it("extracts type, sweetness, grape and volume from an independent source", () => {
    const source = extractSourceIdentityFromHtml(
      sourceHtml({ name: "Zestrea Muscat Ottonel Demisec" }),
    );
    expect(source).toMatchObject({
      sourceWineName: "Zestrea Muscat Ottonel Demisec",
      sourceType: "white",
      sourceSweetness: "demisec",
      sourceGrapes: ["Muscat Ottonel"],
      sourceBottleSize: 750,
    });
  });

  it("matches an exact source identity", () => {
    const source = extractSourceIdentityFromHtml(
      sourceHtml({ name: "Zestrea Muscat Ottonel Demisec" }),
    );
    expect(classifyAgainstSourceIdentity(dbWine, source)).toBe(
      "EXACT_WINE_EXACT_VINTAGE",
    );
  });

  it("rejects a source with different sweetness", () => {
    const source = extractSourceIdentityFromHtml(
      sourceHtml({ name: "Zestrea Muscat Ottonel Demidulce", sweetness: "demidulce" }),
    );
    expect(classifyAgainstSourceIdentity(dbWine, source)).toBe(
      "PRODUCT_MISMATCH",
    );
  });

  it("rejects a source with a different grape", () => {
    const source = extractSourceIdentityFromHtml(
      sourceHtml({ name: "Zestrea Chardonnay Demisec", grape: "Chardonnay" }),
    );
    expect(classifyAgainstSourceIdentity(dbWine, source)).toBe(
      "PRODUCT_MISMATCH",
    );
  });

  it("rejects a source with a different bottle size", () => {
    const source = extractSourceIdentityFromHtml(
      sourceHtml({ name: "Zestrea Muscat Ottonel Demisec", volume: "1,5 l" }),
    );
    expect(classifyAgainstSourceIdentity(dbWine, source)).toBe(
      "PRODUCT_MISMATCH",
    );
  });

  it("treats explicit sweetness/grape/size conflicts as mismatches", () => {
    expect(
      classifyProductIdentity(
        dbWine,
        { wineName: "Zestrea Muscat Ottonel Demisec", vintage: null },
        "SOURCE_NAME_EXACT",
      ),
    ).toBe("EXACT_WINE_EXACT_VINTAGE");
    expect(
      classifyProductIdentity(
        dbWine,
        {
          wineName: "Zestrea Muscat Ottonel Demisec",
          vintage: null,
          sweetness: "demidulce",
        },
        "SOURCE_NAME_EXACT",
      ),
    ).toBe("PRODUCT_MISMATCH");
    expect(
      classifyProductIdentity(
        dbWine,
        {
          wineName: "Zestrea Muscat Ottonel Demisec",
          vintage: null,
          grapes: ["Chardonnay"],
        },
        "SOURCE_NAME_EXACT",
      ),
    ).toBe("PRODUCT_MISMATCH");
    expect(
      classifyProductIdentity(
        dbWine,
        {
          wineName: "Zestrea Muscat Ottonel Demisec",
          vintage: null,
          bottleSizeMl: 1500,
        },
        "SOURCE_NAME_EXACT",
      ),
    ).toBe("PRODUCT_MISMATCH");
  });
});
