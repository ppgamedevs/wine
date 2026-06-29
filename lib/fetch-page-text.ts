const MAX_PAGE_CHARS = 14_000;

export async function fetchPageText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "VinIntelBot/1.0 (+https://vinintel.ro; community wine analysis)",
    },
    signal: AbortSignal.timeout(18_000),
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Pagina nu a putut fi accesata (${response.status}).`);
  }

  const html = await response.text();
  return stripHtml(html).slice(0, MAX_PAGE_CHARS);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
