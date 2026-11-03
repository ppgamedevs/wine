import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { generateAndApplyFullEditorial } from "@/lib/wine-enrichment";
import type { MurfatlarWineVariant } from "@/lib/murfatlar-producer";
import { regions, wines, wineries, type GrapeVarietyShare } from "@/lib/schema";
import { findWineBySourceUrl } from "@/lib/wine-duplicate-detection";
import { buildCanonicalWineIdentityKey, type CanonicalWineIdentity } from "@/lib/wine-identity";
import { buildWineImageAlt } from "@/lib/wine-images";
import { buildWineSlug, normalizeSourceUrl } from "@/lib/wine-url";
import {
  retailerFactsMatchVariant,
  storeRetailerAlcoholEvidence,
  type RetailerProductFacts,
} from "@/lib/murfatlar-retailer-facts";

export type MurfatlarIngestStatus =
  | "created"
  | "existing"
  | "review_ambiguous"
  | "review_slug_collision";

export interface MurfatlarIngestResult {
  status: MurfatlarIngestStatus;
  wineId?: number;
  slug?: string;
  canonicalKey: string;
  message?: string;
}

export interface ExistingMurfatlarRow {
  id: number;
  slug: string;
  name: string;
  vintage: number | null;
  sweetness: string | null;
  type: string | null;
  grapeVarieties: GrapeVarietyShare[] | null;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function productLabelFromName(name: string, rangeName: string): string {
  return normalize(name)
    .replace(normalize(rangeName), " ")
    .replace(/\bmurfatlar\b/g, " ")
    .replace(/\b0\s*75\s*l\b|\b750\s*ml\b/g, " ")
    .replace(/\b(demisec|demidulce|dulce|sec)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function existingIdentity(
  row: ExistingMurfatlarRow,
  rangeName: string,
): CanonicalWineIdentity {
  const normalizedName = normalize(row.name);
  const volumeMatch = row.name.match(/(\d+(?:[.,]\d+)?)\s*(ml|l)\b/i);
  const bottleSizeMl = (() => {
    if (!volumeMatch?.[1]) return null;
    const amount = Number.parseFloat(volumeMatch[1].replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return Math.round(
      (volumeMatch[2] ?? "ml").toLowerCase() === "l" ? amount * 1000 : amount,
    );
  })();
  const color =
    row.type === "red" ||
    row.type === "rosu" ||
    normalizedName.includes(" rosu")
      ? "rosu"
      : row.type === "rose" ||
          row.type === "roze" ||
          normalizedName.includes(" roze")
        ? "roze"
        : row.type === "white" ||
            row.type === "alb" ||
            normalizedName.includes(" alb")
          ? "alb"
          : null;

  return {
    producer: "Murfatlar",
    range: rangeName,
    productName: productLabelFromName(row.name, rangeName),
    grapeVarieties: (row.grapeVarieties ?? []).map((grape) => grape.name),
    color,
    sweetness: row.sweetness,
    bottleSizeMl,
    vintage: row.vintage,
    sourceProductId: null,
  };
}

function sameGrapeSet(left: string[], right: string[]): boolean {
  if (left.length === 0 || right.length === 0) return true;
  const normalizeSet = (values: string[]) =>
    [...new Set(values.map(normalize))].sort();
  return normalizeSet(left).join("|") === normalizeSet(right).join("|");
}

export function candidateMatchesVariant(
  candidate: ExistingMurfatlarRow,
  variant: MurfatlarWineVariant,
): boolean {
  const identity = existingIdentity(candidate, variant.rangeName);
  if (!normalize(candidate.name).includes(normalize(variant.rangeName))) {
    return false;
  }
  if (
    identity.sweetness &&
    variant.sweetness &&
    identity.sweetness !== variant.sweetness
  ) {
    return false;
  }
  if (identity.color && variant.color && identity.color !== variant.color) {
    return false;
  }
  if (!sameGrapeSet(identity.grapeVarieties, variant.identity.grapeVarieties)) {
    return false;
  }
  if (
    identity.bottleSizeMl != null &&
    variant.volumeMl != null &&
    identity.bottleSizeMl !== variant.volumeMl
  ) {
    return false;
  }
  if (
    identity.vintage != null &&
    variant.identity.vintage != null &&
    identity.vintage !== variant.identity.vintage
  ) {
    return false;
  }

  const candidateLabel = normalize(identity.productName);
  const expectedLabel = normalize(variant.productLabel);
  if (
    candidateLabel &&
    expectedLabel &&
    !candidateLabel.includes(expectedLabel) &&
    !expectedLabel.includes(candidateLabel)
  ) {
    // Blends may be stored with a different separator/order; grape-set
    // equality above is authoritative for those.
    if (identity.grapeVarieties.length === 0) return false;
  }

  return true;
}

async function findExisting(params: {
  variant: MurfatlarWineVariant;
  wineryId: number;
}): Promise<{ result: MurfatlarIngestResult } | { existing: ExistingMurfatlarRow } | null> {
  const bySource = await findWineBySourceUrl(params.variant.sourceUrl);
  if (bySource) {
    return {
      result: {
        status: "existing",
        wineId: bySource.id,
        slug: bySource.slug,
        canonicalKey: params.variant.variantKey,
      },
    };
  }

  const candidates = (await db.query.wines.findMany({
    where: eq(wines.wineryId, params.wineryId),
    columns: {
      id: true,
      slug: true,
      name: true,
      vintage: true,
      sweetness: true,
      type: true,
      grapeVarieties: true,
    },
  })) as ExistingMurfatlarRow[];

  const matches = candidates.filter((candidate) =>
    candidateMatchesVariant(candidate, params.variant),
  );
  if (matches.length === 1) {
    const match = matches[0]!;
    return {
      result: {
        status: "existing",
        wineId: match.id,
        slug: match.slug,
        canonicalKey: params.variant.variantKey,
      },
    };
  }
  if (matches.length > 1) {
    return {
      result: {
        status: "review_ambiguous",
        canonicalKey: params.variant.variantKey,
        message: `Multiple existing wines match ${params.variant.name}: ${matches
          .map((match) => match.slug)
          .join(", ")}`,
      },
    };
  }
  return null;
}

async function attachRetailerEvidence(
  result: MurfatlarIngestResult,
  variant: MurfatlarWineVariant,
  facts: RetailerProductFacts | undefined,
): Promise<MurfatlarIngestResult> {
  if (!facts || result.wineId == null) return result;
  if (!retailerFactsMatchVariant(facts, variant)) {
    return {
      ...result,
      message: [result.message, "retailer alcohol evidence rejected: identity mismatch"]
        .filter(Boolean)
        .join("; "),
    };
  }
  await storeRetailerAlcoholEvidence(result.wineId, facts);
  return {
    ...result,
    message: [result.message, "retailer alcohol evidence stored (not producer-confirmed)"]
      .filter(Boolean)
      .join("; "),
  };
}

export async function ingestMurfatlarVariant(params: {
  variant: MurfatlarWineVariant;
  generateEditorial?: boolean;
  retailerFacts?: RetailerProductFacts;
}): Promise<MurfatlarIngestResult> {
  const { variant } = params;
  const winery = await db.query.wineries.findFirst({
    where: eq(wineries.name, "Murfatlar"),
    columns: { id: true, name: true },
  });
  if (!winery) {
    throw new Error("Murfatlar winery not found.");
  }

  const existing = await findExisting({ variant, wineryId: winery.id });
  if (existing) {
    const result =
      "result" in existing
        ? existing.result
        : {
            status: "existing" as const,
            wineId: existing.existing.id,
            slug: existing.existing.slug,
            canonicalKey: variant.variantKey,
          };
    return attachRetailerEvidence(result, variant, params.retailerFacts);
  }

  const slug = buildWineSlug({
    producer: winery.name,
    name: variant.name,
    vintage: null,
  });
  const slugCollision = await db.query.wines.findFirst({
    where: eq(wines.slug, slug),
    columns: { id: true, slug: true, name: true },
  });
  if (slugCollision) {
    return {
      status: "review_slug_collision",
      canonicalKey: variant.variantKey,
      message: `Slug ${slug} already belongs to ${slugCollision.name} (#${slugCollision.id})`,
    };
  }

  const region = await db.query.regions.findFirst({
    where: eq(regions.slug, "murfatlar"),
    columns: { id: true },
  });
  const type =
    variant.color === "rosu"
      ? "red"
      : variant.color === "roze"
        ? "rose"
        : variant.color === "alb"
          ? "white"
          : "white";

  const [created] = await db
    .insert(wines)
    .values({
      slug,
      name: variant.name,
      wineryId: winery.id,
      regionId: region?.id ?? null,
      type,
      sweetness: variant.sweetness ?? "sec",
      vintage: variant.identity.vintage,
      grapeVarieties: variant.grapeVarieties,
      tastingNotes: variant.tastingNotes,
      sourceUrl: normalizeSourceUrl(variant.sourceUrl),
      producerPageUrl: normalizeSourceUrl(variant.producerPageUrl),
      submittedBy: "admin-cli:murfatlar-identity",
      submitType: "community",
      status: "verified",
      imageUrl: variant.imageUrl,
      imageSource: variant.imageUrl ? "producer" : null,
      imageAlt: buildWineImageAlt({
        name: variant.name,
        wineryName: winery.name,
        type,
      }),
      availability: [],
      affiliateLinks: [],
      medals: [],
    })
    .returning({ id: wines.id, slug: wines.slug });

  if (!created) {
    throw new Error(`Failed to create ${variant.name}.`);
  }

  if (params.generateEditorial) {
    try {
      await generateAndApplyFullEditorial(created.id);
    } catch (error) {
      // The canonical identity/facts are already stored. Editorial failure
      // must not turn a successful ingestion into a duplicate on re-run.
      const message = error instanceof Error ? error.message : String(error);
      return attachRetailerEvidence(
        {
          status: "created",
          wineId: created.id,
          slug: created.slug,
          canonicalKey: variant.variantKey,
          message: `created without editorial: ${message}`,
        },
        variant,
        params.retailerFacts,
      );
    }
  }

  return attachRetailerEvidence(
    {
      status: "created",
      wineId: created.id,
      slug: created.slug,
      canonicalKey: variant.variantKey,
    },
    variant,
    params.retailerFacts,
  );
}

export function canonicalMurfatlarKey(variant: MurfatlarWineVariant): string {
  return buildCanonicalWineIdentityKey(variant.identity);
}
