import { fetchPageWithResolution } from "@/lib/fetch-page-html";
import {
  extractProducerPageFromHtml,
  mergeProducerPageExtracts,
} from "@/lib/producer-page-extract";
import type { WineMedal, ProducerPageContent } from "@/lib/schema";
import {
  inferBallaGezaProducerPageUrl,
} from "@/lib/ballageza-producer";
import { inferGabaiProducerPageUrl } from "@/lib/gabai-producer";
import { inferMurfatlarProducerPageUrl } from "@/lib/murfatlar-producer";
import {
  inferAvincisProducerPageUrl,
  inferRecasProducerPageUrl,
} from "@/lib/wine-producer-enrichment";

export function resolveProducerPageUrlsForWine(input: {
  name: string;
  slug?: string | null;
  sourceUrl?: string | null;
  producerPageUrl?: string | null;
}): string[] {
  const urls = new Set<string>();

  const add = (url: string | null | undefined) => {
    const trimmed = url?.trim();
    if (trimmed) urls.add(trimmed);
  };

  add(input.producerPageUrl);
  add(input.sourceUrl);

  if (input.sourceUrl?.includes("avincis.ro")) {
    add(input.sourceUrl);
  }
  if (input.sourceUrl?.includes("cramelerecas.ro")) {
    add(input.sourceUrl);
  }
  if (input.sourceUrl?.includes("ballageza.com")) {
    add(input.sourceUrl);
  }
  if (input.sourceUrl?.includes("cramagabai.ro")) {
    add(input.sourceUrl);
  }
  if (input.sourceUrl?.includes("murfatlar-vinul.ro")) {
    add(input.sourceUrl.split("#")[0] ?? input.sourceUrl);
  }

  const slugHint = input.slug?.replace(/^cramelere-recas-|^avincis-|^balla-geza-/, "") ?? "";
  const inferenceContext = [input.sourceUrl, input.name, input.slug, slugHint]
    .filter(Boolean)
    .join(" ");

  add(inferRecasProducerPageUrl(input.name, inferenceContext));
  add(inferAvincisProducerPageUrl(input.name, inferenceContext));
  add(inferBallaGezaProducerPageUrl(input.name, inferenceContext));
  add(inferGabaiProducerPageUrl(input.name, inferenceContext));
  add(inferMurfatlarProducerPageUrl(input.name, inferenceContext));

  return [...urls];
}

export async function fetchAndExtractProducerPages(
  urls: string[],
): Promise<{
  medals: WineMedal[];
  content: ProducerPageContent;
  richText: string;
  fetchedUrls: string[];
}> {
  const extracts = [];
  const fetchedUrls: string[] = [];

  for (const url of urls) {
    try {
      const page = await fetchPageWithResolution(url);
      fetchedUrls.push(page.finalUrl);
      extracts.push(extractProducerPageFromHtml(page.html, page.finalUrl));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[producer-page] fetch failed ${url}: ${message}`);
    }
  }

  const merged = mergeProducerPageExtracts(extracts);
  return { ...merged, fetchedUrls };
}

export async function fetchProducerEnrichmentForWine(input: {
  name: string;
  sourceUrl?: string | null;
  producerPageUrl?: string | null;
}): Promise<{
  medals: WineMedal[];
  content: ProducerPageContent | null;
  producerPageUrl: string | null;
  fetchedUrls: string[];
}> {
  const urls = resolveProducerPageUrlsForWine(input);
  if (urls.length === 0) {
    return {
      medals: [],
      content: null,
      producerPageUrl: input.producerPageUrl?.trim() ?? null,
      fetchedUrls: [],
    };
  }

  const extracted = await fetchAndExtractProducerPages(urls);
  const producerPageUrl =
    extracted.fetchedUrls.find(
      (url) =>
        url.includes("avincis.ro") ||
        url.includes("cramelerecas.ro") ||
        url.includes("ballageza.com"),
    ) ??
    input.producerPageUrl?.trim() ??
    null;

  const hasContent =
    extracted.content.viticulture ||
    extracted.content.tastingNotes ||
    extracted.content.culinaryPairings;

  return {
    medals: extracted.medals,
    content: hasContent ? extracted.content : null,
    producerPageUrl,
    fetchedUrls: extracted.fetchedUrls,
  };
}
