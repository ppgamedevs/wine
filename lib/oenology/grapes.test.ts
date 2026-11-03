import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAllDishPairingSlugs } from "@/lib/dish-pairing-pages";
import {
  catalogEntryFromGuide,
  getGrapeGuide,
  grapeGuidesForWine,
  GRAPE_GUIDES,
  GRAPE_IMAGE_SEEDS,
  resolveGrapeImage,
} from "@/lib/oenology";
import { filterWinesByGrapeVariety } from "@/lib/grape-variety-index";
import type { WineWithRelations } from "@/types";

const DASHES = /[\u2013\u2014]/;
const REQUIRED_COPY_KEYS = [
  "metaTitle",
  "metaDescription",
  "answer",
  "intro",
  "inTheGlass",
  "origin",
  "inRomania",
  "pairing",
  "howToChoose",
] as const;

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

describe("grape encyclopedia guides", () => {
  it("keeps unique slugs with complete bilingual copy", () => {
    const slugs = GRAPE_GUIDES.map((guide) => guide.slug);
    expect(slugs).toHaveLength(new Set(slugs).size);
    expect(slugs).toHaveLength(25);
    expect(slugs).toContain("sarba");
    expect(slugs).toContain("riesling-italian");

    for (const guide of GRAPE_GUIDES) {
      expect(guide.copy.ro).toBeTruthy();
      expect(guide.copy.en).toBeTruthy();
      for (const locale of ["ro", "en"] as const) {
        const copy = guide.copy[locale];
        expect(copy.name.trim().length).toBeGreaterThan(0);
        for (const key of REQUIRED_COPY_KEYS) {
          expect(copy[key].trim().length).toBeGreaterThan(20);
        }
        expect(copy.facts.length).toBeGreaterThanOrEqual(3);
        expect(copy.faq.length).toBeGreaterThanOrEqual(2);
        expect(copy.metaTitle.length).toBeGreaterThan(20);
        expect(copy.metaDescription.length).toBeGreaterThan(50);
      }
    }
  });

  it("does not use em or en dashes in grape copy", () => {
    for (const text of collectStrings(GRAPE_GUIDES)) {
      expect(text).not.toMatch(DASHES);
    }
  });

  it("only links related grapes and pairing pages that exist", () => {
    const slugs = new Set(GRAPE_GUIDES.map((guide) => guide.slug));
    const dishes = new Set(getAllDishPairingSlugs());

    for (const guide of GRAPE_GUIDES) {
      expect(guide.relatedSlugs).not.toContain(guide.slug);
      for (const related of guide.relatedSlugs) {
        expect(slugs.has(related), `${guide.slug} -> ${related}`).toBe(true);
      }
      expect(guide.pairingDishSlugs.length).toBeGreaterThan(0);
      for (const dish of guide.pairingDishSlugs) {
        expect(dishes.has(dish), `${guide.slug} pairing ${dish}`).toBe(true);
      }
      for (const articleSlug of guide.journalSlugs) {
        expect(
          existsSync(
            path.join(process.cwd(), "content", "journal", `${articleSlug}.md`),
          ),
          articleSlug,
        ).toBe(true);
      }
    }
  });

  it("matches catalog wines through diacritic aliases", () => {
    const guide = getGrapeGuide("sarba");
    expect(guide).toBeDefined();
    if (!guide) return;

    const wines = [
      { grapeVarieties: [{ name: "Șarbă" }] },
      { grapeVarieties: [{ name: "Sarba", slug: "sarba" }] },
      { grapeVarieties: [{ name: "Merlot" }] },
    ] as WineWithRelations[];

    expect(
      filterWinesByGrapeVariety(wines, catalogEntryFromGuide(guide)),
    ).toHaveLength(2);
  });

  it("keeps Riesling Italian distinct from Rhine Riesling", () => {
    expect(
      grapeGuidesForWine({
        grapeVarieties: [{ name: "Riesling Italian" }],
      }).map((guide) => guide.slug),
    ).toEqual(["riesling-italian"]);
    expect(
      grapeGuidesForWine({
        grapeVarieties: [{ name: "Riesling de Rin" }],
      }).map((guide) => guide.slug),
    ).toEqual(["riesling"]);
  });

  it("ships curated local grape images with bilingual alt text", () => {
    const required = [
      "feteasca-neagra",
      "feteasca-alba",
      "feteasca-regala",
      "tamaioasa-romaneasca",
      "grasa-de-cotnari",
      "cramposie-selectionata",
      "negru-de-dragasani",
      "novac",
      "busuioaca-de-bohotin",
      "cadarca",
    ];
    expect(GRAPE_IMAGE_SEEDS.map((seed) => seed.slug)).toEqual(required);

    for (const seed of GRAPE_IMAGE_SEEDS) {
      const guide = getGrapeGuide(seed.slug);
      expect(guide, seed.slug).toBeDefined();
      if (!guide) continue;
      expect(guide.imageUrl).toBe(`/images/grapes/${seed.slug}.webp`);
      expect(guide.imageAlt?.ro?.length ?? 0).toBeGreaterThan(20);
      expect(guide.imageAlt?.en?.length ?? 0).toBeGreaterThan(20);
      expect(guide.imageSource).toContain("VinIntel");

      const file = path.join(
        process.cwd(),
        "public",
        guide.imageUrl!.replace(/^\//, ""),
      );
      expect(existsSync(file), file).toBe(true);
      expect(statSync(file).size).toBeLessThan(80_000);
      const resolved = resolveGrapeImage(guide, "ro");
      expect(resolved.src).toBe(guide.imageUrl);
      expect(resolved.alt).toBe(guide.imageAlt?.ro);
    }
  });

  it("keeps the elegant fallback when an image is absent", () => {
    const withoutImage = getGrapeGuide("sarba");
    expect(withoutImage).toBeDefined();
    const resolved = resolveGrapeImage(withoutImage!, "en");
    expect(resolved.src).toBeNull();
    expect(resolved.alt).toContain("sarba");
    expect(resolved.source).toBeNull();
  });
});
