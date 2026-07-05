import "server-only";
import { and, eq, type SQL } from "drizzle-orm";
import { wines } from "@/lib/schema";

export const CATALOG_VISIBLE_STATUS = "verified" as const;

/** Wines visible in search, sommelier, and public listings. */
export function catalogWineCondition(): SQL {
  return eq(wines.status, CATALOG_VISIBLE_STATUS);
}

export function andCatalog(
  ...conditions: (SQL | undefined)[]
): SQL | undefined {
  const merged = [catalogWineCondition(), ...conditions.filter(Boolean)] as SQL[];
  return merged.length === 1 ? merged[0] : and(...merged);
}
