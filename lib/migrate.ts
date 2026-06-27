import "./load-env";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

// Falls back to a local SQLite file when Turso env vars are not set, matching
// lib/db.ts. Set TURSO_DATABASE_URL to run against the production database.
const url = process.env.TURSO_DATABASE_URL ?? "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });
const db = drizzle(client);

async function main() {
  console.log("Running migrations against", url);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied successfully.");
  client.close();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  client.close();
  process.exit(1);
});
