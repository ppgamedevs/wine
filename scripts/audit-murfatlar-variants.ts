import "../lib/load-env";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../lib/db";
import { parseMurfatlarProductVariants, type MurfatlarWineVariant } from "../lib/murfatlar-producer";
import {
  wineIdentityConflicts,
  type CanonicalWineIdentity,
} from "../lib/wine-identity";

interface DbRow {
  id: number;
  slug: string;
  name: string;
  winery_id: number;
  type: string;
  sweetness: string | null;
  vintage: number | null;
  grape_varieties: string;
  tasting_notes: string | null;
  image_url: string | null;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dbIdentity(row: DbRow): CanonicalWineIdentity {
  const name = normalize(row.name);
  const range = name.includes("zestrea") ? "Zestrea" : "Murfatlar";
  const volume = /\b0\s*75\s*l\b|\b750\s*ml\b/.test(name) ? 750 : null;
  const productName = name
    .replace(/\bzestrea\b/g, " ")
    .replace(/\bmurfatlar\b/g, " ")
    .replace(/\b0\s*75\s*l\b|\b750\s*ml\b/g, " ")
    .replace(/\b(demisec|demidulce|dulce|sec)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const grapes = (() => {
    try {
      const parsed = JSON.parse(row.grape_varieties) as Array<{ name?: string }>;
      return parsed.map((grape) => grape.name ?? "").filter(Boolean);
    } catch {
      return [];
    }
  })();

  return {
    producer: "Murfatlar",
    range,
    productName,
    grapeVarieties: grapes,
    color:
      row.type === "red"
        ? "rosu"
        : row.type === "rose"
          ? "roze"
          : row.type === "white"
            ? "alb"
            : null,
    sweetness: row.sweetness,
    bottleSizeMl: volume,
    vintage: row.vintage,
    sourceProductId: null,
  };
}

function fieldPresence(notes: string | null): Record<string, boolean> {
  const text = normalize(notes ?? "");
  return {
    color: /culoare/.test(text),
    aroma: /miros/.test(text),
    taste: /gust/.test(text),
    servingTemperature: /temperatura de servire/.test(text),
    foodPairing: /asocierea culinara/.test(text),
  };
}

async function main() {
  const html = readFileSync(
    join(process.cwd(), "lib", "fixtures", "murfatlar-zestrea.html"),
    "utf8",
  );
  const variants = parseMurfatlarProductVariants(
    html,
    "https://murfatlar-vinul.ro/zestrea/",
  );
  const rows = (await db.all(
    sql.raw(
      `select id, slug, name, winery_id, type, sweetness, vintage, grape_varieties, tasting_notes, image_url
       from wines
       where name like '%Zestrea%'
       order by id`,
    ),
  )) as DbRow[];

  const rowsWithIdentity = rows.map((row) => ({
    row,
    identity: dbIdentity(row),
    matches: [] as MurfatlarWineVariant[],
  }));

  for (const item of rowsWithIdentity) {
    item.matches = variants.filter(
      (variant) => wineIdentityConflicts(item.identity, variant.identity).length === 0,
    );
  }

  const target = rowsWithIdentity.find((item) => item.row.id === 418);
  const targetVariant = variants.find(
    (variant) => variant.name === "Zestrea Muscat Ottonel Demisec",
  );

  console.log("# Murfatlar Zestrea reconciliation (read-only)");
  console.log("");
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log("");
  console.log("## Summary");
  console.log("");
  console.log(`- Producer variants parsed from the live-page fixture: ${variants.length}`);
  console.log(`- Unique canonical keys: ${new Set(variants.map((variant) => variant.variantKey)).size}`);
  console.log(`- Existing DB rows with Zestrea in the name: ${rows.length}`);
  console.log(
    `- Rows matching exactly one producer variant: ${rowsWithIdentity.filter((item) => item.matches.length === 1).length}`,
  );
  console.log(
    `- Rows with no exact match: ${rowsWithIdentity.filter((item) => item.matches.length === 0).length}`,
  );
  console.log(
    `- Rows with ambiguous matches: ${rowsWithIdentity.filter((item) => item.matches.length > 1).length}`,
  );
  console.log("");
  console.log("## Canonical producer variants");
  console.log("");
  console.log("| key | name | sweetness | grapes | volume | source product id |");
  console.log("|---|---|---|---|---:|---|");
  for (const variant of variants) {
    console.log(
      `| \`${variant.variantKey}\` | ${variant.name} | ${variant.sweetness ?? ""} | ${variant.grapeVarieties
        .map((grape) => grape.name)
        .join(" + ")} | ${variant.volumeMl} | \`${variant.sourceProductId}\` |`,
    );
  }
  console.log("");
  console.log("## Existing rows");
  console.log("");
  console.log("| id | slug | identity match | conflicts | action |");
  console.log("|---:|---|---|---|---|");
  for (const item of rowsWithIdentity) {
    const match = item.matches[0];
    const conflicts = match
      ? []
      : wineIdentityConflicts(
          item.identity,
          targetVariant?.identity ?? variants[0]!.identity,
        );
    console.log(
      `| ${item.row.id} | \`${item.row.slug}\` | ${
        item.matches.length === 1
          ? `\`${match!.variantKey}\``
          : item.matches.length > 1
            ? "AMBIGUOUS"
            : "NONE"
      } | ${conflicts.join(", ") || "—"} | ${
        item.matches.length === 1
          ? "preserve id/slug; add canonical source after review"
          : "manual review; do not merge"
      } |`,
    );
  }
  console.log("");
  console.log("## Target before/after completeness");
  console.log("");
  console.log("| field | before (DB) | after (producer identity) |");
  console.log("|---|---|---|");
  const beforePresence = fieldPresence(target?.row.tasting_notes ?? null);
  console.log(`| type | ${target?.row.type ?? "missing"} | ${targetVariant?.color ?? "missing"} |`);
  console.log(`| sweetness | ${target?.row.sweetness ?? "missing"} | ${targetVariant?.sweetness ?? "missing"} |`);
  console.log(
    `| grape | ${target?.identity.grapeVarieties.join(" + ") ?? "missing"} | ${targetVariant?.grapeVarieties.map((grape) => grape.name).join(" + ") ?? "missing"} |`,
  );
  console.log(
    `| volume | ${target?.identity.bottleSizeMl ?? "implicit/missing"} | ${targetVariant?.volumeMl ?? "missing"} |`,
  );
  console.log(`| DOC | missing | ${targetVariant?.appellation ?? "missing"} |`);
  console.log(
    `| visual description | ${beforePresence.color ? "present" : "missing"} | ${targetVariant?.tastingNotes?.includes("Culoare:") ? "present" : "missing"} |`,
  );
  console.log(
    `| aroma description | ${beforePresence.aroma ? "present" : "missing"} | ${targetVariant?.tastingNotes?.includes("Miros:") ? "present" : "missing"} |`,
  );
  console.log(
    `| taste description | ${beforePresence.taste ? "present" : "missing"} | ${targetVariant?.tastingNotes?.includes("Gust:") ? "present" : "missing"} |`,
  );
  console.log(
    `| serving temperature | ${beforePresence.servingTemperature ? "present" : "missing"} | ${targetVariant?.tastingNotes?.includes("Temperatura de servire: 7-8°C") ? "7–8°C" : "missing"} |`,
  );
  console.log(
    "| alcohol | missing (not present in old schema) | 12.5% retailer-reported only (not producer-confirmed) |",
  );
  console.log(
    `| source product id | missing in old schema | \`${targetVariant?.sourceProductId ?? "missing"}\` |`,
  );
  console.log("");
  console.log("No rows were modified, merged or deleted.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
