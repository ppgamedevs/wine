import type { WineType } from "@/types";

const ronFormatter = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "RON",
  maximumFractionDigits: 0,
});

export function formatRon(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Pret indisponibil";
  return ronFormatter.format(value);
}

const longDateFormatter = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatLongDate(
  value: string | Date | null | undefined,
): string | undefined {
  if (!value) return undefined;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return undefined;
  return longDateFormatter.format(date);
}

const shortDateFormatter = new Intl.DateTimeFormat("ro-RO", {
  month: "short",
  year: "numeric",
});

export function formatShortDate(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return undefined;
  return shortDateFormatter.format(date);
}

export const wineTypeLabel: Record<WineType, string> = {
  red: "Rosu",
  white: "Alb",
  rose: "Rose",
  sparkling: "Spumant",
  dessert: "Desert",
  orange: "Orange",
};

export const wineTypeGradient: Record<WineType, string> = {
  red: "from-wine/85 via-wine to-[#4a1608]",
  white: "from-amber-200/70 via-amber-100 to-stone-100",
  rose: "from-rose-300/70 via-rose-200 to-stone-100",
  sparkling: "from-amber-100 via-stone-100 to-amber-50",
  dessert: "from-amber-400/70 via-amber-300 to-amber-100",
  orange: "from-orange-300/70 via-orange-200 to-amber-100",
};

export function valueScoreTone(score: number | null | undefined): string {
  if (score === null || score === undefined) return "bg-muted text-muted-foreground";
  if (score >= 88) return "bg-wine text-wine-foreground";
  if (score >= 80) return "bg-wine/15 text-wine";
  return "bg-secondary text-secondary-foreground";
}
