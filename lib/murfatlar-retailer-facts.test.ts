import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildRetailerAlcoholClaim,
  retailerFactsMatchVariant,
  type RetailerProductFacts,
} from "@/lib/murfatlar-retailer-facts";
import {
  parseMurfatlarProducerFacts,
  parseMurfatlarProductVariants,
} from "@/lib/murfatlar-producer";
import { isSafeAutomaticClaim, officialExact } from "@/lib/tech-facts/reconcile";

const html = readFileSync(
  join(process.cwd(), "lib", "fixtures", "murfatlar-zestrea.html"),
  "utf8",
);
const variants = parseMurfatlarProductVariants(
  html,
  "https://murfatlar-vinul.ro/zestrea/",
);
const target = variants.find(
  (variant) => variant.name === "Zestrea Muscat Ottonel Demisec",
)!;
const retireeFacts = JSON.parse(
  readFileSync(
    join(
      process.cwd(),
      "lib",
      "fixtures",
      "zestrea-muscat-ottonel-demisec-retailer.json",
    ),
    "utf8",
  ),
) as RetailerProductFacts;

describe("retailer alcohol provenance", () => {
  it("matches the exact target identity", () => {
    expect(retailerFactsMatchVariant(retireeFacts, target)).toBe(true);
    expect(
      retailerFactsMatchVariant(
        { ...retireeFacts, sweetness: "demidulce" },
        target,
      ),
    ).toBe(false);
  });

  it("is evidence only and never a safe producer fact", () => {
    const claim = buildRetailerAlcoholClaim(retireeFacts);
    expect(claim).toMatchObject({
      field: "alcohol",
      value: 12.5,
      sourceType: "retailer",
      extractionMethod: "manual",
    });
    expect(officialExact(claim)).toBe(false);
    expect(isSafeAutomaticClaim(claim, false, false)).toBe(false);
    expect(retireeFacts.producerConfirmedAlcohol).toBe(false);
    const producerFacts = parseMurfatlarProducerFacts(
      html,
      "https://murfatlar-vinul.ro/zestrea/#zestrea-muscat-ottonel-alb-demisec-750ml",
      "Zestrea Muscat Ottonel Demisec",
    );
    expect(producerFacts?.alcohol).toBeNull();
  });
});
