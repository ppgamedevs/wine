import "server-only";
import { and, ne, type SQL } from "drizzle-orm";
import { wines } from "@/lib/schema";

export const CATALOG_EXCLUDED_STATUS = "rejected" as const;

/** Wines visible in search, sommelier, and public listings. */
export function catalogWineCondition(): SQL {
  return ne(wines.status, CATALOG_EXCLUDED_STATUS);
}

export function andCatalog(
  ...conditions: (SQL | undefined)[]
): SQL | undefined {
  const merged = [catalogWineCondition(), ...conditions.filter(Boolean)] as SQL[];
  return merged.length === 1 ? merged[0] : and(...merged);
}
