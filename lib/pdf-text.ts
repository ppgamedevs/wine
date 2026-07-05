const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 VinIntelBot/1.0";

const MAX_PDF_BYTES = 8 * 1024 * 1024;

export async function extractPdfTextFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/pdf,*/*",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(18_000),
    });

    if (!response.ok) return "";

    const lengthHeader = response.headers.get("content-length");
    if (lengthHeader && Number.parseInt(lengthHeader, 10) > MAX_PDF_BYTES) {
      return "";
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_PDF_BYTES) {
      return "";
    }

    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text.replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}
