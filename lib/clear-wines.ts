/**
 * Sterge toate vinurile din baza de date (rapoarte, scoruri, rating-uri in cascade).
 *
 *   npm run db:clear-wines
 */
import "./load-env";
import { count } from "drizzle-orm";
import { db } from "./db";
import { wines } from "./schema";

async function main() {
  const before = await db.select({ total: count() }).from(wines);
  const totalBefore = before[0]?.total ?? 0;

  console.log(`[clear-wines] vinuri inainte: ${totalBefore}`);

  if (totalBefore === 0) {
    console.log("[clear-wines] baza este deja goala.");
    return;
  }

  await db.delete(wines);

  const after = await db.select({ total: count() }).from(wines);
  const totalAfter = after[0]?.total ?? 0;

  console.log(`[clear-wines] vinuri dupa: ${totalAfter}`);
  console.log("[clear-wines] gata.");
}

main().catch((error) => {
  console.error("[clear-wines] esuat:", error);
  process.exit(1);
});
