import { fetchPageWithResolution } from "@/lib/fetch-page-html";
import { stripHtml } from "@/lib/fetch-page-text-utils";

const MAX_SOURCE_CHARS = 14_000;

export async function fetchMedalSourcePageText(
  urls: (string | null | undefined)[],
): Promise<{ combinedText: string; fetchedUrls: string[] }> {
  const uniqueUrls = [
    ...new Set(
      urls
        .map((url) => url?.trim())
        .filter((url): url is string => Boolean(url)),
    ),
  ];

  const chunks: string[] = [];
  const fetchedUrls: string[] = [];

  for (const url of uniqueUrls) {
    try {
      const page = await fetchPageWithResolution(url);
      const text = stripHtml(page.html).slice(0, MAX_SOURCE_CHARS);
      if (text.length > 0) {
        chunks.push(`--- ${page.finalUrl} ---\n${text}`);
        fetchedUrls.push(page.finalUrl);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[medal-source] fetch failed ${url}: ${message}`);
    }
  }

  return {
    combinedText: chunks.join("\n\n").slice(0, MAX_SOURCE_CHARS * 2),
    fetchedUrls,
  };
}
