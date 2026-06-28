import "./load-env";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { getTursoConfig, isTursoUrl } from "./env";

const { url, authToken } = getTursoConfig();

const client = createClient({ url, authToken });
const db = drizzle(client);

async function main() {
  if (!isTursoUrl(url)) {
    console.log(`Running migrations against ${url} (local)`);
  } else {
    console.log(`Running migrations against ${url}`);
  }

  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied successfully.");
  client.close();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("already exists") && url === "file:local.db") {
    console.error(
      "\nlocal.db are tabele vechi fara journal Drizzle. Alege una:\n" +
        "  1. Turso (recomandat): pune TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in .env.local\n" +
        "     apoi: vercel env pull .env.local --environment=production\n" +
        "  2. Reset local: sterge local.db si ruleaza din nou npm run db:migrate\n",
    );
  } else if (!isTursoUrl(url)) {
    console.error(
      "\nRulezi pe local.db. Pentru productie Turso, seteaza credentialele in .env.local.\n",
    );
  }

  console.error("Migration failed:", error);
  client.close();
  process.exit(1);
});
