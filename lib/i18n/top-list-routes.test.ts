import { describe, expect, it } from "vitest";
import {
  buildLocalizedTopListRoutes,
  buildTopListDefinitions,
  getLocalizedResolvableTopListRoutes,
  mapEnglishTopListSlugToRomanian,
  mapResolvableRomanianTopListSlugsToEnglish,
  mapRomanianTopListSlugToEnglish,
  resolveLocalizedTopListRoute,
  resolveTopListDefinition,
  resolveTopListDefinitionById,
  resolveTopListDefinitionFromEitherLocale,
  topListSlugForLocale,
} from "@/lib/i18n/top-list-routes";
import {
  buildAllTopListSlugCandidates,
  getResolvableTopListSlugs,
  resolveTopList,
} from "@/lib/top-lists";
import type { WineType, WineWithRelations } from "@/types";

const GRAPE_SLUGS = [
  "feteasca-neagra",
  "feteasca-regala",
  "tamaioasa-romaneasca",
  "negru-de-dragasani",
  "babeasca-neagra",
  "busuioaca-de-bohotin",
  "grasa-de-cotnari",
] as const;

const WINE_TYPES: readonly WineType[] = [
  "red",
  "white",
  "rose",
  "sparkling",
  "dessert",
  "orange",
];

function wine(id: number, type: WineType): WineWithRelations {
  const fixture = {
    id,
    wineryId: id,
    name: `Wine ${id}`,
    slug: `wine-${id}`,
    type,
    sweetness: type === "dessert" ? "dulce" : "sec",
    status: "verified",
    priceAvg: 25,
    valueScore: 100 - (id % 40),
    giftScore: 90 - (id % 20),
    foodMatchScore: 85 - (id % 10),
    grapeVarieties: GRAPE_SLUGS.map((grapeSlug) => ({
      name: grapeSlug,
      slug: grapeSlug,
    })),
    foodPairings: [
      {
        dish: "Sarmale si gratar",
        category: "sarmale",
        note: "Potrivit pentru masa.",
      },
    ],
    foodPairingNotes: [],
    dessertPairings: [],
    affiliateLinks: [],
    availability: [],
    priceHistory: [],
    recommendedOccasions: [],
    medals: [],
    sourceUrl: `https://emag.ro/wine-${id}`,
    winery: {
      id,
      name: `Winery ${id}`,
      slug: `winery-${id}`,
    },
    region: null,
  };

  return fixture as unknown as WineWithRelations;
}

const wines = WINE_TYPES.flatMap((type, typeIndex) =>
  Array.from({ length: 12 }, (_, index) =>
    wine(typeIndex * 12 + index + 1, type),
  ),
);

describe("top-list canonical locale identity", () => {
  it("generates all 66 current route patterns from category parameters", () => {
    const definitions = buildTopListDefinitions(GRAPE_SLUGS);
    const routes = buildLocalizedTopListRoutes(GRAPE_SLUGS);

    expect(definitions).toHaveLength(66);
    expect(routes).toHaveLength(66);
    expect(new Set(routes.map(({ canonicalId }) => canonicalId)).size).toBe(66);
    expect(new Set(routes.map(({ roSlug }) => roSlug)).size).toBe(66);
    expect(new Set(routes.map(({ enSlug }) => enSlug)).size).toBe(66);
    expect(routes.map(({ roSlug }) => roSlug)).toEqual(
      buildAllTopListSlugCandidates([...GRAPE_SLUGS]),
    );
  });

  it("uses stable IDs and natural deterministic English slugs", () => {
    const examples = [
      ["cele-mai-bune-vinuri-romanesti", "best-romanian-wines"],
      ["vinuri-cadou", "best-wines-for-gifts"],
      ["vinuri-rosii", "best-red-wines"],
      ["vinuri-sub-50-lei", "wines-under-50-ron"],
      [
        "vinuri-sub-50-lei-pentru-cadou-business",
        "wines-under-50-ron-for-business-gifts",
      ],
      ["cele-mai-bune-feteasca-neagra", "best-feteasca-neagra-wines"],
    ] as const;

    for (const [roSlug, enSlug] of examples) {
      const definition = resolveTopListDefinition(roSlug, "ro", GRAPE_SLUGS);
      expect(definition).not.toBeNull();
      expect(mapRomanianTopListSlugToEnglish(roSlug, GRAPE_SLUGS)).toBe(enSlug);
      expect(
        resolveTopListDefinition(enSlug, "en", GRAPE_SLUGS)?.id,
      ).toBe(definition?.id);
    }
  });

  it("round trips every Romanian and English slug through one definition", () => {
    for (const route of buildLocalizedTopListRoutes(GRAPE_SLUGS)) {
      const fromRomanian = resolveTopListDefinition(
        route.roSlug,
        "ro",
        GRAPE_SLUGS,
      );
      const fromEnglish = resolveTopListDefinition(
        route.enSlug,
        "en",
        GRAPE_SLUGS,
      );

      expect(fromRomanian?.id).toBe(route.canonicalId);
      expect(fromEnglish?.id).toBe(route.canonicalId);
      expect(
        resolveTopListDefinitionById(route.canonicalId, GRAPE_SLUGS),
      ).toEqual(route.definition);
      expect(
        resolveTopListDefinitionFromEitherLocale(
          route.roSlug,
          GRAPE_SLUGS,
        )?.id,
      ).toBe(route.canonicalId);
      expect(
        resolveTopListDefinitionFromEitherLocale(
          route.enSlug,
          GRAPE_SLUGS,
        )?.id,
      ).toBe(route.canonicalId);
      expect(
        fromRomanian
          ? topListSlugForLocale(fromRomanian, "en")
          : null,
      ).toBe(route.enSlug);
      expect(
        fromEnglish
          ? topListSlugForLocale(fromEnglish, "ro")
          : null,
      ).toBe(route.roSlug);
    }
  });

  it("maps grape slugs for the client language switcher without a catalog", () => {
    expect(
      mapRomanianTopListSlugToEnglish(
        "cele-mai-bune-feteasca-neagra",
      ),
    ).toBe("best-feteasca-neagra-wines");
    expect(
      mapEnglishTopListSlugToRomanian("best-feteasca-neagra-wines"),
    ).toBe("cele-mai-bune-feteasca-neagra");
  });

  it("does not resolve unregistered budgets, occasions, or grapes", () => {
    expect(
      resolveTopListDefinition("vinuri-sub-40-lei", "ro", GRAPE_SLUGS),
    ).toBeNull();
    expect(
      resolveTopListDefinition(
        "wines-under-50-ron-for-lunch",
        "en",
        GRAPE_SLUGS,
      ),
    ).toBeNull();
    expect(
      resolveTopListDefinition(
        "best-unknown-grape-wines",
        "en",
        GRAPE_SLUGS,
      ),
    ).toBeNull();
  });
});

describe("localized top-list ranking identity", () => {
  it("keeps ranked wine IDs equal for all 66 resolvable route fixtures", () => {
    const roSlugs = getResolvableTopListSlugs(wines, [...GRAPE_SLUGS]);
    expect(roSlugs).toHaveLength(66);

    const localized = getLocalizedResolvableTopListRoutes(
      wines,
      GRAPE_SLUGS,
    );
    expect(localized).toHaveLength(66);

    for (const route of localized) {
      const original = resolveTopList(route.roSlug, wines);
      expect(original).not.toBeNull();
      expect(route.rankedWineIds).toEqual(
        original?.wines.map(({ id }) => id),
      );

      const resolvedFromEnglish = resolveLocalizedTopListRoute(
        route.enSlug,
        "en",
        wines,
        GRAPE_SLUGS,
      );
      expect(resolvedFromEnglish?.canonicalId).toBe(route.canonicalId);
      expect(resolvedFromEnglish?.rankedWineIds).toEqual(route.rankedWineIds);
    }
  });

  it("maps a supplied Romanian resolvable set without reordering it", () => {
    const roSlugs = [
      "vinuri-sub-50-lei",
      "vinuri-rosii",
      "cele-mai-bune-feteasca-neagra",
    ];
    const mapped = mapResolvableRomanianTopListSlugsToEnglish(
      roSlugs,
      wines,
      GRAPE_SLUGS,
    );

    expect(mapped.map(({ roSlug }) => roSlug)).toEqual(roSlugs);
    expect(mapped.map(({ enSlug }) => enSlug)).toEqual([
      "wines-under-50-ron",
      "best-red-wines",
      "best-feteasca-neagra-wines",
    ]);
  });
});
