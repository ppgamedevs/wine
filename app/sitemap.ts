import type { MetadataRoute } from "next";
import {
  getGrapeVarietySlugs,
  getWinerySitemapEntries,
  getWineSitemapEntries,
  getWinesForSommelier,
} from "@/lib/queries";
import { absoluteUrl } from "@/lib/seo";
import { getResolvableTopListSlugs } from "@/lib/top-lists";

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

  const [allWines, grapeSlugs] = await Promise.all([
    getWinesForSommelier(),
    getGrapeVarietySlugs(),
  ]);
  const topListSlugs = getResolvableTopListSlugs(allWines, grapeSlugs);
  const topListRoutes: MetadataRoute.Sitemap = topListSlugs.map((slug) => ({
    url: absoluteUrl(`/topuri/${slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...wineRoutes, ...wineryRoutes, ...topListRoutes];
}
