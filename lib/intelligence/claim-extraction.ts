import { createHash } from "node:crypto";
import {
  parseMurfatlarProductPage,
  type MurfatlarWineVariant,
} from "@/lib/murfatlar-producer";
import {
  buildCanonicalWineIdentityKey,
  type CanonicalWineIdentity,
} from "@/lib/wine-identity";
import {
  classifySourceName,
  extractFocusedProductHtml,
  extractSourceIdentityFromHtml,
  extractSourceIdentityFromText,
  type SourceWineIdentity,
} from "@/lib/tech-facts/source-identity";
import { classifyAgainstSourceIdentity } from "@/lib/tech-facts/identity";
import type { IdentityMatchClass } from "@/lib/tech-facts/types";
import type {
  ClaimValue,
  DiscoveredSource,
  IntelligenceField,
  WineClaim,
  WineIntelligenceInput,
} from "@/lib/intelligence/types";
import { normalizeClaimValue } from "@/lib/intelligence/types";

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function canonicalIdentity(wine: WineIntelligenceInput): CanonicalWineIdentity {
  return {
    producer: wine.producer,
    range: wine.range,
    productName: wine.name,
    grapeVarieties: wine.grapeVarieties,
    color:
      wine.color === "alb" ||
      wine.color === "rosu" ||
      wine.color === "roze" ||
      wine.color === "spumant"
        ? wine.color
        : null,
    sweetness: wine.sweetness,
    bottleSizeMl: wine.bottleSizeMl,
    vintage: wine.vintage,
    sourceProductId: wine.sourceUrl ?? null,
  };
}

function normalizedIdentityText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceIdentityFromVariant(
  variant: MurfatlarWineVariant,
): SourceWineIdentity {
  return {
    sourceWineName: variant.name,
    sourceProducer: variant.identity.producer,
    sourceVintage: variant.identity.vintage,
    sourceType: variant.color,
    sourceSweetness: variant.sweetness,
    sourceGrapes: variant.grapeVarieties.map((grape) => grape.name),
    sourceBottleSize: variant.volumeMl,
    sourceSku: variant.sourceProductId,
    sourceLine: variant.rangeName,
    nameClass: "SOURCE_NAME_EXACT",
    vintageClass:
      variant.identity.vintage != null
        ? "SOURCE_VINTAGE_EXPLICIT"
        : "SOURCE_VINTAGE_MISSING",
    identityEvidence: ["isolated Murfatlar product section"],
  };
}

/**
 * Strict source identity. A missing field is not a wildcard: it makes the
 * identity insufficient for exact publication. Explicit contradictions are
 * PRODUCT_MISMATCH.
 */
export function assessSourceIdentity(
  wine: WineIntelligenceInput,
  source: SourceWineIdentity,
  evidenceText: string,
): IdentityMatchClass {
  const stripPackaging = (value: string) =>
    value
      .replace(/\b\d+(?:[.,]\d+)?\s*(?:ml|l)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  const sourceName = stripPackaging(
    (source.sourceWineName ?? "").replace(
      new RegExp(`^${wine.producer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i"),
      "",
    ),
  );
  const base = classifyAgainstSourceIdentity(
    {
      wineName: stripPackaging(wine.name),
      wineryName: wine.producer,
      vintage: wine.vintage,
      type: wine.color,
      sweetness: wine.sweetness,
      grapes: wine.grapeVarieties,
      bottleSizeMl: wine.bottleSizeMl,
    },
    { ...source, sourceWineName: sourceName },
  );
  if (base === "PRODUCT_MISMATCH") return base;

  const nameClass = classifySourceName(stripPackaging(wine.name), sourceName);
  if (nameClass !== "SOURCE_NAME_EXACT") {
    return nameClass === "SOURCE_NAME_MISSING"
      ? "SOURCE_IDENTITY_INCOMPLETE"
      : "LIKELY_WINE";
  }

  const producer = normalizedIdentityText(wine.producer);
  const explicitProducer = normalizedIdentityText(source.sourceProducer ?? "");
  if (producer && explicitProducer && explicitProducer !== producer) {
    return "PRODUCT_MISMATCH";
  }
  const haystack = normalizedIdentityText(
    `${source.sourceWineName ?? ""} ${evidenceText}`,
  );
  if (producer && !explicitProducer && !haystack.includes(producer)) {
    return "SOURCE_IDENTITY_INCOMPLETE";
  }

  if (wine.sweetness && !source.sourceSweetness) return "LIKELY_WINE";
  if (wine.grapeVarieties.length > 0 && source.sourceGrapes.length === 0) {
    return "LIKELY_WINE";
  }
  if (wine.bottleSizeMl != null && source.sourceBottleSize == null) {
    return "LIKELY_WINE";
  }
  if (wine.vintage == null && source.sourceVintage != null) {
    return "LIKELY_WINE";
  }

  return base;
}

function identityFromVariant(
  variant: MurfatlarWineVariant,
  wine: WineIntelligenceInput,
  source: DiscoveredSource,
): { identity: IdentityMatchClass; confidence: number } {
  const identity = assessSourceIdentity(
    wine,
    sourceIdentityFromVariant(variant),
    `${variant.tastingNotes ?? ""} ${source.title}`,
  );
  return { identity, confidence: 0.9 };
}

function sourceIdentityFromJson(
  parsed: Record<string, unknown>,
  title: string,
): SourceWineIdentity {
  const displayName =
    typeof parsed.displayName === "string"
      ? parsed.displayName
      : typeof parsed.productName === "string"
        ? parsed.productName
        : typeof parsed.title === "string"
          ? parsed.title
          : title;
  return {
    sourceWineName: displayName,
    sourceProducer:
      typeof parsed.producer === "string" ? parsed.producer : null,
    sourceVintage:
      typeof parsed.vintage === "number" ? parsed.vintage : null,
    sourceType: typeof parsed.color === "string" ? parsed.color : null,
    sourceSweetness:
      typeof parsed.sweetness === "string" ? parsed.sweetness : null,
    sourceGrapes: Array.isArray(parsed.grapeVarieties)
      ? parsed.grapeVarieties.map(String)
      : [],
    sourceBottleSize:
      typeof parsed.bottleSizeMl === "number" ? parsed.bottleSizeMl : null,
    sourceSku:
      typeof parsed.sourceProductId === "string"
        ? parsed.sourceProductId
        : null,
    sourceLine: typeof parsed.range === "string" ? parsed.range : null,
    nameClass: displayName ? "SOURCE_NAME_EXACT" : "SOURCE_NAME_MISSING",
    vintageClass:
      typeof parsed.vintage === "number"
        ? "SOURCE_VINTAGE_EXPLICIT"
        : "SOURCE_VINTAGE_MISSING",
    identityEvidence: ["structured product JSON"],
  };
}

function productNamesInHtml(html: string): string[] {
  const names = new Set<string>();
  for (const match of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed = JSON.parse(match[1] ?? "");
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const record = node as Record<string, unknown>;
        if (/product/i.test(String(record["@type"] ?? "")) && typeof record.name === "string") {
          names.add(record.name.trim());
        }
      }
    } catch {
      // Ignore malformed JSON-LD.
    }
  }
  for (const match of html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)) {
    const name = (match[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (name.length >= 3 && name.length <= 120) names.add(name);
  }
  return [...names];
}

function targetProductTokens(wine: WineIntelligenceInput): string[] {
  return normalizedIdentityText(wine.name)
    .split(" ")
    .filter((token) => token.length > 2);
}

/**
 * Returns the isolated HTML for the exact product, or null when a multi-wine
 * page cannot be safely reduced to one product section. A null result must not
 * produce claims.
 */
export function isolateProductSection(
  html: string,
  wine: WineIntelligenceInput,
): string | null {
  const names = productNamesInHtml(html);
  if (names.length <= 1) return extractFocusedProductHtml(html);

  const tokens = targetProductTokens(wine);
  const containers = [
    ...html.matchAll(/<(article|section|li)[^>]*>[\s\S]*?<\/\1>/gi),
  ].map((match) => match[0]);
  const matching = containers.filter((container) => {
    const text = normalizedIdentityText(container.replace(/<[^>]+>/g, " "));
    return tokens.length > 0 && tokens.every((token) => text.includes(token));
  });
  if (matching.length === 1 && matching[0]) return matching[0];
  return null;
}

function makeClaim(params: {
  wine: WineIntelligenceInput;
  source: DiscoveredSource;
  field: IntelligenceField;
  value: ClaimValue;
  unit: string | null;
  excerpt: string;
  confidence: number;
  identity: string;
  method?: "deterministic" | "constrained_llm" | "manual" | "existing_record";
}): WineClaim {
  const identity = canonicalIdentity(params.wine);
  const sourceHash = hash(
    `${params.source.url}|${params.field}|${normalizeClaimValue(params.value)}`,
  );
  return {
    wineId: params.wine.id,
    canonicalIdentityKey: buildCanonicalWineIdentityKey(identity),
    identity,
    field: params.field,
    value: params.value,
    normalizedValue: normalizeClaimValue(params.value),
    unit: params.unit,
    sourceUrl: params.source.url,
    sourceTitle: params.source.title,
    sourceClass: params.source.classification,
    excerpt: params.excerpt.trim().replace(/\s+/g, " ").slice(0, 600),
    observedAt: params.source.fixture?.observedAt ?? new Date().toISOString(),
    extractionMethod: params.method ?? "deterministic",
    identityMatchStatus: params.identity as WineClaim["identityMatchStatus"],
    confidence: params.confidence,
    sourceHash,
    claimHash: hash(
      `${params.wine.id}|${params.field}|${sourceHash}|${normalizeClaimValue(params.value)}`,
    ),
  };
}

function splitDescriptors(text: string): string[] {
  return [
    ...new Set(
      text
        .replace(/^(culoare|miros|aroma|gust|gustul|aspect)\s*:\s*/i, "")
        .split(/[,;.]|\bsi\b|\bși\b/i)
        .map((item) => item.trim())
        .filter((item) => item.length > 2),
    ),
  ];
}

function extractServing(text: string): string | null {
  const match = text.match(
    /temperatura\s+(?:de\s+)?servire\s*:?\s*(\d{1,2})\s*[-–]\s*(\d{1,2})\s*°?c/i,
  );
  return match?.[1] && match?.[2] ? `${match[1]}-${match[2]}` : null;
}

function extractFoodPairing(text: string): string[] {
  const match = text.match(
    /asocierea\s+culinar[aă]\s*:\s*([\s\S]+?)(?:\n|$)/i,
  );
  if (!match?.[1]) return [];
  return splitDescriptors(match[1]).filter((item) => item.length > 3);
}

function valueFromVariant(
  wine: WineIntelligenceInput,
  source: DiscoveredSource,
  variant: MurfatlarWineVariant,
): WineClaim[] {
  const claims: WineClaim[] = [];
  const notes = variant.tastingNotes ?? "";
  const identity = identityFromVariant(variant, wine, source);
  const push = (
    field: IntelligenceField,
    value: ClaimValue,
    unit: string | null,
    excerpt: string,
    confidence = 0.95,
  ) => {
    claims.push(
      makeClaim({
        wine,
        source,
        field,
        value,
        unit,
        excerpt,
        confidence,
        identity: identity.identity,
      }),
    );
  };

  push("producer", "Murfatlar", null, "producer page", 0.98);
  push("range", variant.rangeName, null, variant.rangeName, 0.98);
  push("product_name", variant.productLabel, null, variant.productLabel, 0.98);
  push(
    "grape_varieties",
    variant.grapeVarieties.map((grape) => grape.name),
    null,
    variant.grapeVarieties.map((grape) => grape.name).join(" + "),
    0.98,
  );
  push("bottle_volume", variant.volumeMl, "ml", `${variant.volumeMl} ml`, 0.95);
  if (variant.color) {
    push("wine_color", variant.color, null, variant.color, 0.98);
  }
  if (variant.sweetness) {
    push("sweetness", variant.sweetness, null, variant.sweetness, 0.98);
  }
  if (variant.appellation) {
    push("appellation", variant.appellation, null, variant.appellation, 0.95);
  }
  if (variant.identity.vintage != null) {
    push("vintage", variant.identity.vintage, null, String(variant.identity.vintage), 0.9);
  }
  push("region", "Murfatlar", null, "podgoria Murfatlar", 0.9);
  push("country", "Romania", null, "Murfatlar, Romania", 0.9);

  const serving = extractServing(notes);
  if (serving) {
    push("serving_temperature", serving, "C", notes.match(/Temperatura[^.]*\./i)?.[0] ?? notes, 0.9);
  }

  const visual = notes.match(/Culoare\s*:\s*([\s\S]*?)(?=Miros\s*:|$)/i)?.[1];
  if (visual) {
    push("visual_appearance", splitDescriptors(visual), null, visual, 0.9);
  }
  const aroma = notes.match(/Miros\s*:\s*([\s\S]*?)(?=Gust\s*:|$)/i)?.[1];
  if (aroma) {
    push("aroma_descriptors", splitDescriptors(aroma), null, aroma, 0.9);
  }
  const taste = notes.match(
    /Gust\s*:\s*([\s\S]*?)(?=(?:Temperatura\s+(?:de\s+)?servire|Asocierea\s+culinar)|$)/i,
  )?.[1];
  if (taste) {
    push("taste_descriptors", splitDescriptors(taste), null, taste, 0.9);
  }

  const body = notes.match(/\bcorpolen[tț][aă]\s+(medie(?:\s+spre\s+(?:mare|mic[aă]))?|mare|mic[aă])\b/i)?.[1];
  if (body) push("body", body.toLowerCase(), null, body, 0.85);

  const acidity = notes.match(/\baciditate\s+(medie|ridicat[aă]|sc[aă]zut[aă])\b/i)?.[1];
  if (acidity) push("acidity_perception", acidity.toLowerCase(), null, acidity, 0.85);

  const tannin = notes.match(/\btaninuri\s+(moi|fine|persistente|integrate|bine integrate)\b/i)?.[1];
  if (tannin) push("tannin_perception", tannin.toLowerCase(), null, tannin, 0.85);

  const finish = notes.match(/\bgust\s+final\s+(remanent[^.]*|lung[^.]*|persistent[^.]*)/i)?.[1];
  if (finish) push("finish", finish.trim().toLowerCase(), null, finish, 0.85);

  const food = extractFoodPairing(notes);
  if (food.length > 0) {
    push("food_pairing", food, null, food.join(", "), 0.9);
  }

  if (/\bstejar\b|\blemn\b/i.test(notes)) {
    const oak = notes.match(/[^.]*(?:stejar|lemn)[^.]*\./i)?.[0];
    if (oak) push("oak_treatment", oak.trim(), null, oak, 0.8);
  }
  if (/\bsulfit/i.test(notes)) {
    const allergens = notes.match(/[^.]*sulfit[^.]*\./i)?.[0];
    if (allergens) push("allergens", ["sulfites"], null, allergens, 0.85);
  }

  const percentages = [...notes.matchAll(
    /(\d{1,3})\s*%\s*([A-Za-zÀ-ž][A-Za-zÀ-ž\s-]{2,40})/g,
  )].map((match) => ({
    grape: (match[2] ?? "").trim(),
    percentage: Number.parseInt(match[1] ?? "", 10),
  })).filter((item) => item.grape && !/^vol/i.test(item.grape));
  if (percentages.length > 0) {
    push(
      "grape_percentages",
      percentages as unknown as ClaimValue,
      null,
      notes,
      0.85,
    );
  }
  const winemaking = notes.match(/[^.]*(?:fermenta|macera|vinific)[^.]*\./i)?.[0];
  if (winemaking) {
    push("winemaking_method", winemaking.trim(), null, winemaking, 0.8);
  }
  const cellaring = notes.match(/[^.]*(?:pastrare|păstrare|învechire|cellar)[^.]*\./i)?.[0];
  if (cellaring) push("cellaring", cellaring.trim(), null, cellaring, 0.8);
  const awards = notes.match(/[^.]*(?:medalie|premiu|gold|silver|bronze)[^.]*\./i)?.[0];
  if (awards) push("awards", awards.trim(), null, awards, 0.8);

  return claims;
}

function extractJsonClaims(
  wine: WineIntelligenceInput,
  source: DiscoveredSource,
  body: string,
): WineClaim[] {
  let parsed: Record<string, unknown>;
  try {
    const value = JSON.parse(body);
    if (!value || typeof value !== "object") return [];
    parsed = value as Record<string, unknown>;
  } catch {
    return [];
  }
  const claims: WineClaim[] = [];
  const title = typeof parsed.title === "string" ? parsed.title : source.title;
  const identity = assessSourceIdentity(
    wine,
    sourceIdentityFromJson(parsed, title),
    JSON.stringify(parsed),
  );
  const push = (field: IntelligenceField, value: ClaimValue, excerpt: string, unit: string | null = null) => {
    if (value == null || (Array.isArray(value) && value.length === 0)) return;
    claims.push(
      makeClaim({
        wine,
        source,
        field,
        value,
        unit,
        excerpt,
        confidence: source.classification === "retailer" ? 0.7 : 0.8,
        identity,
      }),
    );
  };

  if (typeof parsed.producer === "string") push("producer", parsed.producer, title);
  if (typeof parsed.range === "string") push("range", parsed.range, title);
  if (typeof parsed.productName === "string") push("product_name", parsed.productName, title);
  if (Array.isArray(parsed.grapeVarieties)) {
    push("grape_varieties", parsed.grapeVarieties.map(String), title);
  }
  if (typeof parsed.sweetness === "string") push("sweetness", parsed.sweetness, title);
  if (typeof parsed.color === "string") push("wine_color", parsed.color, title);
  if (typeof parsed.bottleSizeMl === "number") {
    push("bottle_volume", parsed.bottleSizeMl, `${parsed.bottleSizeMl} ml`, "ml");
  }
  if (typeof parsed.alcoholPercent === "number") {
    push(
      "alcohol",
      parsed.alcoholPercent,
      String(parsed.alcoholEvidence ?? `${parsed.alcoholPercent}% vol.`),
      "% vol",
    );
  }
  if (typeof parsed.vintage === "number") push("vintage", parsed.vintage, title);
  if (typeof parsed.appellation === "string") push("appellation", parsed.appellation, title);
  if (typeof parsed.region === "string") push("region", parsed.region, title);
  if (typeof parsed.country === "string") push("country", parsed.country, title);
  if (Array.isArray(parsed.aromaDescriptors)) {
    push("aroma_descriptors", parsed.aromaDescriptors.map(String), title);
  }
  if (Array.isArray(parsed.tasteDescriptors)) {
    push("taste_descriptors", parsed.tasteDescriptors.map(String), title);
  }
  for (const field of [
    "body",
    "acidityPerception",
    "tanninPerception",
    "finish",
    "winemakingMethod",
    "oakTreatment",
    "cellaring",
  ] as const) {
    if (typeof parsed[field] === "string") {
      const mapped = field
        .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`) as IntelligenceField;
      push(mapped, parsed[field], title);
    }
  }
  if (Array.isArray(parsed.foodPairing)) {
    push("food_pairing", parsed.foodPairing.map(String), title);
  }
  if (Array.isArray(parsed.awards)) {
    push("awards", parsed.awards.map(String), title);
  }
  if (Array.isArray(parsed.allergens)) {
    push("allergens", parsed.allergens.map(String), title);
  }
  if (Array.isArray(parsed.grapePercentages)) {
    push("grape_percentages", parsed.grapePercentages as ClaimValue, title);
  }
  return claims;
}

function extractTextClaims(
  wine: WineIntelligenceInput,
  source: DiscoveredSource,
  text: string,
  identity: IdentityMatchClass,
): WineClaim[] {
  const claims: WineClaim[] = [];
  const push = (field: IntelligenceField, value: ClaimValue, excerpt: string, unit: string | null = null) => {
    claims.push(
      makeClaim({
        wine,
        source,
        field,
        value,
        unit,
        excerpt,
        confidence: source.classification === "retailer" ? 0.65 : 0.75,
        identity,
      }),
    );
  };
  const alcohol = text.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:vol|alcool)/i);
  if (alcohol?.[1]) {
    push("alcohol", Number.parseFloat(alcohol[1].replace(",", ".")), alcohol[0], "% vol");
  }
  const volume = text.match(/(\d+(?:[.,]\d+)?)\s*(ml|l)\b/i);
  if (volume?.[1]) {
    const amount = Number.parseFloat(volume[1].replace(",", "."));
    push(
      "bottle_volume",
      (volume[2] ?? "ml").toLowerCase() === "l" ? Math.round(amount * 1000) : amount,
      volume[0],
      "ml",
    );
  }
  const sweetness = text.match(/\b(demisec|demidulce|dulce|sec)\b/i);
  if (sweetness?.[1]) push("sweetness", sweetness[1].toLowerCase(), sweetness[0]);
  const serving = extractServing(text);
  if (serving) push("serving_temperature", serving, serving, "C");
  return claims;
}

export function extractClaimsFromDiscoveredSource(
  wine: WineIntelligenceInput,
  source: DiscoveredSource,
): WineClaim[] {
  if (source.classification === "existing_record") {
    return Object.entries(wine.currentFacts ?? {}).map(([field, value]) =>
      makeClaim({
        wine,
        source,
        field: field as IntelligenceField,
        value: value as ClaimValue,
        unit: null,
        excerpt: "Existing VinIntel record",
        confidence: 0.6,
        identity: "EXACT_WINE_UNDATED_SOURCE",
        method: "existing_record",
      }),
    );
  }
  if (!source.fixture) return [];
  const body = source.fixture.body;
  if (source.fixture.kind === "json") return extractJsonClaims(wine, source, body);
  if (source.fixture.kind === "html") {
    const variant = parseMurfatlarProductPage(
      body,
      source.fixture.url,
      `${wine.name} ${wine.range ?? ""}`.trim(),
    );
    if (variant) {
      return valueFromVariant(wine, source, variant);
    }

    // A listing page must be narrowed to one product section before any claim
    // extraction. If that is impossible, fail closed with no publishable claims.
    const section = isolateProductSection(body, wine);
    if (!section) return [];
    const sourceIdentity = extractSourceIdentityFromHtml(section);
    const identity = assessSourceIdentity(wine, sourceIdentity, section);
    return extractTextClaims(
      wine,
      source,
      section.replace(/<[^>]+>/g, " "),
      identity,
    );
  }

  const sourceIdentity = extractSourceIdentityFromText({
    text: body,
    title: source.title,
  });
  const identity = assessSourceIdentity(wine, sourceIdentity, body);
  return extractTextClaims(wine, source, body, identity);
}
