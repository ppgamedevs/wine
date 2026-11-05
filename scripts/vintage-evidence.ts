/**
 * Reviewable vintage-evidence ingestion.
 *
 *   npx tsx scripts/vintage-evidence.ts --file=path.json
 *   npx tsx scripts/vintage-evidence.ts --file=path.json --apply --confirm-apply
 *
 * Dry-run is the default. Apply is refused on Vercel/production-like environments.
 */
import "../lib/load-env";
import { readFileSync, writeFileSync } from "node:fs";
import { db } from "@/lib/db";
import { vintageEvidence } from "@/lib/schema";
import { validateVintageEvidence } from "@/lib/vintage/ingest";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const file = arg("file");
  if (!file) throw new Error("--file=<json> is required.");
  const apply = process.argv.includes("--apply");
  if (apply && !process.argv.includes("--confirm-apply")) {
    throw new Error("Refusing to write without --confirm-apply.");
  }
  if (apply && process.env.VERCEL === "1") {
    throw new Error("Refusing to ingest vintage evidence in a production/Vercel environment.");
  }

  const validation = validateVintageEvidence(
    JSON.parse(readFileSync(file, "utf8")),
  );
  const output = {
    file,
    dryRun: !apply,
    valid: validation.valid,
    errors: validation.errors,
    records: validation.evidence.length,
    evidence: validation.evidence,
  };
  if (!validation.valid) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(1);
  }

  if (apply) {
    let inserted = 0;
    for (const item of validation.evidence) {
      const rows = await db
        .insert(vintageEvidence)
        .values({
          scope: item.scope,
          region: item.region,
          appellation: item.appellation,
          grape: item.grape,
          wineryId: item.wineryId,
          wineId: item.wineId,
          familyKey: item.familyKey,
          vintage: item.vintage,
          evidenceType: item.evidenceType,
          impact: item.impact,
          sourceUrl: item.sourceUrl,
          sourceTitle: item.sourceTitle,
          publisher: item.publisher,
          publishedAt: item.publishedAt,
          eventDate: item.eventDate,
          excerpt: item.excerpt,
          confidence: item.confidence,
          producerClaim: item.producerClaim,
          independent: item.independent,
          regionalException: item.regionalException,
          maturity: item.maturity,
        })
        .onConflictDoNothing({
          target: [
            vintageEvidence.sourceUrl,
            vintageEvidence.scope,
            vintageEvidence.evidenceType,
            vintageEvidence.vintage,
          ],
        })
        .returning({ id: vintageEvidence.id });
      inserted += rows.length;
    }
    output.dryRun = false;
    output.records = inserted;
  }

  const out = arg("out");
  if (out) writeFileSync(out, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error("[vintage-evidence]", error);
  process.exit(1);
});
