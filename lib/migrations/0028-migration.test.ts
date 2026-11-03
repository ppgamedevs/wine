import { mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const tempRoot = resolve("tmp/migration-0028-test");
const dbPath = join(tempRoot, "clone.db");
const migrationFolder = join(tempRoot, "migrations");

const V2_TABLES = [
  "grape_variety_knowledge",
  "wine_ai_interpretations",
  "wine_claim_evidence",
  "wine_enrichment_runs",
];

afterEach(() => {
  try {
    rmSync(tempRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  } catch {
    // Windows may keep the libsql file handle briefly; the fixture is under tmp/
    // and never committed, so cleanup failure must not mask the assertions.
  }
});

describe("migration 0028 actual migrator path", () => {
  it("applies the real 0028 SQL to a sanitized production-schema fixture and preserves existing rows", async () => {
    mkdirSync(join(migrationFolder, "meta"), { recursive: true });
    copyFileSync(
      resolve("drizzle/0028_wine_intelligence_v2.sql"),
      join(migrationFolder, "0028_wine_intelligence_v2.sql"),
    );
    writeFileSync(
      join(migrationFolder, "meta/_journal.json"),
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

    rmSync(dbPath, { force: true, maxRetries: 5, retryDelay: 50 });
    const client = createClient({ url: `file:${dbPath}` });
    await client.execute("pragma foreign_keys = off");
    await client.executeMultiple(
      readFileSync(resolve("tests/fixtures/pre-0028-schema.sql"), "utf8"),
    );
    await client.execute({
      sql: "insert into regions (id, slug, name) values (?, ?, ?)",
      args: [9999, "sentinel-region", "Sentinel Region"],
    });
    const before = await client.execute(
      "select count(*) as n from regions where id = 9999",
    );
    expect(Number(before.rows[0]?.n)).toBe(1);

    await migrate(drizzle(client), { migrationsFolder: migrationFolder });

    const tables = await client.execute(
      "select name from sqlite_master where type='table'",
    );
    const names = new Set(tables.rows.map((row) => String(row.name)));
    for (const table of V2_TABLES) expect(names.has(table), table).toBe(true);

    const after = await client.execute(
      "select name from regions where id = 9999",
    );
    expect(after.rows[0]?.name).toBe("Sentinel Region");
    const claims = await client.execute("select count(*) as n from wine_claim_evidence");
    expect(Number(claims.rows[0]?.n)).toBe(0);

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    client.close();
  });
});
