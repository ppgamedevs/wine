import type { MetadataRoute } from "next";

export const SITEMAP_FAMILY_ORDER = [
  "static",
  "wines",
  "wineries",
  "topLists",
  "regions",
  "soiuri",
  "vinPentru",
  "studii",
  "journal",
] as const;

export type SitemapFamilyName = (typeof SITEMAP_FAMILY_ORDER)[number];
export type SitemapRouteFamilies = Record<
  SitemapFamilyName,
  MetadataRoute.Sitemap
>;

export type SitemapFamilyPresence =
  | "EXPECTED_NONEMPTY_AND_PRESENT"
  | "EXPECTED_EMPTY"
  | "UNEXPECTEDLY_EMPTY";

export type SitemapFamilyExpectation =
  | { expected: "nonempty"; count?: number }
  | { expected: "empty" };

export type SitemapFamilyExpectations = Partial<
  Record<SitemapFamilyName, SitemapFamilyExpectation>
>;

export function validateSitemapFamilyExpectations(
  families: SitemapRouteFamilies,
  expectations: SitemapFamilyExpectations,
): Record<SitemapFamilyName, SitemapFamilyPresence> {
  return Object.fromEntries(
    SITEMAP_FAMILY_ORDER.map((familyName) => {
      const expectation = expectations[familyName];
      const actualCount = families[familyName].length;

      if (!expectation) {
        return [
          familyName,
          actualCount > 0
            ? "EXPECTED_NONEMPTY_AND_PRESENT"
            : "EXPECTED_EMPTY",
        ];
      }
      if (expectation.expected === "empty") {
        if (actualCount !== 0) {
          throw new Error(
            `Sitemap ${familyName} expected empty but has ${actualCount} routes.`,
          );
        }
        return [familyName, "EXPECTED_EMPTY"];
      }
      if (actualCount === 0) {
        throw new Error(
          `Sitemap ${familyName} is UNEXPECTEDLY_EMPTY; eligible routes were expected.`,
        );
      }
      if (
        expectation.count != null &&
        actualCount !== expectation.count
      ) {
        throw new Error(
          `Sitemap ${familyName} expected ${expectation.count} routes but has ${actualCount}.`,
        );
      }
      return [familyName, "EXPECTED_NONEMPTY_AND_PRESENT"];
    }),
  ) as Record<SitemapFamilyName, SitemapFamilyPresence>;
}

export function validateSitemapRouteFamilies(
  families: SitemapRouteFamilies,
  expectations?: SitemapFamilyExpectations,
): void {
  if (expectations) {
    validateSitemapFamilyExpectations(families, expectations);
  }
  const seen = new Map<string, SitemapFamilyName>();

  for (const familyName of SITEMAP_FAMILY_ORDER) {
    const entries = families[familyName];
    for (const [index, entry] of entries.entries()) {
      if (!entry.url?.trim()) {
        throw new Error(
          `Sitemap ${familyName}[${index}] has an empty URL.`,
        );
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(entry.url);
      } catch {
        throw new Error(
          `Sitemap ${familyName}[${index}] has an invalid URL: ${entry.url}`,
        );
      }
      if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        throw new Error(
          `Sitemap ${familyName}[${index}] has an unsupported URL protocol: ${entry.url}`,
        );
      }

      const previousFamily = seen.get(entry.url);
      if (previousFamily) {
        throw new Error(
          `Sitemap duplicate URL in ${previousFamily} and ${familyName}: ${entry.url}`,
        );
      }
      seen.set(entry.url, familyName);

      if (entry.lastModified != null) {
        const date =
          entry.lastModified instanceof Date
            ? entry.lastModified
            : new Date(entry.lastModified);
        if (Number.isNaN(date.getTime())) {
          throw new Error(
            `Sitemap ${familyName}[${index}] has invalid lastModified for ${entry.url}.`,
          );
        }
      }
    }
  }
}

export function flattenSitemapRouteFamilies(
  families: SitemapRouteFamilies,
  expectations?: SitemapFamilyExpectations,
): MetadataRoute.Sitemap {
  validateSitemapRouteFamilies(families, expectations);
  return SITEMAP_FAMILY_ORDER.flatMap((familyName) => families[familyName]);
}

export function countSitemapRouteFamilies(
  families: SitemapRouteFamilies,
): Record<SitemapFamilyName | "total", number> {
  const counts = Object.fromEntries(
    SITEMAP_FAMILY_ORDER.map((familyName) => [
      familyName,
      families[familyName].length,
    ]),
  ) as Record<SitemapFamilyName, number>;

  return {
    ...counts,
    total: SITEMAP_FAMILY_ORDER.reduce(
      (total, familyName) => total + counts[familyName],
      0,
    ),
  };
}
