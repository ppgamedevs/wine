import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  matchMurfatlarVariant,
  matchMurfatlarVariantByHash,
  parseMurfatlarProductPage,
  parseMurfatlarProducerFacts,
  parseMurfatlarProductVariants,
} from "@/lib/murfatlar-producer";
import { wineIdentitiesMatch } from "@/lib/wine-identity";

const fixture = (name: string) =>
  readFileSync(join(process.cwd(), "lib", "fixtures", name), "utf8");

const ZESTREA_URL = "https://murfatlar-vinul.ro/zestrea/";
const html = fixture("murfatlar-zestrea.html");

describe("Murfatlar Zestrea bounded variant parsing", () => {
  const variants = parseMurfatlarProductVariants(html, ZESTREA_URL);
  const demisec = variants.find(
    (variant) => variant.name === "Zestrea Muscat Ottonel Demisec",
  );
  const demidulce = variants.find(
    (variant) => variant.name === "Zestrea Muscat Ottonel Demidulce",
  );

  it("keeps every variant key and source URL unique", () => {
    expect(variants.length).toBeGreaterThanOrEqual(10);
    expect(new Set(variants.map((variant) => variant.variantKey)).size).toBe(
      variants.length,
    );
    expect(new Set(variants.map((variant) => variant.sourceUrl)).size).toBe(
      variants.length,
    );
  });

  it("builds the complete canonical identity for Muscat Ottonel Demisec", () => {
    expect(demisec).toBeTruthy();
    expect(demisec?.variantKey).toBe(
      "zestrea-muscat-ottonel-alb-demisec-750ml",
    );
    expect(demisec?.productLabel).toBe("Muscat Ottonel");
    expect(demisec?.color).toBe("alb");
    expect(demisec?.sweetness).toBe("demisec");
    expect(demisec?.grapeVarieties.map((grape) => grape.name)).toEqual([
      "Muscat Ottonel",
    ]);
    expect(demisec?.volumeMl).toBe(750);
    expect(demisec?.appellation).toBe("DOC - CMD Murfatlar");
    expect(demisec?.identity).toMatchObject({
      producer: "Murfatlar",
      range: "Zestrea",
      productName: "Muscat Ottonel",
      color: "alb",
      sweetness: "demisec",
      bottleSizeMl: 750,
      sourceProductId: "zestrea-muscat-ottonel-alb-demisec-750ml",
    });
  });

  it("uses only the bounded Demisec sensory block", () => {
    expect(demisec?.tastingNotes).toContain("Culoare: galben-verzui");
    expect(demisec?.tastingNotes).toContain("Miros: caracteristic soiului");
    expect(demisec?.tastingNotes).toContain("Temperatura de servire: 7-8°C");
    expect(demisec?.tastingNotes).not.toContain("soc și pere coapte");
    expect(demisec?.tastingNotes).not.toContain("galben pai cu reflexe aurii");
    expect(demisec?.tastingNotes).not.toBe(demidulce?.tastingNotes);
  });

  it("keeps Demidulce aromas on the Demidulce variant", () => {
    expect(demidulce).toBeTruthy();
    expect(demidulce?.sweetness).toBe("demidulce");
    expect(demidulce?.tastingNotes).toContain("soc și pere coapte");
    expect(demidulce?.tastingNotes).not.toContain("caracteristic soiului");
    expect(demidulce?.variantKey).not.toBe(demisec?.variantKey);
  });

  it("matches by grape, sweetness and volume, never by colour alone", () => {
    expect(
      matchMurfatlarVariant(variants, "Zestrea Muscat Ottonel Demisec")
        ?.variantKey,
    ).toBe(demisec?.variantKey);
    expect(
      matchMurfatlarVariant(variants, "Zestrea Muscat Ottonel Demidulce")
        ?.variantKey,
    ).toBe(demidulce?.variantKey);
    expect(matchMurfatlarVariant(variants, "Zestrea Alb")).toBeNull();
    expect(
      matchMurfatlarVariant(variants, "Zestrea Muscat Ottonel Demisec 1.5L"),
    ).toBeNull();
    expect(
      matchMurfatlarVariant(variants, "Zestrea Chardonnay Demisec"),
    ).toBeNull();
  });

  it("never treats a colour as a product identifier", () => {
    expect(matchMurfatlarVariantByHash(variants, "#alb")).toBeNull();
    const oneWhite = variants.filter((variant) => variant.color === "alb").slice(0, 1);
    expect(matchMurfatlarVariantByHash(oneWhite, "#alb")).toBeNull();
    expect(
      parseMurfatlarProductPage(html, `${ZESTREA_URL}#alb`)?.variantKey,
    ).toBeUndefined();
    expect(
      parseMurfatlarProductPage(
        html,
        `${ZESTREA_URL}#zestrea-muscat-ottonel-alb-demisec-750ml`,
      )?.variantKey,
    ).toBe(demisec?.variantKey);
    expect(
      parseMurfatlarProductPage(
        html,
        `${ZESTREA_URL}#alb-muscat-ottonel-demisec`,
        "Zestrea Muscat Ottonel Demisec",
      )?.variantKey,
    ).toBe(demisec?.variantKey);
  });

  it("returns exact producer facts for the target wine", () => {
    const facts = parseMurfatlarProducerFacts(
      html,
      `${ZESTREA_URL}#zestrea-muscat-ottonel-alb-demisec-750ml`,
      "Zestrea Muscat Ottonel Demisec",
    );
    expect(facts).toMatchObject({
      sweetness: "demisec",
      volumeMl: 750,
      appellation: "DOC - CMD Murfatlar",
      color: "alb",
      alcohol: null,
    });
    expect(facts?.grapeVarieties.map((grape) => grape.name)).toEqual([
      "Muscat Ottonel",
    ]);
  });
});

describe("independent retailer identity for the target wine", () => {
  it("matches producer identity and keeps alcohol provenance retailer-only", () => {
    const variants = parseMurfatlarProductVariants(html, ZESTREA_URL);
    const producer = variants.find(
      (variant) => variant.name === "Zestrea Muscat Ottonel Demisec",
    );
    const retailer = JSON.parse(
      fixture("zestrea-muscat-ottonel-demisec-retailer.json"),
    ) as {
      producer: string;
      range: string;
      productName: string;
      grapeVarieties: string[];
      color: "alb" | "roze" | "rosu";
      sweetness: string;
      bottleSizeMl: number;
      vintage: number | null;
      alcoholPercent: number;
      alcoholProvenance: string;
      producerConfirmedAlcohol: boolean;
    };

    expect(
      wineIdentitiesMatch(producer!.identity, {
        producer: retailer.producer,
        range: retailer.range,
        productName: "Muscat Ottonel",
        grapeVarieties: retailer.grapeVarieties,
        color: retailer.color,
        sweetness: retailer.sweetness,
        bottleSizeMl: retailer.bottleSizeMl,
        vintage: retailer.vintage,
        sourceProductId: null,
      }),
    ).toBe(true);
    expect(retailer.alcoholPercent).toBe(12.5);
    expect(retailer.alcoholProvenance).toBe("retailer_specification");
    expect(retailer.producerConfirmedAlcohol).toBe(false);
    expect(producer?.identity.sourceProductId).not.toBe(
      "auchan:vin-alb-demisec-murfatlar-zestrea-muscat-ottonel-0-75-l-sgr",
    );
  });
});
