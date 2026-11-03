/**
 * Canonical product identity used for exact matching across producer pages,
 * retailer pages and stored wines.
 *
 * Color alone is never an identity. A missing field is unknown, not a
 * wildcard when the other side has a value; conflicts are explicit.
 */
export type CanonicalWineColor = "alb" | "roze" | "rosu" | "spumant" | null;

export interface CanonicalWineIdentity {
  producer: string;
  range: string | null;
  productName: string;
  grapeVarieties: string[];
  color: CanonicalWineColor;
  sweetness: string | null;
  bottleSizeMl: number | null;
  vintage: number | null;
  sourceProductId: string | null;
}

export type IdentityConflictCode =
  | "PRODUCER"
  | "RANGE"
  | "PRODUCT_NAME"
  | "GRAPES"
  | "COLOR"
  | "SWEETNESS"
  | "BOTTLE_SIZE"
  | "VINTAGE"
  | "SOURCE_PRODUCT_ID";

export function normalizeIdentityText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bvin(?:ul)?\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedGrapes(grapes: string[]): string[] {
  return [
    ...new Set(
      grapes
        .map((grape) => normalizeIdentityText(grape))
        .filter((grape) => grape.length > 0),
    ),
  ].sort();
}

function valuesConflict(left: string | null, right: string | null): boolean {
  if (!left?.trim() || !right?.trim()) return false;
  return normalizeIdentityText(left) !== normalizeIdentityText(right);
}

export function buildCanonicalWineIdentityKey(
  identity: CanonicalWineIdentity,
): string {
  return [
    normalizeIdentityText(identity.producer),
    normalizeIdentityText(identity.range ?? ""),
    normalizeIdentityText(identity.productName),
    normalizedGrapes(identity.grapeVarieties).join("+"),
    identity.color ?? "",
    normalizeIdentityText(identity.sweetness ?? ""),
    identity.bottleSizeMl ?? "",
    identity.vintage ?? "",
    normalizeIdentityText(identity.sourceProductId ?? ""),
  ].join("|");
}

/**
 * Returns every conflict that prevents two identities from being the same
 * product. Empty array means exact match on all known fields.
 */
export function wineIdentityConflicts(
  left: CanonicalWineIdentity,
  right: CanonicalWineIdentity,
): IdentityConflictCode[] {
  const conflicts: IdentityConflictCode[] = [];

  if (valuesConflict(left.producer, right.producer)) {
    conflicts.push("PRODUCER");
  }
  if (valuesConflict(left.range, right.range)) {
    conflicts.push("RANGE");
  }
  if (valuesConflict(left.productName, right.productName)) {
    conflicts.push("PRODUCT_NAME");
  }

  const leftGrapes = normalizedGrapes(left.grapeVarieties);
  const rightGrapes = normalizedGrapes(right.grapeVarieties);
  if (
    leftGrapes.length > 0 &&
    rightGrapes.length > 0 &&
    leftGrapes.join("|") !== rightGrapes.join("|")
  ) {
    conflicts.push("GRAPES");
  }

  if (left.color && right.color && left.color !== right.color) {
    conflicts.push("COLOR");
  }
  if (valuesConflict(left.sweetness, right.sweetness)) {
    conflicts.push("SWEETNESS");
  }
  if (
    left.bottleSizeMl != null &&
    right.bottleSizeMl != null &&
    left.bottleSizeMl !== right.bottleSizeMl
  ) {
    conflicts.push("BOTTLE_SIZE");
  }
  if (
    left.vintage != null &&
    right.vintage != null &&
    left.vintage !== right.vintage
  ) {
    conflicts.push("VINTAGE");
  }
  if (
    left.sourceProductId?.trim() &&
    right.sourceProductId?.trim() &&
    normalizeIdentityText(left.sourceProductId) !==
      normalizeIdentityText(right.sourceProductId)
  ) {
    conflicts.push("SOURCE_PRODUCT_ID");
  }

  return conflicts;
}

export function wineIdentitiesMatch(
  left: CanonicalWineIdentity,
  right: CanonicalWineIdentity,
): boolean {
  return wineIdentityConflicts(left, right).length === 0;
}
