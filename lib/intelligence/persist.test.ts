import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "@/lib/schema";
import { wineClaimEvidence, wineEnrichmentRuns } from "@/lib/schema";
import { db } from "@/lib/db";
import { reconcileClaims, buildCompleteness } from "@/lib/intelligence/reconcile";
import {
  persistIntelligenceReport,
  toTechClaim,
} from "@/lib/intelligence/persist";
import { loadTargetSources, loadTargetWine } from "@/lib/intelligence/fixtures";
import { runWineIntelligence } from "@/lib/intelligence/pipeline";
import {
  planStructuredClaims,
} from "@/lib/intelligence/structured-claims-backfill";
import { applyStructuredClaims } from "@/lib/intelligence/structured-claims-persist";
import type {
  IntelligenceReport,
  ReconciledClaim,
  WineClaim,
} from "@/lib/intelligence/types";

const roots: string[] = [];
const clients: Client[] = [];

function setupDatabase() {
  const root = resolve(`tmp/persistence-test-${randomUUID()}`);
  roots.push(root);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(join(root, "migrations/meta"), { recursive: true });
  copyFileSync(
    resolve("drizzle/0028_wine_intelligence_v2.sql"),
    join(root, "migrations/0028_wine_intelligence_v2.sql"),
  );
  writeFileSync(
    join(root, "migrations/meta/_journal.json"),
    JSON.stringify({
      version: "7",
      dialect: "sqlite",
      entries: [
        {
          idx: 0,
          version: "6",
          when: 1788000000000,
          tag: "0028_wine_intelligence_v2",
          breakpoints: true,
        },
      ],
    }),
  );
  const client = createClient({ url: `file:${join(root, "test.db")}` });
  clients.push(client);
  return (async () => {
    await client.execute("pragma foreign_keys = off");
    await client.executeMultiple(
      readFileSync(resolve("tests/fixtures/pre-0028-schema.sql"), "utf8"),
    );
    await migrate(drizzle(client), {
      migrationsFolder: join(root, "migrations"),
    });
    await client.execute({
      sql: "insert into wines (id, slug, name, type) values (?, ?, ?, ?)",
      args: [418, "test-wine", "Test Wine", "white"],
    });
    return drizzle(client, { schema }) as unknown as typeof db;
  })();
}

afterEach(async () => {
  for (const client of clients.splice(0)) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 20));
    client.close();
  }
  for (const root of roots.splice(0)) {
    try {
      rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 20 });
    } catch {
      // Windows may hold the file handle briefly; tmp is not committed.
    }
  }
});

function claim(
  overrides: Partial<WineClaim> & Pick<WineClaim, "field" | "sourceHash" | "claimHash">,
): WineClaim {
  return {
    wineId: 418,
    canonicalIdentityKey: "murfatlar-zestrea",
    identity: {
      producer: "Murfatlar",
      range: "Zestrea",
      productName: "Muscat Ottonel",
      vintage: null,
      bottleSizeMl: 750,
    },
    value: "official",
    normalizedValue: "official",
    unit: null,
    sourceUrl: "https://producer.example/tech",
    sourceTitle: "Official producer",
    sourceClass: "official_producer_page",
    excerpt: "Official evidence",
    observedAt: "2026-11-03T10:00:00.000Z",
    extractionMethod: "deterministic",
    identityMatchStatus: "EXACT_WINE_UNDATED_SOURCE",
    confidence: 0.9,
    ...overrides,
  } as WineClaim;
}

async function reportFor(claims: WineClaim[]): Promise<IntelligenceReport> {
  const base = (
    await runWineIntelligence({
      wine: loadTargetWine(),
      fixtures: loadTargetSources(),
      dryRun: true,
    })
  ).report;
  return {
    ...base,
    dryRun: false,
    claims,
    reconciled: reconcileClaims(claims),
    completeness: buildCompleteness(claims),
    errors: [],
  };
}

describe("general intelligence persistence apply path", () => {
  it("runs the pipeline apply path against the isolated database", async () => {
    const database = await setupDatabase();
    const result = await runWineIntelligence({
      wine: loadTargetWine(),
      fixtures: loadTargetSources(),
      dryRun: false,
      persistReport: (report) =>
        persistIntelligenceReport(report, {
          database,
          suspendTechnicalMirror: true,
        }),
    });
    expect(result.persisted?.claims).toBeGreaterThan(0);
    const rows = await database
      .select({ id: wineClaimEvidence.id })
      .from(wineClaimEvidence)
      .where(eq(wineClaimEvidence.wineId, 418));
    expect(rows.length).toBeGreaterThan(0);
  });

  it("persists per-claim verification, rejects manual/rejected identity and is idempotent", async () => {
    const database = await setupDatabase();
    const official = claim({
      field: "aroma_descriptors",
      sourceHash: "official-source",
      claimHash: "official-claim",
      value: ["soc"],
      normalizedValue: "soc",
    });
    const retailer = claim({
      field: "aroma_descriptors",
      sourceHash: "retailer-source",
      claimHash: "retailer-claim",
      sourceClass: "retailer",
      sourceUrl: "https://retailer.example/tech",
      sourceTitle: "Retailer",
      value: ["soc"],
      normalizedValue: "soc",
    });
    const likely = claim({
      field: "serving_temperature",
      sourceHash: "likely-source",
      claimHash: "likely-claim",
      identityMatchStatus: "LIKELY_WINE",
    });
    const mismatch = claim({
      field: "food_pairing",
      sourceHash: "mismatch-source",
      claimHash: "mismatch-claim",
      identityMatchStatus: "PRODUCT_MISMATCH",
    });

    // Reversed source order relative to the official preferred value.
    const report = await reportFor([retailer, official, likely, mismatch]);
    const first = await persistIntelligenceReport(report, {
      database,
      suspendTechnicalMirror: true,
    });
    expect(first.rejected).toBe(2);
    expect(first.claims).toBe(2);

    const rows = await database
      .select({
        sourceClass: wineClaimEvidence.sourceClass,
        value: wineClaimEvidence.valueJson,
        verification: wineClaimEvidence.verificationStatus,
      })
      .from(wineClaimEvidence)
      .where(eq(wineClaimEvidence.wineId, 418));
    const officialRow = rows.find((row) => row.sourceClass === "official_producer_page");
    const retailerRow = rows.find((row) => row.sourceClass === "retailer");
    expect(officialRow?.verification).toBe("verified_official");
    expect(retailerRow?.verification).toBe("attributed_retailer");

    const run = await database
      .select({ errorJson: wineEnrichmentRuns.errorJson })
      .from(wineEnrichmentRuns)
      .where(eq(wineEnrichmentRuns.wineId, 418));
    const diagnostics = JSON.stringify(run[0]?.errorJson);
    expect(diagnostics).toContain("manual_review_LIKELY_WINE");
    expect(diagnostics).toContain("rejected_PRODUCT_MISMATCH");

    const second = await persistIntelligenceReport(report, {
      database,
      suspendTechnicalMirror: true,
    });
    expect(second.claims).toBe(0);
    expect(second.skipped).toBeGreaterThan(0);
    const after = await database
      .select({ id: wineClaimEvidence.id })
      .from(wineClaimEvidence)
      .where(eq(wineClaimEvidence.wineId, 418));
    expect(after).toHaveLength(2);
  });

  it("does not overwrite a valid claim with a conflicting or lower-trust row", async () => {
    const database = await setupDatabase();
    const original = claim({
      field: "aroma_descriptors",
      sourceHash: "same-source",
      claimHash: "original-claim",
      value: ["soc"],
      normalizedValue: "soc",
      sourceClass: "retailer",
    });
    await persistIntelligenceReport(await reportFor([original]), {
      database,
      suspendTechnicalMirror: true,
    });

    const conflicting = claim({
      field: "aroma_descriptors",
      sourceHash: "same-source",
      claimHash: "conflicting-claim",
      value: ["citrice"],
      normalizedValue: "citrice",
      sourceClass: "official_producer_page",
    });
    const result = await persistIntelligenceReport(await reportFor([conflicting]), {
      database,
      suspendTechnicalMirror: true,
    });
    expect(result.skipped).toBeGreaterThan(0);
    const rows = await database
      .select({
        value: wineClaimEvidence.valueJson,
        verification: wineClaimEvidence.verificationStatus,
      })
      .from(wineClaimEvidence)
      .where(eq(wineClaimEvidence.wineId, 418));
    expect(rows).toEqual([{ value: ["soc"], verification: "attributed_retailer" }]);
  });

  it("pairs the technical mirror with the selected source, not claims[0]", () => {
    const retailer = claim({
      field: "alcohol",
      sourceHash: "retailer-source",
      claimHash: "retailer-claim",
      sourceClass: "retailer",
      sourceUrl: "https://retailer.example/alcohol",
      sourceTitle: "Retailer alcohol",
      value: 13.5,
      normalizedValue: "13.5",
      excerpt: "Retailer says 13.5",
    });
    const official = claim({
      field: "alcohol",
      sourceHash: "official-source",
      claimHash: "official-claim",
      sourceClass: "official_producer_page",
      sourceUrl: "https://producer.example/alcohol",
      sourceTitle: "Producer alcohol",
      value: 12.5,
      normalizedValue: "12.5",
      excerpt: "Producer says 12.5",
    });
    const reconciled: ReconciledClaim = {
      field: "alcohol",
      value: 12.5,
      normalizedValue: "12.5",
      unit: "% vol",
      verificationStatus: "verified_official",
      confidence: 0.9,
      sourceClass: "official_producer_page",
      sourceUrl: official.sourceUrl,
      claims: [retailer, official],
      conflict: null,
      selectedClaim: official,
    };
    const tech = toTechClaim(reconciled);
    expect(tech).toMatchObject({
      value: 12.5,
      sourceUrl: "https://producer.example/alcohol",
      excerpt: "Producer says 12.5",
      sourceType: "producer_page",
    });
  });
});

describe("structured backfill apply path", () => {
  it("inserts the planned claims then writes zero on a repeated apply", async () => {
    const database = await setupDatabase();
    const base = (
      await runWineIntelligence({
        wine: loadTargetWine(),
        fixtures: loadTargetSources(),
        dryRun: true,
      })
    ).report;
    const plan = planStructuredClaims({ report: base, existing: [] });
    expect(plan.writes.length).toBeGreaterThan(0);
    const first = await applyStructuredClaims(plan, database);
    expect(first.inserted).toBe(plan.writes.length);
    const second = await applyStructuredClaims(plan, database);
    expect(second.inserted).toBe(0);
    const rows = await database
      .select({ id: wineClaimEvidence.id })
      .from(wineClaimEvidence)
      .where(eq(wineClaimEvidence.wineId, 418));
    expect(rows).toHaveLength(plan.writes.length);
  });
});
