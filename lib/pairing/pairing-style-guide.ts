/**
 * Language preferences extracted from the first 30 human-reviewed pairings.
 * Used by draft rationales. Does not invent bottle facts.
 */
export const PAIRING_STYLE_GUIDE = {
  prefer: [
    "se potriveste foarte bine cu",
    "este o alegere foarte buna pentru",
    "merge foarte bine langa",
  ],
  avoid: [
    "asociere editoriala",
    "functioneaza ca un inceput romanesc clar",
    "stil verificat sustine",
    "alcoolul verificat ridicat sustine",
    "zona Chardonnay",
  ],
} as const;

export function styleGuideViolations(text: string): string[] {
  return PAIRING_STYLE_GUIDE.avoid.filter((phrase) =>
    text.toLowerCase().includes(phrase.toLowerCase()),
  );
}
