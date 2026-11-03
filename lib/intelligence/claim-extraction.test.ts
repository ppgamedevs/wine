import { describe, expect, it } from "vitest";
import { extractClaimsFromDiscoveredSource } from "@/lib/intelligence/claim-extraction";
import type { DiscoveredSource, WineIntelligenceInput } from "@/lib/intelligence/types";
import { loadTargetWine } from "@/lib/intelligence/fixtures";

const wine: WineIntelligenceInput = {
  ...loadTargetWine(),
  producerPageUrl: null,
  sourceUrl: null,
};

function source(
  body: string,
  title: string,
  kind: "html" | "text" | "json" = "html",
  classification: DiscoveredSource["classification"] = "official_producer_page",
): DiscoveredSource {
  return {
    url: `https://source.example/${encodeURIComponent(title)}`,
    title,
    classification,
    discoveredFrom: "test",
    priority: 50,
    availability: "available",
    availabilityReason: null,
    contentKind: kind === "json" ? "json" : kind,
    fixture: {
      url: `https://source.example/${encodeURIComponent(title)}`,
      title,
      kind,
      body,
      observedAt: "2026-11-03T10:00:00.000Z",
      classification,
    },
  };
}

function html(input: {
  name: string;
  sweetness?: string;
  volume?: string;
  grape?: string;
  producer?: string;
  vintage?: number;
}): string {
  return `<html><body>
    <h1>${input.name}</h1>
    <p>${input.producer ?? "Murfatlar"} ${input.grape ?? "Muscat Ottonel"} ${input.sweetness ?? "demisec"} ${input.volume ?? "0.75L"}${input.vintage ? ` recolta ${input.vintage}` : ""}</p>
    <p>Alcool 12.5% vol. Temperatura de servire: 7-8°C.</p>
  </body></html>`;
}

function statuses(claims: ReturnType<typeof extractClaimsFromDiscoveredSource>) {
  return [...new Set(claims.map((claim) => claim.identityMatchStatus))];
}

describe("claim extraction product identity", () => {
  it("publishes claims only after a complete exact product match", () => {
    const claims = extractClaimsFromDiscoveredSource(
      wine,
      source(html({ name: "Zestrea Muscat Ottonel Demisec" }), "Official product"),
    );
    expect(claims.length).toBeGreaterThan(0);
    expect(statuses(claims)).toEqual(["EXACT_WINE_EXACT_VINTAGE"]);
  });

  it("rejects Demisec vs Demidulce and 750 ml vs 1 L", () => {
    const sweetness = extractClaimsFromDiscoveredSource(
      wine,
      source(
        html({ name: "Zestrea Muscat Ottonel Demidulce", sweetness: "demidulce" }),
        "Official product",
      ),
    );
    expect(statuses(sweetness)).toContain("PRODUCT_MISMATCH");

    const volume = extractClaimsFromDiscoveredSource(
      wine,
      source(html({ name: "Zestrea Muscat Ottonel Demisec", volume: "1L" }), "Official product"),
    );
    expect(statuses(volume)).toContain("PRODUCT_MISMATCH");
  });

  it("does not exact-match a different vintage", () => {
    const vintageWine = { ...wine, vintage: 2022 };
    const claims = extractClaimsFromDiscoveredSource(
      vintageWine,
      source(
        html({ name: "Zestrea Muscat Ottonel Demisec", vintage: 2021 }),
        "Official product",
      ),
    );
    expect(statuses(claims)).not.toContain("EXACT_WINE_EXACT_VINTAGE");
    expect(statuses(claims)).toContain("EXACT_WINE_DIFFERENT_VINTAGE");
  });

  it("rejects an unrelated retailer page", () => {
    const claims = extractClaimsFromDiscoveredSource(
      wine,
      source(
        html({ name: "Chardonnay Barrique 2021", grape: "Chardonnay", sweetness: "sec" }),
        "Retailer listing",
        "html",
        "retailer",
      ),
    );
    expect(statuses(claims)).toContain("PRODUCT_MISMATCH");
    expect(statuses(claims)).not.toContain("EXACT_WINE_EXACT_VINTAGE");
  });

  it("never treats a generic producer collection page as the exact wine", () => {
    const claims = extractClaimsFromDiscoveredSource(
      wine,
      source(
        `<html><body><h1>Vinurile Murfatlar</h1><p>Descopera gama noastra de vinuri.</p></body></html>`,
        "Murfatlar collection",
      ),
    );
    expect(statuses(claims)).not.toContain("EXACT_WINE_EXACT_VINTAGE");
    expect(statuses(claims)).not.toContain("EXACT_WINE_UNDATED_SOURCE");
    expect(claims).toEqual([]);
  });

  it("does not invent missing sweetness or volume evidence", () => {
    const claims = extractClaimsFromDiscoveredSource(
      wine,
      source(
        `<html><body><h1>Zestrea Muscat Ottonel Demisec</h1><p>Murfatlar.</p></body></html>`,
        "Incomplete product",
      ),
    );
    expect(statuses(claims)).not.toContain("EXACT_WINE_EXACT_VINTAGE");
    expect(statuses(claims)).not.toContain("EXACT_WINE_UNDATED_SOURCE");
  });

  it("validates structured JSON identity fields before extracting claims", () => {
    const exact = extractClaimsFromDiscoveredSource(
      wine,
      source(
        JSON.stringify({
          displayName: "Zestrea Muscat Ottonel Demisec",
          producer: "Murfatlar",
          grapeVarieties: ["Muscat Ottonel"],
          color: "alb",
          sweetness: "demisec",
          bottleSizeMl: 750,
          vintage: null,
          alcoholPercent: 12.5,
        }),
        "Retailer JSON",
        "json",
        "retailer",
      ),
    );
    expect(statuses(exact)).toEqual(["EXACT_WINE_EXACT_VINTAGE"]);

    const mismatched = extractClaimsFromDiscoveredSource(
      wine,
      source(
        JSON.stringify({
          displayName: "Zestrea Muscat Ottonel Demisec",
          producer: "Murfatlar",
          grapeVarieties: ["Muscat Ottonel"],
          sweetness: "demidulce",
          bottleSizeMl: 1000,
        }),
        "Retailer JSON",
        "json",
        "retailer",
      ),
    );
    expect(statuses(mismatched)).toContain("PRODUCT_MISMATCH");
  });

  it("isolates the matching product from a multi-wine page", () => {
    const body = `<html><body>
      <article><h2>Zestrea Muscat Ottonel Demisec</h2><p>Murfatlar Muscat Ottonel demisec 0.75L. Alcool 12.5% vol.</p></article>
      <article><h2>Zestrea Chardonnay Demisec</h2><p>Murfatlar Chardonnay demisec 0.75L. Alcool 13% vol.</p></article>
    </body></html>`;
    const claims = extractClaimsFromDiscoveredSource(wine, source(body, "Producer catalog"));
    expect(claims.length).toBeGreaterThan(0);
    expect(statuses(claims)).toEqual(["EXACT_WINE_EXACT_VINTAGE"]);
    expect(claims.every((claim) => !claim.excerpt.includes("Chardonnay"))).toBe(true);
  });

  it("fails closed when a multi-wine page cannot be isolated", () => {
    const body = `<html><body>
      <h2>Zestrea Muscat Ottonel Demisec</h2><p>Murfatlar 0.75L demisec.</p>
      <h2>Zestrea Chardonnay Demisec</h2><p>Murfatlar 0.75L demisec.</p>
    </body></html>`;
    expect(extractClaimsFromDiscoveredSource(wine, source(body, "Producer catalog"))).toEqual([]);
  });
});
