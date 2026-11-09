/**
 * Production route smoke test. Checks HTTP status and soft-404 content, not
 * just 200s. Usage:
 *   npx tsx scripts/smoke-production-routes.ts [baseUrl]
 */
import "../lib/load-env";

const base = (process.argv[2] ?? "https://www.vinintel.ro").replace(/\/$/, "");

const routes = [
  "/",
  "/vinuri",
  "/topuri",
  "/topuri/cele-mai-bune-vinuri-romanesti",
  "/topuri/vinuri-sub-50-lei",
  "/topuri/vinuri-sub-75-lei",
  "/topuri/vinuri-sub-100-lei",
  "/topuri/vinuri-sub-150-lei",
  "/topuri/vinuri-bune-din-supermarket",
  "/topuri/vinuri-sub-50-lei-pentru-sarmale",
  "/topuri/cele-mai-bune-feteasca-neagra",
  "/topuri/vinuri-cadou",
  "/topuri/vinuri-sub-100-lei-pentru-cina-romantica",
  "/soiuri",
  "/regiuni",
  "/crame",
  "/journal",
  "/ai-sommelier",
  "/sitemap.xml",
  "/robots.txt",
  "/en/top-wines",
  "/en/wines",
  "/topuri/vinuri-sub-999-lei",
  "/vin-pentru/inexistent",
];

const expectedNotFound = new Set([
  "/topuri/vinuri-sub-999-lei",
  "/vin-pentru/inexistent",
]);

const soft404Pattern =
  /Pagina negasita|Pagina nu a fost gasita|Page not found|Pagina nu a fost găsită/i;
const loadingPattern = /Se decanteaza continutul/i;

function titleOf(html: string): string {
  return (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function h1Of(html: string): string {
  return (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const failures: string[] = [];
  for (const route of routes) {
    const url = `${base}${route}`;
    let status = 0;
    let html = "";
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": "VinIntel route smoke test" },
      });
      status = response.status;
      html = await response.text();
    } catch (error) {
      failures.push(`${route}\tFETCH_ERROR\t${String(error)}`);
      continue;
    }

    const title = titleOf(html);
    const h1 = h1Of(html);
    const soft404 = soft404Pattern.test(`${title} ${h1}`);
    const loadingShell = loadingPattern.test(html) && !h1;
    const wants404 = expectedNotFound.has(route);
    const expectedContent =
      route !== "/sitemap.xml" &&
      route !== "/robots.txt" &&
      !wants404;
    const missingH1 = expectedContent && !h1;
    const bad = wants404
      ? status !== 404
      : status >= 400 || soft404 || loadingShell || missingH1;
    if (bad) {
      failures.push(
        [route, status, soft404 ? "SOFT_404" : "", loadingShell ? "LOADING_SHELL" : "", missingH1 ? "MISSING_H1" : "", wants404 && status !== 404 ? "EXPECTED_404" : ""]
          .filter(Boolean)
          .join("\t"),
      );
    }
    console.log(
      JSON.stringify({
        route,
        status,
        title: title.slice(0, 80),
        h1: h1.slice(0, 80),
        soft404,
        loadingShell,
        missingH1,
      }),
    );
  }

  if (failures.length > 0) {
    console.error("\nFAILURES:\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log(`\nOK: ${routes.length} routes checked against ${base}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
