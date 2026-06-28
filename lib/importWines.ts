import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { db } from "@/lib/db";
import {
  regions,
  wineries,
  wines,
  type AffiliateLink,
  type AvailabilityEntry,
  type GrapeVarietyShare,
} from "@/lib/schema";
import { calculateInitialScores } from "@/lib/scoring";
import { buildWineImageAlt } from "@/lib/wine-images";
import {
  grapeVarietiesFromCsvRow,
  mapWineCsvRowToType,
  wineCsvRowSchema,
  type WineCsvRow,
} from "@/lib/wine-csv-schema";
import type { WineType } from "@/types";

type CsvRow = Record<string, string | undefined>;

interface ParsedWineRow {
  slug: string;
  name: string;
  producer: string;
  producerSlug: string;
  region: string;
  regionSlug: string;
  vintage: number;
  priceAvg: number;
  type: WineType;
  sweetness: "sec" | "demisec" | "demidulce" | "dulce" | null;
  grapeVarieties: GrapeVarietyShare[];
  sourceUrl: string;
  availabilityLabel: string | null;
  tastingNotes: string | null;
  alcohol: number | null;
  sugar: number | null;
  acidity: number | null;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => !a.startsWith("--"));
  const dryRun = args.includes("--dry-run");
  const updateExisting = args.includes("--update");
  const createMissing = args.includes("--create-missing");
  const noScores = args.includes("--no-scores");
  return {
    csvPath: fileArg ?? "./data/wines.csv",
    dryRun,
    updateExisting,
    createMissing,
    noScores,
  };
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseSweetness(
  value: string | undefined,
): "sec" | "demisec" | "demidulce" | "dulce" | null {
  if (!value?.trim()) return null;
  const normalized = value.trim().toLowerCase();
  const allowed = ["sec", "demisec", "demidulce", "dulce"] as const;
  if ((allowed as readonly string[]).includes(normalized)) {
    return normalized as (typeof allowed)[number];
  }
  return null;
}

function parseAvailabilityEntries(
  value: string | undefined,
  sourceUrl: string,
  priceAvg: number,
  producer: string,
): AvailabilityEntry[] {
  const checkedAt = new Date().toISOString();

  if (value?.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is AvailabilityEntry => {
            return (
              typeof item === "object" &&
              item !== null &&
              "retailer" in item &&
              typeof (item as AvailabilityEntry).retailer === "string"
            );
          })
          .map((item) => ({
            ...item,
            lastCheckedAt: item.lastCheckedAt ?? checkedAt,
          }));
      }
    } catch {
      return [
        {
          retailer: value.trim(),
          url: sourceUrl,
          priceRon: priceAvg,
          inStock: true,
          lastCheckedAt: checkedAt,
        },
      ];
    }
  }

  return [
    {
      retailer: producer,
      url: sourceUrl,
      priceRon: priceAvg,
      inStock: true,
      lastCheckedAt: checkedAt,
    },
  ];
}

function buildAffiliateLinks(
  sourceUrl: string,
  producer: string,
  priceAvg: number,
): AffiliateLink[] {
  return [
    {
      retailer: producer,
      url: sourceUrl,
      priceRon: priceAvg,
    },
  ];
}

function mapValidatedRow(row: WineCsvRow): ParsedWineRow {
  const producerSlug = slugify(
    row.producer_slug ?? row.winery_slug ?? row.producer,
  );
  const regionSlug = slugify(row.region_slug ?? row.region);
  const slug =
    row.slug?.trim() ||
    slugify(
      [producerSlug, slugify(row.name), String(row.vintage)]
        .filter(Boolean)
        .join("-"),
    );

  return {
    slug,
    name: row.name,
    producer: row.producer,
    producerSlug,
    region: row.region,
    regionSlug,
    vintage: row.vintage,
    priceAvg: row.price,
    type: mapWineCsvRowToType(row.category),
    sweetness: parseSweetness(row.sweetness ?? row.dulceata),
    grapeVarieties: grapeVarietiesFromCsvRow(row),
    sourceUrl: row.source_url,
    availabilityLabel: row.availability ?? null,
    tastingNotes: row.tasting_notes ?? row.note_degustare ?? null,
    alcohol: row.alcohol ?? row.alcool ?? null,
    sugar: row.sugar ?? row.zahar ?? null,
    acidity: row.acidity ?? row.aciditate ?? null,
  };
}

async function loadLookups() {
  const [regionRows, wineryRows] = await Promise.all([
    db.select().from(regions),
    db.select().from(wineries),
  ]);

  const regionBySlug = new Map(regionRows.map((r) => [r.slug, r]));
  const regionByName = new Map(
    regionRows.map((r) => [r.name.toLowerCase(), r]),
  );
  const wineryBySlug = new Map(wineryRows.map((w) => [w.slug, w]));
  const wineryByName = new Map(
    wineryRows.map((w) => [w.name.toLowerCase(), w]),
  );

  return { regionBySlug, regionByName, wineryBySlug, wineryByName };
}

async function resolveRegionId(
  parsed: ParsedWineRow,
  createMissing: boolean,
  regionBySlug: Map<string, (typeof regions.$inferSelect)>,
  regionByName: Map<string, (typeof regions.$inferSelect)>,
): Promise<number | null> {
  const existing =
    regionBySlug.get(parsed.regionSlug) ??
    regionByName.get(parsed.region.toLowerCase());
  if (existing) return existing.id;

  if (!createMissing) return null;

  const [created] = await db
    .insert(regions)
    .values({
      slug: parsed.regionSlug,
      name: parsed.region,
    })
    .onConflictDoNothing()
    .returning();

  if (created) {
    regionBySlug.set(created.slug, created);
    regionByName.set(created.name.toLowerCase(), created);
    return created.id;
  }

  const fallback = regionBySlug.get(parsed.regionSlug);
  return fallback?.id ?? null;
}

async function resolveWineryId(
  parsed: ParsedWineRow,
  regionId: number | null,
  createMissing: boolean,
  wineryBySlug: Map<string, (typeof wineries.$inferSelect)>,
  wineryByName: Map<string, (typeof wineries.$inferSelect)>,
): Promise<number | null> {
  const existing =
    wineryBySlug.get(parsed.producerSlug) ??
    wineryByName.get(parsed.producer.toLowerCase());
  if (existing) return existing.id;

  if (!createMissing) return null;

  const [created] = await db
    .insert(wineries)
    .values({
      slug: parsed.producerSlug,
      name: parsed.producer,
      regionId,
      website: parsed.sourceUrl,
    })
    .onConflictDoNothing()
    .returning();

  if (created) {
    wineryBySlug.set(created.slug, created);
    wineryByName.set(created.name.toLowerCase(), created);
    return created.id;
  }

  const fallback = wineryBySlug.get(parsed.producerSlug);
  return fallback?.id ?? null;
}

function buildInsertValues(
  parsed: ParsedWineRow,
  wineryId: number,
  regionId: number | null,
  withScores: boolean,
  category: string,
) {
  const availability = parseAvailabilityEntries(
    parsed.availabilityLabel ?? undefined,
    parsed.sourceUrl,
    parsed.priceAvg,
    parsed.producer,
  );
  const affiliateLinks = buildAffiliateLinks(
    parsed.sourceUrl,
    parsed.producer,
    parsed.priceAvg,
  );

  const scores = withScores
    ? calculateInitialScores({
        price: parsed.priceAvg,
        category,
        region: parsed.region,
        grapeVarieties: parsed.grapeVarieties.map((g) => g.name),
      })
    : null;

  return {
    slug: parsed.slug,
    name: parsed.name,
    wineryId,
    regionId,
    type: parsed.type,
    sweetness: parsed.sweetness ?? undefined,
    vintage: parsed.vintage,
    grapeVarieties: parsed.grapeVarieties,
    alcohol: parsed.alcohol ?? undefined,
    sugar: parsed.sugar ?? undefined,
    acidity: parsed.acidity ?? undefined,
    priceAvg: parsed.priceAvg,
    tastingNotes: parsed.tastingNotes ?? undefined,
    availability,
    affiliateLinks,
    imageAlt: buildWineImageAlt({
      name: parsed.name,
      vintage: parsed.vintage,
      type: parsed.type,
      wineryName: parsed.producer,
    }),
    valueScore: scores?.valueScore ?? null,
    giftScore: scores?.giftScore ?? null,
    foodMatchScore: scores?.foodMatchScore ?? null,
    overpricedRisk: scores?.overpricedRisk ?? undefined,
    beginnerFriendly: scores?.beginnerFriendly ?? false,
    cellarPotential: scores?.cellarPotential ?? undefined,
    descriptionEditorial: null,
    valueExplanation: null,
    tasteProfile: null,
  };
}

async function main() {
  const { csvPath, dryRun, updateExisting, createMissing, noScores } =
    parseArgs();
  const absolutePath = path.resolve(csvPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Fisier CSV negasit: ${absolutePath}`);
  }

  const fileContent = fs.readFileSync(absolutePath, "utf-8");
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];

  const lookups = await loadLookups();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  if (dryRun) console.log("[dry-run] Nu se scrie in baza de date.");

  for (const row of records) {
    const validation = wineCsvRowSchema.safeParse(row);

    if (!validation.success) {
      console.warn(
        `Rand invalid sarit: ${row.name ?? "N/A"}`,
        validation.error.issues,
      );
      skipped += 1;
      continue;
    }

    try {
      const parsed = mapValidatedRow(validation.data);
      const regionId = await resolveRegionId(
        parsed,
        createMissing,
        lookups.regionBySlug,
        lookups.regionByName,
      );
      const wineryId = await resolveWineryId(
        parsed,
        regionId,
        createMissing,
        lookups.wineryBySlug,
        lookups.wineryByName,
      );

      if (!wineryId) {
        console.warn(
          `Skip ${parsed.slug}: crama "${parsed.producer}" negasita (foloseste --create-missing)`,
        );
        skipped += 1;
        continue;
      }

      const values = buildInsertValues(
        parsed,
        wineryId,
        regionId,
        !noScores,
        validation.data.category,
      );

      if (dryRun) {
        const scores = !noScores
          ? calculateInitialScores({
              price: parsed.priceAvg,
              category: validation.data.category,
              region: parsed.region,
              grapeVarieties: parsed.grapeVarieties.map((g) => g.name),
            })
          : null;
        console.log(
          `[dry-run] ${parsed.slug} -> ${parsed.name}${
            scores
              ? ` | Value ${scores.valueScore} Gift ${scores.giftScore} Food ${scores.foodMatchScore}`
              : ""
          }`,
        );
        inserted += 1;
        continue;
      }

      if (updateExisting) {
        const result = await db
          .insert(wines)
          .values(values)
          .onConflictDoUpdate({
            target: wines.slug,
            set: {
              name: values.name,
              wineryId: values.wineryId,
              regionId: values.regionId,
              type: values.type,
              sweetness: values.sweetness,
              vintage: values.vintage,
              grapeVarieties: values.grapeVarieties,
              alcohol: values.alcohol,
              sugar: values.sugar,
              acidity: values.acidity,
              priceAvg: values.priceAvg,
              tastingNotes: values.tastingNotes,
              availability: values.availability,
              affiliateLinks: values.affiliateLinks,
              imageAlt: values.imageAlt,
              valueScore: values.valueScore,
              giftScore: values.giftScore,
              foodMatchScore: values.foodMatchScore,
              overpricedRisk: values.overpricedRisk,
              beginnerFriendly: values.beginnerFriendly,
              cellarPotential: values.cellarPotential,
            },
          })
          .returning({ id: wines.id });
        if (result.length > 0) updated += 1;
      } else {
        const result = await db
          .insert(wines)
          .values(values)
          .onConflictDoNothing()
          .returning({ id: wines.id });
        if (result.length > 0) inserted += 1;
        else skipped += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Eroare la importul vinului ${validation.data.name}:`, message);
      skipped += 1;
    }
  }

  console.log(
    `Import finalizat: ${inserted} inserate, ${updated} actualizate, ${skipped} sarite, ${records.length} randuri totale.`,
  );
}

main().catch((error) => {
  console.error("importWines failed:", error);
  process.exit(1);
});
