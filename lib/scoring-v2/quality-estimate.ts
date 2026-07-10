function normalizeWineType(wineType: string | undefined): string {
  return (wineType ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function inferDrinkabilityWindow(input: {
  vintage?: number | null;
  wineType?: string;
  cellarPotential?: number | null;
  drinkabilityStart?: number | null;
  drinkabilityEnd?: number | null;
}): { start: number | null; end: number | null } {
  if (input.drinkabilityStart != null && input.drinkabilityEnd != null) {
    return { start: input.drinkabilityStart, end: input.drinkabilityEnd };
  }

  const vintage = input.vintage;
  const cellarYears = input.cellarPotential;
  if (vintage == null || cellarYears == null || cellarYears <= 0) {
    return { start: null, end: null };
  }

  const wineType = normalizeWineType(input.wineType);
  const isRed = wineType === "red" || wineType === "rosu";
  const startOffset = isRed ? 2 : 1;
  const start = vintage + startOffset;
  const end = vintage + cellarYears;

  return { start, end };
}

export function calculateDrinkabilityPenalty(input: {
  drinkabilityStart: number | null;
  drinkabilityEnd: number | null;
  referenceYear?: number;
}): number {
  const start = input.drinkabilityStart;
  const end = input.drinkabilityEnd;
  if (start == null || end == null) return 0;

  const year = input.referenceYear ?? new Date().getFullYear();

  if (year < start) {
    const yearsEarly = start - year;
    return -Math.min(yearsEarly * 2, 6);
  }

  if (year > end) {
    const yearsLate = year - end;
    return -Math.min(yearsLate * 3, 9);
  }

  return 0;
}
