import { createHash } from "node:crypto";
import {
  parseMurfatlarProductPage,
  type MurfatlarWineVariant,
} from "@/lib/murfatlar-producer";
import {
  buildCanonicalWineIdentityKey,
  type CanonicalWineIdentity,
} from "@/lib/wine-identity";
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

function sourceIdentity(
  source: DiscoveredSource,
  variant: MurfatlarWineVariant | null,
  wine: WineIntelligenceInput,
): { identity: string; confidence: number } {
  if (source.classification === "existing_record") {
    return { identity: "EXACT_WINE_UNDATED_SOURCE", confidence: 1 };
  }
  if (variant) {
    return {
      identity:
        variant.identity.bottleSizeMl === wine.bottleSizeMl ||
        wine.bottleSizeMl == null
          ? "EXACT_WINE_UNDATED_SOURCE"
          : "PRODUCT_MISMATCH",
      confidence: 0.98,
    };
  }
  if (
    source.classification === "official_producer_page" ||
    source.classification === "official_technical_sheet" ||
    source.classification === "official_catalog"
  ) {
    return { identity: "EXACT_WINE_UNDATED_SOURCE", confidence: 0.85 };
  }
  return { identity: "EXACT_WINE_UNDATED_SOURCE", confidence: 0.75 };
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
  const identity = sourceIdentity(source, variant, wine);
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
  const identity = sourceIdentity(source, null, wine);
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
        identity: identity.identity,
      }),
    );
  };

  const title = typeof parsed.title === "string" ? parsed.title : source.title;
  push("producer", String(parsed.producer ?? wine.producer), title);
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
): WineClaim[] {
  const claims: WineClaim[] = [];
  const identity = sourceIdentity(source, null, wine);
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
        identity: identity.identity,
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
    return extractTextClaims(wine, source, body.replace(/<[^>]+>/g, " "));
  }
  return extractTextClaims(wine, source, body);
}
