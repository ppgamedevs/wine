import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { wineClaimEvidence } from "@/lib/schema";
import { grapeGuidesForWine } from "@/lib/oenology";
import type { AppLocale } from "@/i18n/locale";
import type { WineWithRelations } from "@/types";

export interface UniversalProfileField {
  key: string;
  label: string;
  value: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  verification: string;
  conflict: boolean;
}

export interface UniversalProfileSection {
  id: "identity" | "technical" | "sensory" | "serving";
  title: string;
  fields: UniversalProfileField[];
}

export interface UniversalProfile {
  sections: UniversalProfileSection[];
  grapes: Array<{
    name: string;
    percentage: number | null;
    guideSlug: string | null;
  }>;
  hasStructuredClaims: boolean;
  evidenceCount: number;
}

const FIELD_LABELS: Record<string, { ro: string; en: string }> = {
  alcohol: { ro: "Alcool", en: "Alcohol" },
  sugar: { ro: "Zahăr rezidual", en: "Residual sugar" },
  acidity: { ro: "Aciditate", en: "Acidity" },
  bottle_volume: { ro: "Volum", en: "Bottle volume" },
  appellation: { ro: "Apelațiune", en: "Appellation" },
  serving_temperature: { ro: "Temperatură de servire", en: "Serving temperature" },
  visual_appearance: { ro: "Aspect", en: "Appearance" },
  aroma_descriptors: { ro: "Aromă", en: "Aroma" },
  taste_descriptors: { ro: "Gust", en: "Taste" },
  body: { ro: "Corpolență", en: "Body" },
  acidity_perception: { ro: "Percepție aciditate", en: "Acidity perception" },
  tannin_perception: { ro: "Tanin", en: "Tannin" },
  finish: { ro: "Final", en: "Finish" },
  food_pairing: { ro: "Asocieri culinare", en: "Food pairing" },
};

function label(field: string, locale: AppLocale): string {
  return FIELD_LABELS[field]?.[locale] ?? field;
}

function valueText(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "object" && value != null) return JSON.stringify(value);
  return String(value);
}

const OFFICIAL_SOURCE_CLASSES = new Set([
  "official_technical_sheet",
  "official_producer_page",
  "official_catalog",
  "producer_general",
]);

const VERIFICATION_RANK: Record<string, number> = {
  verified_official: 0,
  corroborated: 1,
  attributed_specialist: 2,
  attributed_editorial: 3,
  attributed_retailer: 4,
  unverified: 5,
  conflict: 6,
  identity_mismatch: 7,
};

const SOURCE_CLASS_RANK: Record<string, number> = {
  official_technical_sheet: 0,
  official_producer_page: 1,
  official_catalog: 2,
  producer_general: 3,
  specialist: 4,
  editorial: 5,
  education: 6,
  retailer: 7,
  unknown: 8,
  existing_record: 9,
};

/**
 * The badge must describe the exact record selected for the displayed value.
 * If a row is labelled official but came from a retailer, demote the badge rather
 * than pairing a retailer value with an official verification.
 */
export function effectiveVerification(row: WineClaimRow): string {
  if (
    row.verificationStatus === "verified_official" &&
    !OFFICIAL_SOURCE_CLASSES.has(row.sourceClass)
  ) {
    if (row.sourceClass === "retailer") return "attributed_retailer";
    if (row.sourceClass === "specialist") return "attributed_specialist";
    if (row.sourceClass === "editorial") return "attributed_editorial";
    return "unverified";
  }
  return row.verificationStatus;
}

function preferredClaimRow(rows: WineClaimRow[]): WineClaimRow {
  return [...rows].sort((left, right) => {
    const leftVerification = VERIFICATION_RANK[effectiveVerification(left)] ?? 99;
    const rightVerification = VERIFICATION_RANK[effectiveVerification(right)] ?? 99;
    if (leftVerification !== rightVerification) {
      return leftVerification - rightVerification;
    }
    const sourceRank =
      (SOURCE_CLASS_RANK[left.sourceClass] ?? 99) -
      (SOURCE_CLASS_RANK[right.sourceClass] ?? 99);
    if (sourceRank !== 0) return sourceRank;
    const confidence = (right.confidence ?? 0) - (left.confidence ?? 0);
    if (confidence !== 0) return confidence;
    const observed = (right.observedAt ?? "").localeCompare(
      left.observedAt ?? "",
    );
    if (observed !== 0) return observed;
    const sourceUrl = left.sourceUrl.localeCompare(right.sourceUrl);
    if (sourceUrl !== 0) return sourceUrl;
    return (left.id ?? 0) - (right.id ?? 0);
  })[0]!;
}

export interface WineClaimRow {
  id?: number;
  field: string;
  value: unknown;
  verificationStatus: string;
  sourceClass: string;
  sourceUrl: string;
  sourceTitle: string | null;
  unit: string | null;
  excerpt: string;
  confidence?: number;
  observedAt?: string;
}

function fieldFromRows(
  rows: WineClaimRow[],
  field: string,
  locale: AppLocale,
): UniversalProfileField | null {
  const fieldRows = rows.filter((row) => row.field === field);
  if (fieldRows.length === 0) return null;
  const uniqueValues = new Set(
    fieldRows.map((row) => valueText(row.value).trim().toLowerCase()),
  );
  // Value, source and badge are taken from this same selected record. Never
  // combine a retailer value with a separately selected official badge.
  const selected = preferredClaimRow(fieldRows);
  return {
    key: field,
    label: label(field, locale),
    value: `${valueText(selected.value)}${selected.unit ? ` ${selected.unit}` : ""}`,
    sourceUrl: selected.sourceUrl,
    sourceTitle: selected.sourceTitle,
    verification: effectiveVerification(selected),
    conflict: uniqueValues.size > 1,
  };
}

export async function loadWineClaimRows(wineId: number): Promise<WineClaimRow[]> {
  try {
    const rows = await db
      .select({
        id: wineClaimEvidence.id,
        field: wineClaimEvidence.field,
        value: wineClaimEvidence.valueJson,
        verificationStatus: wineClaimEvidence.verificationStatus,
        sourceClass: wineClaimEvidence.sourceClass,
        sourceUrl: wineClaimEvidence.sourceUrl,
        sourceTitle: wineClaimEvidence.sourceTitle,
        unit: wineClaimEvidence.unit,
        excerpt: wineClaimEvidence.excerpt,
        confidence: wineClaimEvidence.confidence,
        observedAt: wineClaimEvidence.observedAt,
      })
      .from(wineClaimEvidence)
      .where(eq(wineClaimEvidence.wineId, wineId));
    return rows as WineClaimRow[];
  } catch {
    // Migration 0028 may not be applied yet; public UI must remain usable.
    return [];
  }
}

export function buildUniversalWineProfile(input: {
  wine: WineWithRelations;
  claimRows: WineClaimRow[];
  locale: AppLocale;
}): UniversalProfile {
  const { wine, claimRows, locale } = input;
  const guides = grapeGuidesForWine(wine);
  const guideBySlug = new Map(guides.map((guide) => [guide.slug, guide]));
  const fieldsFor = (names: string[]) =>
    names
      .map((name) => fieldFromRows(claimRows, name, locale))
      .filter((field): field is UniversalProfileField => field != null);

  const typeLabels: Record<string, string> = locale === "en"
    ? { red: "Red", white: "White", rose: "Rosé", sparkling: "Sparkling", dessert: "Dessert", orange: "Orange" }
    : { red: "Roșu", white: "Alb", rose: "Roz", sparkling: "Spumant", dessert: "Desert", orange: "Orange" };
  const sweetnessLabels: Record<string, string> = locale === "en"
    ? { sec: "Dry", demisec: "Medium-dry", demidulce: "Medium-sweet", dulce: "Sweet" }
    : { sec: "Sec", demisec: "Demisec", demidulce: "Demidulce", dulce: "Dulce" };
  const identity: UniversalProfileField[] = [
    {
      key: "wine_type",
      label: locale === "en" ? "Wine type" : "Tip vin",
      value: typeLabels[wine.type] ?? wine.type,
      sourceUrl: null,
      sourceTitle: null,
      verification: "unverified",
      conflict: false,
    },
  ];
  if (wine.sweetness) {
    identity.push({
      key: "sweetness",
      label: locale === "en" ? "Sweetness" : "Dulceață",
      value: sweetnessLabels[wine.sweetness] ?? wine.sweetness,
      sourceUrl: null,
      sourceTitle: null,
      verification: "unverified",
      conflict: false,
    });
  }
  if (wine.vintage) {
    identity.push({
      key: "vintage",
      label: locale === "en" ? "Vintage" : "An recoltă",
      value: String(wine.vintage),
      sourceUrl: null,
      sourceTitle: null,
      verification: "unverified",
      conflict: false,
    });
  }
  if (wine.region?.name) {
    identity.push({
      key: "region",
      label: locale === "en" ? "Region" : "Regiune",
      value: wine.region.name,
      sourceUrl: null,
      sourceTitle: null,
      verification: "unverified",
      conflict: false,
    });
  }
  identity.push(...fieldsFor(["appellation"]));

  return {
    sections: [
      {
        id: "identity",
        title: locale === "en" ? "Identity and classification" : "Identitate și clasificare",
        fields: identity,
      },
      {
        id: "technical",
        title: locale === "en" ? "Technical profile" : "Profil tehnic",
        fields: fieldsFor(["alcohol", "sugar", "acidity", "bottle_volume"]),
      },
      {
        id: "sensory",
        title: locale === "en" ? "Structured sensory profile" : "Profil senzorial structurat",
        fields: fieldsFor([
          "visual_appearance",
          "aroma_descriptors",
          "taste_descriptors",
          "body",
          "acidity_perception",
          "tannin_perception",
          "finish",
        ]),
      },
      {
        id: "serving",
        title: locale === "en" ? "Serving and table" : "Servire și masă",
        fields: fieldsFor(["serving_temperature", "food_pairing"]),
      },
    ],
    grapes: (wine.grapeVarieties ?? []).map((grape) => {
      const normalized = grape.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      const guide =
        guides.find(
          (item) =>
            item.copy.ro.name
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase() === normalized,
        ) ??
        (grape.slug ? guideBySlug.get(grape.slug) : undefined);
      return {
        name: grape.name,
        percentage: grape.percentage ?? null,
        guideSlug: guide?.slug ?? null,
      };
    }),
    hasStructuredClaims: claimRows.length > 0,
    evidenceCount: claimRows.length,
  };
}

export async function loadUniversalWineProfile(
  wine: WineWithRelations,
  locale: AppLocale,
): Promise<UniversalProfile> {
  const rows = await loadWineClaimRows(wine.id);
  return buildUniversalWineProfile({ wine, claimRows: rows, locale });
}
