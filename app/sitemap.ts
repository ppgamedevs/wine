import type { MetadataRoute } from "next";
import {
  getGrapeVarietyCatalogEntries,
  getIndexableRegionSlugs,
  getWinerySitemapEntries,
  getWineSitemapEntries,
  getWinesForSommelier,
} from "@/lib/queries";
import { getIndexableGrapeVarieties } from "@/lib/grape-variety-index";
import {
  getAllDishPairingSlugs,
  getDishPairingPage,
  rankWinesForDish,
} from "@/lib/dish-pairing-pages";
import { getAllJournalArticles } from "@/lib/journal";
import { absoluteUrl } from "@/lib/seo";
import { flattenSitemapRouteFamilies } from "@/lib/sitemap-validation";
import { getResolvableTopListSlugs, MIN_INDEXABLE_TOP_LIST_WINES } from "@/lib/top-lists";

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

  const indexableGrapes = getIndexableGrapeVarieties(
    allWines,
    grapeCatalog,
    MIN_INDEXABLE_TOP_LIST_WINES,
  );
  const soiuriRoutes: MetadataRoute.Sitemap = indexableGrapes.map(
    ({ slug }) => ({
      url: absoluteUrl(`/soiuri/${slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    }),
  );

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

  return flattenSitemapRouteFamilies(families, {
    static: { expected: "nonempty" },
    wines: { expected: "nonempty" },
    wineries: { expected: "nonempty" },
    topLists: { expected: "nonempty" },
    regions: { expected: "nonempty" },
    soiuri:
      indexableGrapes.length > 0
        ? { expected: "nonempty", count: indexableGrapes.length }
        : { expected: "empty" },
    vinPentru: { expected: "nonempty" },
    studii: { expected: "nonempty" },
    journal: { expected: "nonempty" },
  });
}
