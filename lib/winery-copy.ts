function normalizeWineryNamePrefix(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/** True when the winery name already includes the word "Crama" (e.g. Crama Gabai). */
export function wineryNameStartsWithCrama(name: string): boolean {
  return normalizeWineryNamePrefix(name).startsWith("crama ");
}

export function wineryWinesHeading(name: string): string {
  return wineryNameStartsWithCrama(name)
    ? `Vinurile ${name}`
    : `Vinurile cramei ${name}`;
}

export function wineryRepresentativeQuestion(name: string): string {
  return wineryNameStartsWithCrama(name)
    ? `Reprezinți ${name}?`
    : `Reprezinți crama ${name}?`;
}

export const CLAIM_WINERY_BUTTON_LABEL = "Revendică profilul cramei";

export function wineryLocationQuestion(name: string): string {
  return wineryNameStartsWithCrama(name)
    ? `Unde se afla ${name}?`
    : `Unde se afla crama ${name}?`;
}

export function viewWineryAriaLabel(name: string): string {
  return wineryNameStartsWithCrama(name)
    ? `Vezi ${name}`
    : `Vezi crama ${name}`;
}

export function wineryRepresentativeLead(name: string): string {
  return wineryNameStartsWithCrama(name)
    ? `Ești reprezentant al ${name}?`
    : `Ești reprezentant al cramei ${name}?`;
}

export function wineryVerificationContactPhrase(name: string): string {
  return wineryNameStartsWithCrama(name)
    ? `verificarea ${name}`
    : `verificarea cramei ${name}`;
}
