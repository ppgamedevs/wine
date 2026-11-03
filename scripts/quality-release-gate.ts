import "../lib/load-env";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadTargetSources, loadTargetWine } from "@/lib/intelligence/fixtures";
import { runWineIntelligence } from "@/lib/intelligence/pipeline";
import { parseMurfatlarProductPage } from "@/lib/murfatlar-producer";
import { buildWineProductJsonLd } from "@/lib/wine-json-ld";
import type { WineStructuredDataInput } from "@/lib/wine-json-ld";
import { runQualityReleaseGate } from "@/lib/quality/release-gate";

async function main() {
  const wine = loadTargetWine();
  const sources = loadTargetSources();
  const producer = sources.find((source) => source.kind === "html")!;
  const variant = parseMurfatlarProductPage(
    producer.body,
    producer.url,
    wine.name,
  );
  const { report } = await runWineIntelligence({
    wine,
    fixtures: sources,
    dryRun: true,
  });
  const jsonLd = JSON.stringify(
    buildWineProductJsonLd({
      slug: wine.slug,
      name: wine.name,
      vintage: wine.vintage,
      tastingNotes: null,
      affiliateLinks: [],
      priceHistory: [],
      ratingAvg: null,
      ratingCount: null,
      imageUrl: null,
      imageSource: null,
      imageAlt: null,
      type: wine.color,
      alcohol: null,
      winery: null,
      region: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as WineStructuredDataInput),
  );
  const messages = (locale: string) =>
    JSON.parse(
      readFileSync(join(process.cwd(), "messages", locale, "wine.json"), "utf8"),
    ) as { buyingDecision?: { unavailable?: string } };

  const gate = runQualityReleaseGate({
    targetVariantKey: variant?.variantKey ?? null,
    expectedVariantKey: "zestrea-muscat-ottonel-alb-demisec-750ml",
    claims: report.claims,
    completeness: report.completeness,
    jsonLd,
    roUnavailableLabel: messages("ro").buyingDecision?.unavailable ?? "",
    enUnavailableLabel: messages("en").buyingDecision?.unavailable ?? "",
    hasQualifiedProfitshareOffer: false,
  });

  for (const check of gate.checks) {
    console.log(`[${check.status}] ${check.id}: ${check.detail}`);
  }
  console.log(`\nRelease gate: ${gate.passed ? "PASS" : "FAIL"}`);
  if (!gate.passed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
