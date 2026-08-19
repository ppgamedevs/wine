import type {
  PublicTechnicalField,
  PublicTechnicalTrust,
} from "@/lib/tech-facts/public-trust";
import type { WineWithRelations } from "@/types";
import type { AppLocale } from "@/i18n/locale";

const SWEETNESS_LABELS: Record<AppLocale, Record<string, string>> = {
  ro: {
    sec: "Sec",
    demisec: "Demisec",
    demidulce: "Demidulce",
    dulce: "Dulce",
  },
  en: {
    sec: "Dry",
    demisec: "Medium-dry",
    demidulce: "Medium-sweet",
    dulce: "Sweet",
  },
};

const TYPE_LABELS: Record<AppLocale, Record<string, string>> = {
  ro: {
    red: "Roșu",
    white: "Alb",
    rose: "Rosé",
    sparkling: "Spumant",
    dessert: "Desert",
    orange: "Orange",
  },
  en: {
    red: "Red",
    white: "White",
    rose: "Rosé",
    sparkling: "Sparkling",
    dessert: "Dessert",
    orange: "Orange",
  },
};

export interface PublicWineSpecRow {
  label: string;
  value: string;
  trust?: PublicTechnicalField;
}

function formatDecimal(value: number, locale: AppLocale): string {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "ro-RO", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPublicTechnicalValue(
  field: PublicTechnicalField,
  locale: AppLocale = "ro",
): string {
  if (field.status === "conflict") {
    return locale === "en" ? "Under review" : "În verificare";
  }
  if (field.value == null) return "";
  if (field.field === "sweetness") {
    return SWEETNESS_LABELS[locale][String(field.value)] ?? String(field.value);
  }
  if (field.field === "vintage") return String(field.value);
  const numeric =
    typeof field.value === "number"
      ? formatDecimal(field.value, locale)
      : field.value;
  if (field.field === "alcohol") return `${numeric}% vol.`;
  return `${numeric} g/L`;
}

function trustedRow(
  label: string,
  field: PublicTechnicalField,
  locale: AppLocale,
): PublicWineSpecRow | null {
  if (field.status === "unknown") return null;
  return {
    label,
    value: formatPublicTechnicalValue(field, locale),
    trust: field,
  };
}

export function buildPublicWineSpecs(
  wine: WineWithRelations,
  trust: PublicTechnicalTrust,
  locale: AppLocale = "ro",
): {
  identity: PublicWineSpecRow[];
  technical: PublicWineSpecRow[];
} {
  const grapeText = (wine.grapeVarieties ?? [])
    .map((grape) =>
      grape.percentage
        ? `${grape.name} (${grape.percentage}%)`
        : grape.name,
    )
    .join(", ");

  return {
    identity: [
      {
        label: locale === "en" ? "Wine type" : "Tip vin",
        value: TYPE_LABELS[locale][wine.type] ?? wine.type,
      },
      trustedRow(
        locale === "en" ? "Sweetness" : "Dulceață",
        trust.fields.sweetness,
        locale,
      ),
      trustedRow(
        locale === "en" ? "Vintage" : "An recoltă",
        trust.fields.vintage,
        locale,
      ),
      grapeText
        ? {
            label: locale === "en" ? "Grape varieties" : "Soiuri",
            value: grapeText,
          }
        : null,
      wine.region?.name
        ? {
            label: locale === "en" ? "Region" : "Regiune",
            value: wine.region.name,
          }
        : null,
      wine.winery?.name
        ? {
            label: locale === "en" ? "Winery" : "Crama",
            value: wine.winery.name,
          }
        : null,
    ].filter((row): row is PublicWineSpecRow => row != null),
    technical: [
      trustedRow(
        locale === "en" ? "Alcohol" : "Alcool",
        trust.fields.alcohol,
        locale,
      ),
      trustedRow(
        locale === "en" ? "Residual sugar" : "Zahăr rezidual",
        trust.fields.sugar,
        locale,
      ),
      trustedRow(
        locale === "en" ? "Acidity" : "Aciditate",
        trust.fields.acidity,
        locale,
      ),
    ].filter((row): row is PublicWineSpecRow => row != null),
  };
}
