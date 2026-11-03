import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { candidateMatchesVariant } from "@/lib/murfatlar-ingest";
import { parseMurfatlarProductVariants } from "@/lib/murfatlar-producer";

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

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    id: 418,
    slug: "murfatlar-zestrea-muscat-ottonel-demisec-0-75l",
    name: "Zestrea Muscat Ottonel Demisec, Murfatlar, 0.75L",
    vintage: null,
    sweetness: "demisec",
    type: "white",
    grapeVarieties: [{ name: "Muscat Ottonel" }],
    ...overrides,
  };
}

describe("Murfatlar idempotent identity matching", () => {
  it("recognises the existing target row without creating a duplicate", () => {
    expect(candidateMatchesVariant(candidate(), target)).toBe(true);
  });

  it("does not match Demidulce, another grape or another volume", () => {
    expect(
      candidateMatchesVariant(candidate({ sweetness: "demidulce" }), target),
    ).toBe(false);
    expect(
      candidateMatchesVariant(
        candidate({ grapeVarieties: [{ name: "Chardonnay" }] }),
        target,
      ),
    ).toBe(false);
    expect(
      candidateMatchesVariant(
        candidate({ name: "Zestrea Muscat Ottonel Demisec 1.5L" }),
        target,
      ),
    ).toBe(false);
  });
});
