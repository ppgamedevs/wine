import { writeFileSync } from "node:fs";
import { fetchPageWithResolution } from "@/lib/fetch-page-html";
import { stripHtml } from "@/lib/fetch-page-text-utils";

async function probe(url: string) {
  const page = await fetchPageWithResolution(url);
  const html = page.html;
  console.log("\n===", url, "===");
  console.log("final:", page.finalUrl, "status ok, len:", html.length);
  console.log("title:", html.match(/<title>([^<]+)/i)?.[1]);

  const detailLinks = [
    ...html.matchAll(/href=["']([^"']*\/catalog\/vinuri\/[^"']+)["']/gi),
  ]
    .map((m) => m[1])
    .filter((link, index, arr) => arr.indexOf(link) === index)
    .slice(0, 8);
  console.log("detail links:", detailLinks);

  if (url.includes("/catalog/vinuri/")) {
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
    console.log("h1:", stripHtml(h1 ?? "").trim());
    console.log("has alcohol:", /Alcool:/i.test(html));
    console.log("has category:", /Categoria:/i.test(html));
    console.log("img sample:", [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].slice(0, 3).map((m) => m[1]));
  }
}

async function analyzeCatalog(html: string) {
  const patterns = ["cadarca", "mustoasa", "Detalii", "data-id", "product", "openModal"];
  for (const pat of patterns) {
    const i = html.toLowerCase().indexOf(pat.toLowerCase());
    console.log(pat, i >= 0 ? `found at ${i}` : "no");
  }

  const urls = [
    ...html.matchAll(/https:\/\/www\.ballageza\.com[^"'\\s<>]+/gi),
  ]
    .map((m) => m[0])
    .filter((u, index, arr) => arr.indexOf(u) === index)
    .slice(0, 40);
  console.log("absolute urls:", urls);

  const relative = [
    ...html.matchAll(/href=["']([^"']*vinuri[^"']*)["']/gi),
  ]
    .map((m) => m[1])
    .filter((u, index, arr) => arr.indexOf(u) === index)
    .slice(0, 20);
  console.log("vinuri hrefs:", relative);
}

async function dumpWineBlocks(html: string) {
  // Wine cards often have "Categoria:" and "An de producție:"
  const blocks = html.split(/(?=<[^>]+class="[^"]*product)/i);
  console.log("product blocks:", blocks.length);

  const detailSections = [
    ...html.matchAll(
      /(?:Mustoasă|Cadarca|Fetească|Merlot|Cabernet|Pinot|Blaufrankisch|Furmint|Chardonnay|Sauvignon|Riesling|Tămâioasă|Rosé|Clarus|Frizzy|Rozzy|Syrah|Distilat)[^<]{0,80}/gi,
    ),
  ].slice(0, 5);
  console.log("name samples:", detailSections.map((m) => m[0]));

  const categoryIdx = html.indexOf("Categoria:");
  if (categoryIdx >= 0) {
    console.log("category context:", html.slice(categoryIdx - 200, categoryIdx + 400));
  }

  const modalMatch = html.match(/data-(?:product|wine|item)[^=]*="[^"]+"/gi);
  console.log("data attrs:", modalMatch?.slice(0, 10));

  const slugMatches = [
    ...html.matchAll(/\/ro\/catalog\/vinuri\/([a-z0-9,-]+)/gi),
  ]
    .map((m) => m[1])
    .filter((s) => !s.startsWith("categoria"))
    .filter((s, i, a) => a.indexOf(s) === i)
    .slice(0, 20);
  console.log("wine slugs:", slugMatches);
}

async function main() {
  const catalog = await fetchPageWithResolution(
    "https://www.ballageza.com/ro/catalog/vinuri",
  );
  console.log("\n=== catalog ===");
  console.log("len:", catalog.html.length);
  await analyzeCatalog(catalog.html);
  await dumpWineBlocks(catalog.html);

  const idx = catalog.html.indexOf("Mustoasă de Măderat 2024");
  if (idx >= 0) {
    writeFileSync(
      "scripts/ballageza-wine-block.html",
      catalog.html.slice(Math.max(0, idx - 1500), idx + 3500),
    );
    console.log("wrote ballageza-wine-block.html at", idx);
  }

  const candidates = [
    "https://www.ballageza.com/ro/catalog/vinuri/cadarca-2023",
    "https://www.ballageza.com/ro/catalog/vinuri/cadarca,2023",
    "https://www.ballageza.com/ro/catalog/vinuri/cadarca-2023-classic",
    "https://www.ballageza.com/ro/catalog/vin/54",
  ];

  for (const url of candidates) {
    try {
      await probe(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log("FAIL", url, message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
