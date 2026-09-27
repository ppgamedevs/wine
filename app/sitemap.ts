import type { MetadataRoute } from "next";
import {
  getGrapeVarietyCatalogEntries,
  getIndexableRegionSlugs,
  getWinerySitemapEntries,
  getWineSitemapEntries,
  getWinesForSommelier,
} from "@/lib/queries";
import { getAllGrapeGuideSlugs } from "@/lib/oenology";
import {
  getAllDishPairingSlugs,
  getDishPairingPage,
  rankWinesForDish,
} from "@/lib/dish-pairing-pages";
import { getAllJournalArticles } from "@/lib/journal";
import { absoluteUrl } from "@/lib/seo";
import { flattenSitemapRouteFamilies } from "@/lib/sitemap-validation";
import { getResolvableTopListSlugs, MIN_INDEXABLE_TOP_LIST_WINES } from "@/lib/top-lists";
import { isEnglishIndexingEnabled } from "@/lib/i18n/indexing";
import { mapRomanianTopListSlugToEnglish } from "@/lib/i18n/top-list-routes";

const STATIC_ENGLISH_PATHS: Record<string, string> = {
  "/": "/en",
  "/ai-sommelier": "/en/ai-sommelier",
  "/vinuri": "/en/wines",
  "/topuri": "/en/top-wines",
  "/journal": "/en/journal",
  "/soiuri": "/en/grape-varieties",
  "/regiuni": "/en/regions",
  "/crame": "/en/wineries",
  "/cum-functioneaza-scorurile": "/en/how-scores-work",
  "/claim-your-winery": "/en/claim-your-winery",
  "/adauga-vin": "/en/add-wine",
  "/politica-confidentialitate": "/en/privacy-policy",
  "/politica-cookies": "/en/cookie-policy",
};

export function englishPath(
  pathname: string,
  grapeSlugs: readonly string[],
): string | null {
  const staticPath = STATIC_ENGLISH_PATHS[pathname];
  if (staticPath) return staticPath;
  const mappings = [
    ["/wines/", "/en/wines/"],
    ["/wineries/", "/en/wineries/"],
    ["/journal/", "/en/journal/"],
    ["/regiuni/", "/en/regions/"],
    ["/soiuri/", "/en/grape-varieties/"],
    ["/vin-pentru/", "/en/wine-for/"],
    ["/studii/", "/en/studies/"],
  ] as const;
  for (const [romanianPrefix, englishPrefix] of mappings) {
    if (pathname.startsWith(romanianPrefix)) {
      return `${englishPrefix}${pathname.slice(romanianPrefix.length)}`;
    }
  }
  if (pathname.startsWith("/topuri/")) {
    const romanianSlug = pathname.slice("/topuri/".length);
    const englishSlug = mapRomanianTopListSlugToEnglish(
      romanianSlug,
      grapeSlugs,
    );
    return englishSlug ? `/en/top-wines/${englishSlug}` : null;
  }
  return null;
}

export function addEnglishSitemapEntries(
  romanianEntries: MetadataRoute.Sitemap,
  grapeSlugs: readonly string[],
): MetadataRoute.Sitemap {
  const paired: MetadataRoute.Sitemap = [];
  for (const entry of romanianEntries) {
    const romanianUrl = new URL(entry.url);
    const englishPathname = englishPath(romanianUrl.pathname, grapeSlugs);
    if (!englishPathname) {
      paired.push(entry);
      continue;
    }
    const englishUrl = absoluteUrl(englishPathname);
    const alternates = {
      languages: {
        ro: entry.url,
        en: englishUrl,
        "x-default": entry.url,
      },
    };
    paired.push({ ...entry, alternates });
    paired.push({ ...entry, url: englishUrl, alternates });
  }
  return paired;
}

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/ai-sommelier"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/vinuri"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/topuri"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: absoluteUrl("/journal"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: absoluteUrl("/soiuri"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/regiuni"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/crame"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: absoluteUrl("/cum-functioneaza-scorurile"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/claim-your-winery"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/adauga-vin"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/politica-confidentialitate"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/politica-cookies"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const wineEntries = await getWineSitemapEntries();
  const wineRoutes: MetadataRoute.Sitemap = wineEntries.map((entry) => ({
    url: absoluteUrl(`/wines/${entry.slug}`),
    lastModified: entry.updatedAt ? new Date(entry.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const wineryEntries = await getWinerySitemapEntries();
  const wineryRoutes: MetadataRoute.Sitemap = wineryEntries.map((entry) => ({
    url: absoluteUrl(`/wineries/${entry.slug}`),
    lastModified: entry.updatedAt ? new Date(entry.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const [allWines, grapeCatalog] = await Promise.all([
    getWinesForSommelier(),
    getGrapeVarietyCatalogEntries(),
  ]);
  const grapeSlugs = grapeCatalog.map((grape) => grape.slug);
  const topListSlugs = getResolvableTopListSlugs(allWines, grapeSlugs);
  const topListRoutes: MetadataRoute.Sitemap = topListSlugs.map((slug) => ({
    url: absoluteUrl(`/topuri/${slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const journalArticles = getAllJournalArticles();
  const journalArticleRoutes: MetadataRoute.Sitemap = journalArticles.map(
    (article) => ({
      url: absoluteUrl(`/journal/${article.slug}`),
      lastModified: new Date(article.publishedAt),
      changeFrequency: "monthly",
      priority: 0.65,
    }),
  );

  const regionSlugs = await getIndexableRegionSlugs(MIN_INDEXABLE_TOP_LIST_WINES);
  const regionRoutes: MetadataRoute.Sitemap = regionSlugs.map((slug) => ({
    url: absoluteUrl(`/regiuni/${slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.65,
  }));

  const grapeGuideSlugs = getAllGrapeGuideSlugs();
  const soiuriRoutes: MetadataRoute.Sitemap = grapeGuideSlugs.map((slug) => ({
    url: absoluteUrl(`/soiuri/${slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.65,
  }));

  const vinPentruRoutes: MetadataRoute.Sitemap = getAllDishPairingSlugs()
    .filter((slug) => {
      const config = getDishPairingPage(slug);
      if (!config) return false;
      return rankWinesForDish(allWines, config).length >= MIN_INDEXABLE_TOP_LIST_WINES;
    })
    .map((slug) => ({
      url: absoluteUrl(`/vin-pentru/${slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  const studiiRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/studii/cele-mai-bune-vinuri-sub-50-lei-2026"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  const families = {
    static: staticRoutes,
    wines: wineRoutes,
    wineries: wineryRoutes,
    topLists: topListRoutes,
    regions: regionRoutes,
    soiuri: soiuriRoutes,
    vinPentru: vinPentruRoutes,
    studii: studiiRoutes,
    journal: journalArticleRoutes,
  };

  const romanianSitemap = flattenSitemapRouteFamilies(families, {
    static: { expected: "nonempty" },
    wines: { expected: "nonempty" },
    wineries: { expected: "nonempty" },
    topLists: { expected: "nonempty" },
    regions: { expected: "nonempty" },
    soiuri: { expected: "nonempty", count: grapeGuideSlugs.length },
    vinPentru: { expected: "nonempty" },
    studii: { expected: "nonempty" },
    journal: { expected: "nonempty" },
  });
  return isEnglishIndexingEnabled()
    ? addEnglishSitemapEntries(romanianSitemap, grapeSlugs)
    : romanianSitemap;
}
