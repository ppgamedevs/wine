import { fetchPageHtml } from "@/lib/fetch-page-html";
import { stripHtml } from "@/lib/fetch-page-text-utils";

const MAX_PAGE_CHARS = 14_000;

export { stripHtml } from "@/lib/fetch-page-text-utils";

export async function fetchPageText(url: string): Promise<string> {
  const html = await fetchPageHtml(url);
  return stripHtml(html).slice(0, MAX_PAGE_CHARS);
}
