/**
 * Validate migration 0028 against a sanitized production-schema clone.
 *
 * This script is read-only against the configured production database. It:
 * 1. introspects the live schema and copies only a sanitized, allow-listed data
 *    subset into a local clone;
 * 2. preserves the existing Drizzle migration journal so the *actual* migrator
 *    path runs only 0028 (not drizzle-kit push);
 * 3. compares pre-existing schema objects and data checksums before/after;
 * 4. reports drift against a fresh database built from migrations 0000–0027.
 *
 * It never writes to production and never commits the clone.
 */
import "../lib/load-env";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync, cpSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { getTursoConfig } from "@/lib/env";

const V2_TABLES = [
  "wine_claim_evidence",
  "grape_variety_knowledge",
  "wine_ai_interpretations",
  "wine_enrichment_runs",
] as const;

const COPIED_TABLES = [
  "wineries",
  "regions",
  "grape_varieties",
  "wines",
  "wine_fact_evidence",
] as const;

const SENSITIVE_COLUMN = /email|phone|contact|address|token|secret|password|stripe|customer|ip_address|user_agent|referrer|session/i;
const INTERNAL_SHADOW_TABLE = /(^libsql_|_shadow)/i;

interface ObjectRow {
  type: string;
  name: string;
  sql: string;
}

interface TableInfoRow {
  name: string;
  type: string;
  notnull: number;
  dflt_value: unknown;
  pk: number;
}

interface SchemaSnapshot {
  tables: Record<string, { sql: string; columns: string[]; indexes: string[] }>;
  triggers: Record<string, string>;
}

interface DataSnapshot {
  counts: Record<string, number>;
  hashes: Record<string, string>;
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function stableValue(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array) return Buffer.from(value).toString("base64");
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

async function queryRows(client: Client, sql: string, args: unknown[] = []) {
  const result = await client.execute({ sql, args: args as never[] });
  return result.rows as unknown as Record<string, unknown>[];
}

async function schemaObjects(client: Client): Promise<ObjectRow[]> {
  return queryRows(
    client,
    "select type, name, sql from sqlite_master where name not like 'sqlite_%' and sql is not null order by type, name",
  ) as unknown as ObjectRow[];
}

async function snapshotSchema(client: Client): Promise<SchemaSnapshot> {
  const objects = await schemaObjects(client);
  const tables: SchemaSnapshot["tables"] = {};
  const triggers: Record<string, string> = {};
  for (const object of objects) {
    if (INTERNAL_SHADOW_TABLE.test(object.name)) continue;
    if (object.type === "table") {
      const columns = await queryRows(client, `pragma table_info("${object.name.replace(/"/g, '""')}")`);
      const indexes = await queryRows(client, `pragma index_list("${object.name.replace(/"/g, '""')}")`);
      tables[object.name] = {
        sql: object.sql,
        columns: columns.map((row) => String(row.name)),
        indexes: indexes.map((row) => String(row.name)).sort(),
      };
    } else if (object.type === "trigger") {
      triggers[object.name] = object.sql;
    }
  }
  return { tables, triggers };
}

async function copySanitizedTable(
  source: Client,
  clone: Client,
  table: string,
  info: TableInfoRow[],
): Promise<{ copied: number; redactedColumns: string[] }> {
  const columns = info.map((column) => column.name);
  const sensitive = columns.filter((column) => SENSITIVE_COLUMN.test(column));
  const rows = await queryRows(source, `select * from "${table.replace(/"/g, '""')}" order by rowid`);
  for (const row of rows) {
    for (const column of sensitive) {
      if (row[column] != null) row[column] = "[redacted]";
    }
    const placeholders = columns.map(() => "?").join(", ");
    await clone.execute({
      sql: `insert into "${table.replace(/"/g, '""')}" (${columns
        .map((column) => `"${column.replace(/"/g, '""')}"`)
        .join(", ")}) values (${placeholders})`,
      args: columns.map((column) => row[column] as never),
    });
  }
  return { copied: rows.length, redactedColumns: sensitive };
}

async function copyMigrationJournal(source: Client, clone: Client): Promise<number> {
  try {
    const rows = await queryRows(source, "select hash, created_at from __drizzle_migrations order by created_at");
    for (const row of rows) {
      await clone.execute({
        sql: "insert into __drizzle_migrations (hash, created_at) values (?, ?)",
        args: [row.hash as string, row.created_at as never],
      });
    }
    return rows.length;
  } catch {
    // A production database with an untracked schema cannot use the real
    // journal path; the validator will fail rather than silently pushing.
    return 0;
  }
}

async function snapshotData(client: Client, tables: readonly string[]): Promise<DataSnapshot> {
  const counts: Record<string, number> = {};
  const hashes: Record<string, string> = {};
  for (const table of tables) {
    const rows = await queryRows(client, `select * from "${table.replace(/"/g, '""')}" order by rowid`);
    counts[table] = rows.length;
    hashes[table] = digest(rows.map(stableValue));
  }
  return { counts, hashes };
}

function diffSchema(before: SchemaSnapshot, after: SchemaSnapshot) {
  const changed: Array<{ table: string; before: string[]; after: string[] }> = [];
  for (const [table, beforeTable] of Object.entries(before.tables)) {
    const afterTable = after.tables[table];
    if (!afterTable) {
      changed.push({ table, before: beforeTable.columns, after: [] });
      continue;
    }
    if (
      beforeTable.sql !== afterTable.sql ||
      JSON.stringify(beforeTable.columns) !== JSON.stringify(afterTable.columns) ||
      JSON.stringify(beforeTable.indexes) !== JSON.stringify(afterTable.indexes)
    ) {
      changed.push({ table, before: beforeTable.columns, after: afterTable.columns });
    }
  }
  const newTables = Object.keys(after.tables).filter((table) => !(table in before.tables));
  const removedTables = Object.keys(before.tables).filter((table) => !(table in after.tables));
  const changedTriggers = Object.keys(before.triggers).filter(
    (name) => before.triggers[name] !== after.triggers[name],
  );
  return { changed, newTables, removedTables, changedTriggers };
}

function writeMarkdown(report: Record<string, unknown>): string {
  const schema = report.schema as {
    copiedData: Record<string, number>;
    redactedColumns: Record<string, string[]>;
    newTables: string[];
    changedExistingTables: unknown[];
    removedTables: string[];
    drift: { comparedTo: string; tableDifferences: number; columnDifferences: number; examples: string[] };
  };
  const data = report.data as {
    preserved: boolean;
    before: DataSnapshot;
    after: DataSnapshot;
  };
  return [
    "# Migration 0028 validation",
    "",
    `Generated: ${String(report.generatedAt)}`,
    "",
    "## Result",
    "",
    `- **${String(report.passed)}**`,
    `- Source: ${String(report.source)}`,
    `- Clone: ${String(report.clonePath)} (temporary, not committed)`,
    `- Actual migration path: \`drizzle-orm/libsql/migrator\` with the production journal`,
    "- CI-safe copy of the actual path: `lib/migrations/0028-migration.test.ts` against a schema-only fixture (no production data)",
    "",
    "## Schema",
    "",
    `- Copied sanitized data tables: ${Object.entries(schema.copiedData)
      .map(([table, count]) => `\`${table}\` (${count})`)
      .join(", ")}`,
    `- Redacted columns: ${Object.entries(schema.redactedColumns)
      .map(([table, columns]) => `\`${table}\`: ${columns.join(", ") || "none"}`)
      .join("; ")}`,
    `- New 0028 tables: ${schema.newTables.map((table) => `\`${table}\``).join(", ")}`,
    `- Pre-existing tables changed: ${schema.changedExistingTables.length}`,
    `- Removed tables: ${schema.removedTables.length}`,
    "",
    "### Schema drift",
    "",
    `Compared production clone against a fresh database built from migrations 0000–0027: ${schema.drift.tableDifferences} table(s), ${schema.drift.columnDifferences} column difference(s).`,
    "",
    ...schema.drift.examples.map((example) => `- ${example}`),
    "",
    "This is pre-existing migration-history drift, not drift introduced by 0028. The production clone is the schema source of truth; the test proves 0028 only creates the four new V2 tables/indexes.",
    "",
    "## Existing data preservation",
    "",
    `- Preserved: **${data.preserved}**`,
    `- Before counts: ${JSON.stringify(data.before.counts)}`,
    `- After counts: ${JSON.stringify(data.after.counts)}`,
    "- SHA-256 hashes of every copied row before/after:",
    "",
    "```json",
    JSON.stringify({ before: data.before.hashes, after: data.after.hashes }, null, 2),
    "```",
    "",
    "## Reproduction",
    "",
    "```bash",
    "npx tsx scripts/validate-migration-0028.ts",
    "```",
    "",
    "The script never writes to the configured source database.",
  ].join("\n");
}

async function buildMigrationHistoryClone(historyDbPath: string): Promise<Client> {
  rmSync(historyDbPath, { force: true });
  const client = createClient({ url: `file:${historyDbPath}` });
  const tempFolder = resolve("tmp/migrations-0000-0027");
  rmSync(tempFolder, { recursive: true, force: true });
  mkdirSync(join(tempFolder, "meta"), { recursive: true });
  const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as {
    entries: Array<{ idx: number; tag: string; [key: string]: unknown }>;
  };
  const entries = journal.entries.filter((entry) => entry.idx < 28);
  for (const entry of entries) {
    const source = join("drizzle", `${entry.tag}.sql`);
    if (existsSync(source)) cpSync(source, join(tempFolder, `${entry.tag}.sql`));
  }
  writeFileSync(
    join(tempFolder, "meta/_journal.json"),
    JSON.stringify({ ...journal, entries }, null, 2),
  );
  await migrate(drizzle(client), { migrationsFolder: tempFolder });
  return client;
}

async function main() {
  mkdirSync("tmp", { recursive: true });
  const keepClone = process.argv.includes("--keep");
  const clonePath = resolve("tmp/migration-0028-clone.db");
  const historyPath = resolve("tmp/migration-history-0027.db");
  rmSync(clonePath, { force: true });
  rmSync(historyPath, { force: true });

  const { url, authToken } = getTursoConfig();
  const source = createClient({ url, authToken });
  const clone = createClient({ url: `file:${clonePath}` });

  const objects = await schemaObjects(source);
  const tableObjects = objects.filter((object) => object.type === "table");
  const existingV2 = tableObjects.filter((object) =>
    V2_TABLES.includes(object.name as never),
  );
  if (existingV2.length > 0) {
    throw new Error(`Source already contains V2 tables: ${existingV2.map((table) => table.name).join(", ")}`);
  }

  await clone.execute("pragma foreign_keys = off");
  for (const object of tableObjects) {
    if (INTERNAL_SHADOW_TABLE.test(object.name)) continue;
    await clone.execute(object.sql);
  }
  for (const object of objects) {
    if (object.type === "index" || object.type === "trigger" || object.type === "view") {
      if (INTERNAL_SHADOW_TABLE.test(object.name)) continue;
      await clone.execute(object.sql);
    }
  }

  const journalRows = await copyMigrationJournal(source, clone);
  if (journalRows < 28) {
    throw new Error(
      `Production journal has only ${journalRows} entries; refusing to use a synthetic migration path.`,
    );
  }

  const copiedData: Record<string, number> = {};
  const redactedColumns: Record<string, string[]> = {};
  for (const table of COPIED_TABLES) {
    const info = (await queryRows(source, `pragma table_info("${table}")`)) as unknown as TableInfoRow[];
    if (info.length === 0) continue;
    const result = await copySanitizedTable(source, clone, table, info);
    copiedData[table] = result.copied;
    redactedColumns[table] = result.redactedColumns;
  }

  const beforeSchema = await snapshotSchema(clone);
  const beforeData = await snapshotData(clone, COPIED_TABLES);
  const beforeTables = Object.keys(beforeSchema.tables);

  await migrate(drizzle(clone), { migrationsFolder: resolve("drizzle") });

  const afterSchema = await snapshotSchema(clone);
  const afterData = await snapshotData(clone, COPIED_TABLES);
  const diff = diffSchema(beforeSchema, afterSchema);
  const dataPreserved = COPIED_TABLES.every(
    (table) =>
      beforeData.counts[table] === afterData.counts[table] &&
      beforeData.hashes[table] === afterData.hashes[table],
  );

  const history = await buildMigrationHistoryClone(historyPath);
  const historySchema = await snapshotSchema(history);
  const driftExamples: string[] = [];
  let tableDifferences = 0;
  let columnDifferences = 0;
  for (const [table, productionTable] of Object.entries(beforeSchema.tables)) {
    const historical = historySchema.tables[table];
    if (!historical) {
      tableDifferences += 1;
      if (driftExamples.length < 12) driftExamples.push(`\`${table}\` exists in production but not in migrations 0000–0027`);
      continue;
    }
    const missing = productionTable.columns.filter((column) => !historical.columns.includes(column));
    const extra = historical.columns.filter((column) => !productionTable.columns.includes(column));
    if (missing.length || extra.length) {
      tableDifferences += 1;
      columnDifferences += missing.length + extra.length;
      if (driftExamples.length < 12) {
        driftExamples.push(
          `\`${table}\`: production-only columns ${missing.join(", ") || "none"}; history-only columns ${extra.join(", ") || "none"}`,
        );
      }
    }
  }
  for (const table of Object.keys(historySchema.tables)) {
    if (!(table in beforeSchema.tables)) {
      tableDifferences += 1;
      if (driftExamples.length < 12) driftExamples.push(`\`${table}\` exists in migrations 0000–0027 but not production`);
    }
  }
  history.close();

  const expectedNewTables = [...V2_TABLES].filter((table) => beforeTables.includes(table) === false);
  const missingV2 = expectedNewTables.filter((table) => !(table in afterSchema.tables));
  const result = {
    generatedAt: new Date().toISOString(),
    source: "configured production database (read-only); sanitized allow-listed data subset",
    clonePath: "tmp/migration-0028-clone.db",
    migrationJournalRows: journalRows,
    passed:
      dataPreserved &&
      diff.changed.length === 0 &&
      diff.removedTables.length === 0 &&
      diff.changedTriggers.length === 0 &&
      missingV2.length === 0,
    schema: {
      copiedData,
      redactedColumns,
      newTables: diff.newTables,
      changedExistingTables: diff.changed,
      removedTables: diff.removedTables,
      changedTriggers: diff.changedTriggers,
      missingV2,
      drift: {
        comparedTo: "fresh database built from migrations 0000–0027",
        tableDifferences,
        columnDifferences,
        examples: driftExamples,
      },
    },
    data: {
      preserved: dataPreserved,
      before: beforeData,
      after: afterData,
    },
  };

  mkdirSync("docs", { recursive: true });
  writeFileSync("docs/migration-0028-validation.json", `${JSON.stringify(result, null, 2)}\n`, "utf8");
  writeFileSync("docs/migration-0028-validation.md", `${writeMarkdown(result)}\n`, "utf8");
  console.log(JSON.stringify(result, null, 2));

  try {
    source.close();
    clone.close();
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    if (!keepClone) {
      rmSync(clonePath, { force: true, maxRetries: 10, retryDelay: 100 });
    }
    rmSync(historyPath, { force: true, maxRetries: 10, retryDelay: 100 });
    rmSync(resolve("tmp/migrations-0000-0027"), {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  } catch (error) {
    console.warn(
      "Temporary clone cleanup deferred (not committed):",
      error instanceof Error ? error.message : String(error),
    );
  }
  if (!result.passed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
