import type {
  PublicTechnicalField,
  PublicTechnicalTrust,
} from "@/lib/tech-facts/public-trust";
import type { WineWithRelations } from "@/types";

const SWEETNESS_LABELS: Record<string, string> = {
  sec: "Sec",
  demisec: "Demisec",
  demidulce: "Demidulce",
  dulce: "Dulce",
};

const TYPE_LABELS: Record<string, string> = {
  red: "Roșu",
  white: "Alb",
  rose: "Rosé",
  sparkling: "Spumant",
  dessert: "Desert",
  orange: "Orange",
};

export interface PublicWineSpecRow {
  label: string;
  value: string;
  trust?: PublicTechnicalField;
}

function formatDecimal(value: number): string {
  return new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPublicTechnicalValue(
  field: PublicTechnicalField,
): string {
  if (field.status === "conflict") return "În verificare";
  if (field.value == null) return "";
  if (field.field === "sweetness") {
    return SWEETNESS_LABELS[String(field.value)] ?? String(field.value);
  }
  if (field.field === "vintage") return String(field.value);
  const numeric =
    typeof field.value === "number" ? formatDecimal(field.value) : field.value;
  if (field.field === "alcohol") return `${numeric}% vol.`;
  return `${numeric} g/L`;
}

function trustedRow(
  label: string,
  field: PublicTechnicalField,
): PublicWineSpecRow | null {
  if (field.status === "unknown") return null;
  return { label, value: formatPublicTechnicalValue(field), trust: field };
}

export function buildPublicWineSpecs(
  wine: WineWithRelations,
  trust: PublicTechnicalTrust,
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
      { label: "Tip vin", value: TYPE_LABELS[wine.type] ?? wine.type },
      trustedRow("Dulceață", trust.fields.sweetness),
      trustedRow("An recoltă", trust.fields.vintage),
      grapeText ? { label: "Soiuri", value: grapeText } : null,
      wine.region?.name
        ? { label: "Regiune", value: wine.region.name }
        : null,
      wine.winery?.name
        ? { label: "Crama", value: wine.winery.name }
        : null,
    ].filter((row): row is PublicWineSpecRow => row != null),
    technical: [
      trustedRow("Alcool", trust.fields.alcohol),
      trustedRow("Zahăr rezidual", trust.fields.sugar),
      trustedRow("Aciditate", trust.fields.acidity),
    ].filter((row): row is PublicWineSpecRow => row != null),
  };
}
