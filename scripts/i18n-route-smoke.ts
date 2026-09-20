const baseUrl = process.env.I18N_SMOKE_BASE_URL ?? "http://localhost:3000";

const englishRoutes = [
  "/en",
  "/en/wines",
  "/en/wineries",
  "/en/top-wines/wines-under-50-ron",
  "/en/wine-for/sarmale",
  "/en/grape-varieties",
  "/en/grape-varieties/feteasca-neagra",
  "/en/grape-varieties/sarba",
  "/en/regions",
  "/en/regions/dealu-mare",
  "/en/studies/cele-mai-bune-vinuri-sub-50-lei-2026",
  "/en/journal",
  "/en/ai-sommelier",
  "/en/search",
  "/en/how-scores-work",
  "/en/add-wine",
  "/en/claim-your-winery",
  "/en/privacy-policy",
  "/en/cookie-policy",
  "/en/wines/cramele-recas-solo-quinta-roze-2025",
  "/en/wineries/avincis",
] as const;

const romanianVisibleLeaks = [
  "Navigatie principala",
  "Cautare catalog",
  "Vinuri romanesti",
  "Vezi crama",
  "Pret:",
  "Incearca din nou",
  "Politica de confidentialitate",
] as const;

function visibleText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;|&#x27;|&amp;|&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function assertEnglishRoute(path: string): Promise<void> {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  if (response.status !== 200) {
    throw new Error(`${path}: expected 200, received ${response.status}`);
  }
  const html = await response.text();
  if (!/<html[^>]+lang="en"/i.test(html)) {
    throw new Error(`${path}: missing html lang=en`);
  }
  if (
    process.env.ENGLISH_INDEXING_ENABLED !== "true" &&
    response.headers.get("x-robots-tag") !== "noindex, follow"
  ) {
    throw new Error(`${path}: missing fail-closed X-Robots-Tag`);
  }
  const text = visibleText(html);
  const leak = romanianVisibleLeaks.find((candidate) =>
    text.toLocaleLowerCase("ro").includes(candidate.toLocaleLowerCase("ro")),
  );
  if (leak) throw new Error(`${path}: visible Romanian leak "${leak}"`);
}

async function assertRomanianDefault(): Promise<void> {
  const response = await fetch(baseUrl, {
    redirect: "manual",
    headers: { "Accept-Language": "en-US,en;q=0.9" },
  });
  if (response.status !== 200) {
    throw new Error(`/: expected 200, received ${response.status}`);
  }
  const html = await response.text();
  if (!/<html[^>]+lang="ro"/i.test(html)) {
    throw new Error("/: browser language changed the default locale");
  }
}

async function assertAliases(): Promise<void> {
  const aliases = [
    "/vinuri/example",
    "/crame/example",
    "/perechi/sarmale",
    "/jurnal-vin",
  ];
  for (const path of aliases) {
    const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
    if (response.status !== 308) {
      throw new Error(`${path}: expected permanent 308 redirect`);
    }
  }
}

async function main(): Promise<void> {
  await assertRomanianDefault();
  for (const route of englishRoutes) await assertEnglishRoute(route);
  await assertAliases();
  console.log(
    `Localized route smoke passed for ${englishRoutes.length} English routes.`,
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

