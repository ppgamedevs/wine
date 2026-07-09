import type { WineMedal } from "@/lib/schema";

const HIGH_IMPORTANCE_PATTERNS = [
  /\bdecanter\b/i,
  /\biwsc\b/i,
  /\binternational wine (&|and) spirit\b/i,
  /\bbalkans international\b/i,
  /\bvinarium\b/i,
  /\bconcours mondial\b/i,
  /\bmundus vini\b/i,
  /\bberliner wein trophy\b/i,
  /\bchallenge international du vin\b/i,
  /\bsan francisco international wine\b/i,
  /\bcitadelles du vin\b/i,
  /\basia wine trophy\b/i,
  /\bfrankfurt international wine trophy\b/i,
  /\bconcours mondial de bruxelles\b/i,
  /\bvinvest\b/i,
] as const;

const MEDAL_LABEL: Record<WineMedal["medal"], string> = {
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
  double_gold: "Double Gold",
  best_in_class: "Best in Class",
  other: "Medalie",
};

export function isHighImportanceCompetition(competition: string): boolean {
  return HIGH_IMPORTANCE_PATTERNS.some((pattern) => pattern.test(competition));
}

function isInternationalMedal(medal: WineMedal): boolean {
  return (
    medal.importance === "high" || isHighImportanceCompetition(medal.competition)
  );
}

function medalScopeLabel(medal: WineMedal): string {
  if (isInternationalMedal(medal)) return "international";
  if (medal.importance === "low") return "local";
  return "national/regional";
}

/** Text scurt pentru context somelier / LLM. Null daca nu exista medalii. */
export function formatWineMedalsForSommelier(
  medals: WineMedal[] | null | undefined,
): string | null {
  const list = normalizeWineMedals(medals);
  if (list.length === 0) return null;

  const international = list.filter(isInternationalMedal);
  const years = new Set(
    list
      .map((entry) => entry.year)
      .filter((year): year is number => year != null),
  );
  const recentMedals = list.filter(
    (entry) => entry.year != null && entry.year >= 2024,
  );

  const summaryParts = [`${list.length} medalii in total`];
  if (international.length > 0) {
    summaryParts.push(`${international.length} internationale`);
  }
  if (years.size >= 2) {
    summaryParts.push(`premiat in ${years.size} ani diferiti`);
  }
  if (recentMedals.length > 0) {
    summaryParts.push(
      `${recentMedals.length} medalii recente (2024-${new Date().getFullYear()})`,
    );
  }

  const details = list
    .map((entry) => {
      const yearPart = entry.year != null ? ` ${entry.year}` : "";
      return `${MEDAL_LABEL[entry.medal]} la ${entry.competition}${yearPart} (${medalScopeLabel(entry)})`;
    })
    .join("; ");

  return `${summaryParts.join("; ")} | Detaliu: ${details}`;
}

export function normalizeMedalLevel(raw: string): WineMedal["medal"] {
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");

  if (normalized.includes("double") && normalized.includes("gold")) {
    return "double_gold";
  }
  if (normalized.includes("best") && normalized.includes("class")) {
    return "best_in_class";
  }
  if (normalized.includes("gold") || normalized.includes("aur")) {
    return "gold";
  }
  if (normalized.includes("silver") || normalized.includes("argint")) {
    return "silver";
  }
  if (normalized.includes("bronze") || normalized.includes("bronz")) {
    return "bronze";
  }
  return "other";
}

export interface RawWineMedalInput {
  year?: number | null;
  competition: string;
  medal: string;
  importance?: "high" | "medium" | "low";
  country?: string;
}

export function normalizeWineMedals(
  medals: (WineMedal | RawWineMedalInput)[] | null | undefined,
): WineMedal[] {
  if (!medals?.length) return [];

  const seen = new Set<string>();
  const normalized: WineMedal[] = [];

  for (const entry of medals) {
    const competition = entry.competition.trim();
    if (!competition) continue;

    const medalLevel = normalizeMedalLevel(entry.medal);
    const key = [
      competition.toLowerCase(),
      entry.year ?? "unknown",
      medalLevel,
    ].join("|");

    if (seen.has(key)) continue;
    seen.add(key);

    const importance =
      entry.importance ??
      (isHighImportanceCompetition(competition) ? "high" : "medium");

    normalized.push({
      year: entry.year ?? null,
      competition,
      medal: medalLevel,
      ...(entry.country?.trim() ? { country: entry.country.trim() } : {}),
      importance,
    });
  }

  return normalized;
}
