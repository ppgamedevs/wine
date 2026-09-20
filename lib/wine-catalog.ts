import "server-only";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { wineries, wines } from "@/lib/schema";

export const CATALOG_VISIBLE_STATUS = "verified" as const;

/** Wines visible in search, sommelier, and public listings. */
export function catalogWineCondition(): SQL {
  return eq(wines.status, CATALOG_VISIBLE_STATUS);
}

/**
 * Wineries with at least one catalog wine. The subquery must use its own
 * table alias. Nested `eq(wines.wineryId, ...)` inside sql`` gets qualified
 * as `wineries.winery_id` in the outer wineries query and crashes SQLite.
 */
export function wineryHasCatalogWinesCondition(): SQL {
  return sql`exists (
    select 1
    from wines as catalog_wines
    where catalog_wines.winery_id = ${wineries.id}
      and catalog_wines.status = ${CATALOG_VISIBLE_STATUS}
  )`;
}

export function andCatalog(
  ...conditions: (SQL | undefined)[]
): SQL | undefined {
  const merged = [catalogWineCondition(), ...conditions.filter(Boolean)] as SQL[];
  return merged.length === 1 ? merged[0] : and(...merged);
}
