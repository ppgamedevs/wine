/**
 * Reconciliaza un vin cu datele de pe site-ul producatorului (sursa de adevar).
 *
 *   npx tsx lib/reconcile-wine-producer.ts <wineId|slug>
 *   npx tsx lib/reconcile-wine-producer.ts --winery=cramele-recas
 */
import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { generateAndApplyFullEditorial } from "./wine-enrichment";
import { buildWineImageAlt } from "./wine-images";
import {
  enrichWineFromProducerSite,
  inferAvincisProducerPageUrl,
  inferRecasProducerPageUrl,
  parseAvincisProducerFacts,
  parseRecasProducerFacts,
  producerImageSourceFromUrl,
  shouldPreferProducerImageOverEmag,
} from "./wine-producer-enrichment";
import { buildWineSlug } from "./wine-url";
import { wines, wineries } from "./schema";
import { mapCsvCategoryToWineType } from "./wine-csv-schema";

async function reconcileOneWine(wineId: number): Promise<boolean> {
  const wine = await db.query.wines.findFirst({
    where: eq(wines.id, wineId),
    with: { winery: true },
  });

  if (!wine?.winery) {
    console.warn(`[reconcile-producer] wine ${wineId} negasit`);
    return false;
  }

  const retailUrl =
    wine.availability?.[0]?.url ??
    wine.affiliateLinks?.[0]?.url ??
    null;

  const preferredPageUrl = (() => {
    if (wine.sourceUrl?.includes("cramelerecas.ro")) {
      return wine.sourceUrl;
    }
    if (wine.sourceUrl?.includes("avincis.ro")) {
      return wine.sourceUrl;
    }
    const inferredFromRetail = inferRecasProducerPageUrl("", retailUrl);
    if (inferredFromRetail) return inferredFromRetail;
    const inferredAvincis = inferAvincisProducerPageUrl(wine.name, retailUrl);
    if (inferredAvincis) return inferredAvincis;
    const inferred = inferRecasProducerPageUrl(wine.name, retailUrl);
    if (inferred) return inferred;
    if (wine.producerPageUrl?.includes("cramelerecas.ro")) {
      return wine.producerPageUrl;
    }
    if (wine.producerPageUrl?.includes("avincis.ro")) {
      return wine.producerPageUrl;
    }
    return null;
  })();

  const producer = await enrichWineFromProducerSite({
    wineryWebsite: wine.winery.website,
    winerySlug: wine.winery.slug,
    wineName: wine.name,
    preferredPageUrl,
  });

  if (!producer.producerPageUrl) {
    console.warn(
      `[reconcile-producer] ${wine.slug}: pagina producator negasita`,
    );
    return false;
  }

  const c = producer.canonical;
  const displayName = c?.name ?? wine.name;
  const vintage = c?.vintage ?? wine.vintage;
  const grapeVarieties =
    c?.grapeVarieties && c.grapeVarieties.length > 0
      ? c.grapeVarieties
      : c != null
        ? []
        : wine.grapeVarieties;

  const newSlug = buildWineSlug({
    producer: wine.winery.name,
    name: displayName,
    vintage,
  });

  const patch: Record<string, unknown> = {
    name: displayName,
    vintage,
    grapeVarieties,
    producerPageUrl: producer.producerPageUrl,
    tastingSheetUrl: producer.tastingSheetUrl,
    updatedAt: new Date().toISOString(),
  };

  if (c?.sweetness) patch.sweetness = c.sweetness;
  if (c?.alcohol != null) patch.alcohol = c.alcohol;
  if (c?.acidity != null) patch.acidity = c.acidity;

  const producerText = producer.producerText ?? "";
  const isOrangeWine =
    /Apela[^\n]*Vin Orange|Vin Orange Wine|sole-orange|\borange\b/i.test(
      `${producerText} ${displayName} ${producer.producerPageUrl ?? ""}`,
    );
  if (isOrangeWine) {
    patch.type = "orange";
  } else if (c?.color) {
    const mappedType = mapCsvCategoryToWineType(c.color);
    const keepSparkling =
      wine.type === "sparkling" &&
      mappedType === "white" &&
      /spumant|metod[aă]?\s*tradition|extra\s*brut/i.test(wine.name);
    if (mappedType && !keepSparkling) {
      patch.type = mappedType;
    }
  } else if (
    wine.type !== "sparkling" &&
    /spumant|metod[aă]?\s*tradition|extra\s*brut/i.test(displayName)
  ) {
    patch.type = "sparkling";
  }

  if (
    c?.imageUrl &&
    shouldPreferProducerImageOverEmag({
      wineName: displayName,
      wineType: wine.type,
      currentImageUrl: wine.imageUrl,
      currentImageSource: wine.imageSource,
      producerImageUrl: c.imageUrl,
    })
  ) {
    const displayType = (patch.type as typeof wine.type | undefined) ?? wine.type;
    patch.imageUrl = c.imageUrl;
    patch.imageSource = producerImageSourceFromUrl(producer.producerPageUrl);
    patch.imageAlt = buildWineImageAlt({
      name: displayName,
      vintage,
      type: displayType,
      wineryName: wine.winery.name,
    });
  }

  if (newSlug !== wine.slug) {
    const slugTaken = await db.query.wines.findFirst({
      where: eq(wines.slug, newSlug),
      columns: { id: true },
    });
    if ((!slugTaken || slugTaken.id === wine.id) && wine.status !== "verified") {
      patch.slug = newSlug;
    }
  }

  await db.update(wines).set(patch).where(eq(wines.id, wine.id));

  console.log(
    `[reconcile-producer] ${wine.slug} -> ${String(patch.slug ?? wine.slug)} (${producer.producerPageUrl})`,
  );

  await generateAndApplyFullEditorial(wine.id);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const wineryArg = args.find((arg) => arg.startsWith("--winery="));
  const target = args.find((arg) => !arg.startsWith("--"));

  if (wineryArg) {
    const winerySlug = wineryArg.slice("--winery=".length);
    const winery = await db.query.wineries.findFirst({
      where: eq(wineries.slug, winerySlug),
      columns: { id: true, slug: true },
    });
    if (!winery) {
      console.error(`Crama negasita: ${winerySlug}`);
      process.exit(1);
    }

    const rows = await db.query.wines.findMany({
      where: eq(wines.wineryId, winery.id),
      columns: { id: true, slug: true },
    });

    console.log(`[reconcile-producer] ${rows.length} vinuri pentru ${winerySlug}`);
    let ok = 0;
    for (const row of rows) {
      if (await reconcileOneWine(row.id)) ok += 1;
    }
    console.log(`[reconcile-producer] done ${ok}/${rows.length}`);
    return;
  }

  if (!target) {
    console.error(
      "Usage: tsx lib/reconcile-wine-producer.ts <wineId|slug> | --winery=cramele-recas",
    );
    process.exit(1);
  }

  const asId = Number(target);
  if (Number.isInteger(asId) && asId > 0) {
    const ok = await reconcileOneWine(asId);
    process.exit(ok ? 0 : 1);
  }

  const wine = await db.query.wines.findFirst({
    where: eq(wines.slug, target),
    columns: { id: true },
  });
  if (!wine) {
    console.error(`Vin negasit: ${target}`);
    process.exit(1);
  }

  const ok = await reconcileOneWine(wine.id);
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error("[reconcile-producer] fatal:", error);
  process.exit(1);
});
