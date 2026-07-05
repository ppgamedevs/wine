import { and, eq, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { wines, type WineSubmissionStatus } from "@/lib/schema";
import { buildWineSlug, normalizeSourceUrl } from "@/lib/wine-url";

export interface ExistingWineMatch {
  id: number;
  slug: string;
  status: WineSubmissionStatus;
  matchType: "source_url" | "retailer_product" | "slug" | "identity";
}

interface FindExistingWineInput {
  sourceUrl: string;
  finalUrl: string;
  name: string;
  producer: string;
  vintage: number | null;
  wineryId: number | null;
}

function normalizeIdentityText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bvin\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type IdentityColor = "white" | "rose" | "red";

function extractIdentityColor(name: string, url = ""): IdentityColor | null {
  const hay = normalizeIdentityText(`${name} ${url}`);
  if (
    /\b(alb|white|chardonnay|sauvignon|riesling|feteasca regala|muscat)\b/.test(
      hay,
    )
  ) {
    return "white";
  }
  if (/\b(rose|roze|roz|pinot noir)\b/.test(hay)) {
    return "rose";
  }
  if (/\b(rosu|red|merlot|cabernet|feteasca neagra)\b/.test(hay)) {
    return "red";
  }
  return null;
}

function identityColorsConflict(
  leftName: string,
  leftUrl: string,
  rightName: string,
  rightUrl = "",
): boolean {
  const left = extractIdentityColor(leftName, leftUrl);
  const right = extractIdentityColor(rightName, rightUrl);
  if (left == null || right == null) return false;
  return left !== right;
}

function extractRetailerProductId(url: string): string | null {
  const match = url.match(/\/pd\/([A-Z0-9]+)/i);
  return match?.[1]?.toUpperCase() ?? null;
}

function tokenSimilarity(left: string, right: string): number {
  const tokensLeft = new Set(
    normalizeIdentityText(left)
      .split(" ")
      .filter((token) => token.length > 2),
  );
  const tokensRight = new Set(
    normalizeIdentityText(right)
      .split(" ")
      .filter((token) => token.length > 2),
  );

  if (tokensLeft.size === 0 || tokensRight.size === 0) return 0;

  let overlap = 0;
  for (const token of tokensLeft) {
    if (tokensRight.has(token)) overlap += 1;
  }

  return overlap / Math.max(tokensLeft.size, tokensRight.size);
}

function vintagesCompatible(
  left: number | null | undefined,
  right: number | null | undefined,
): boolean {
  if (left == null || right == null) return true;
  return left === right;
}

async function findByRetailerProductId(
  productId: string,
): Promise<ExistingWineMatch | null> {
  const pattern = `%${productId}%`;
  const row = await db.query.wines.findFirst({
    where: and(
      ne(wines.status, "rejected"),
      or(
        sql`${wines.sourceUrl} LIKE ${pattern}`,
        sql`${wines.availability} LIKE ${pattern}`,
        sql`${wines.affiliateLinks} LIKE ${pattern}`,
      ),
    ),
    columns: { id: true, slug: true, status: true },
  });

  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    matchType: "retailer_product",
  };
}

async function findByIdentity(input: FindExistingWineInput): Promise<ExistingWineMatch | null> {
  if (input.wineryId == null) return null;

  const candidates = await db.query.wines.findMany({
    where: and(eq(wines.wineryId, input.wineryId), ne(wines.status, "rejected")),
    columns: { id: true, slug: true, name: true, vintage: true, status: true },
  });

  let best: ExistingWineMatch | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = tokenSimilarity(input.name, candidate.name);
    if (score < 0.8) continue;
    if (!vintagesCompatible(input.vintage, candidate.vintage)) continue;
    if (
      identityColorsConflict(
        input.name,
        input.finalUrl,
        candidate.name,
      )
    ) {
      continue;
    }

    if (score > bestScore) {
      bestScore = score;
      best = {
        id: candidate.id,
        slug: candidate.slug,
        status: candidate.status,
        matchType: "identity",
      };
    }
  }

  return best;
}

export async function findWineBySourceUrl(
  sourceUrl: string,
): Promise<ExistingWineMatch | null> {
  const normalized = normalizeSourceUrl(sourceUrl);
  const row = await db.query.wines.findFirst({
    where: and(eq(wines.sourceUrl, normalized), ne(wines.status, "rejected")),
    columns: { id: true, slug: true, status: true },
  });

  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    matchType: "source_url",
  };
}

export async function findExistingWine(
  input: FindExistingWineInput,
): Promise<ExistingWineMatch | null> {
  const bySource = await findWineBySourceUrl(input.sourceUrl);
  if (bySource) return bySource;

  const productId = extractRetailerProductId(input.finalUrl);
  if (productId) {
    const byProduct = await findByRetailerProductId(productId);
    if (byProduct) return byProduct;
  }

  const slug = buildWineSlug({
    producer: input.producer,
    name: input.name,
    vintage: input.vintage,
  });
  const bySlug = await db.query.wines.findFirst({
    where: and(eq(wines.slug, slug), ne(wines.status, "rejected")),
    columns: { id: true, slug: true, status: true },
  });
  if (bySlug) {
    return {
      id: bySlug.id,
      slug: bySlug.slug,
      status: bySlug.status,
      matchType: "slug",
    };
  }

  return findByIdentity(input);
}
