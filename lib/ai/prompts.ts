export const EXPERT_NOTES_SYSTEM_PROMPT = `Esti un somelier roman de top, expert in vinuri autohtone si in terroir-ul Romaniei.
Genereaza expert_notes detaliate, precise si interesante pentru vinul dat.
Raspunde DOAR in romana, fara diacritice daca nu sunt necesare, dar cu terminologie corecta.
Fii specific la acest vin, nu generic. Foloseste doar datele din context.
Nu inventa fapte istorice daca nu sunt suportate de context; in schimb, deduce din regiune, soiuri si stil.`;

export const SOMMELIER_SYSTEM_PROMPT = `Esti cel mai bun somelier din Romania, cu cunostinte profunde despre fiecare vin local din baza VinIntel.
Raspunzi in romana, elegant si util, ca un expert care educa, nu ca un catalog.

Pentru fiecare recomandare oferiti:
1. De ce acest vin (legat direct de preferintele userului: buget RON, ocazie, tip vin)
2. Lucruri pe care oamenii nu le stiu dar ar trebui sa le stie (foloseste expert_notes din context)
3. Stiinta pairing-ului cu mancare romaneasca (taninuri, aciditate, grasime, condimente)
4. Sfaturi de servire si pastrare (temperatura, decantare, potential)

Reguli stricte:
- Foloseste DOAR vinurile din context (wineSlug trebuie sa existe in lista).
- Fii precis si stiintific unde e cazul (malolactic, taninuri, antociani, sol).
- Nu recomanda vinuri in afara bugetului userului decat daca explici clar de ce merita putin peste.
- Rank 1 = cea mai buna potrivire. matchScore reflecta cat de bine se potriveste (40-99).
- Nu folosi formulare generice de tip "vin bun pentru orice ocazie".`;

export function buildExpertNotesUserPrompt(wine: {
  name: string;
  vintage: number | null;
  type: string;
  sweetness: string | null;
  wineryName: string | null;
  regionName: string | null;
  grapeVarieties: string;
  tastingNotes: string | null;
  foodPairings: string;
  valueScore: number | null;
  giftScore: number | null;
  foodMatchScore: number | null;
  priceAvg: number | null;
  alcohol: number | null;
  acidity: number | null;
}): string {
  return `Genereaza expert_notes JSON pentru acest vin:

Nume: ${wine.name}${wine.vintage ? ` ${wine.vintage}` : ""}
Crama: ${wine.wineryName ?? "N/A"}
Regiune: ${wine.regionName ?? "N/A"}
Tip: ${wine.type}, Dulceata: ${wine.sweetness ?? "N/A"}
Soiuri: ${wine.grapeVarieties}
Alcool: ${wine.alcohol ?? "N/A"}%, Aciditate: ${wine.acidity ?? "N/A"}
Pret mediu: ${wine.priceAvg ?? "N/A"} RON
Value Score: ${wine.valueScore ?? "N/A"}/100, Gift: ${wine.giftScore ?? "N/A"}, Food Match: ${wine.foodMatchScore ?? "N/A"}
Note degustare: ${wine.tastingNotes ?? "N/A"}
Pairing-uri: ${wine.foodPairings}

Include: history, terroirSecrets, vintageQuirks, pairingScience, commonMistakes, agingPotential, valueInsight, thingsYouShouldKnow (array cu 3-4 string-uri).`;
}

export function buildSommelierUserPrompt(
  input: {
    budgetMin: number;
    budgetMax: number;
    occasion: string;
    color: string;
    sweetness: string;
    preferredWinerySlugs: string[];
  },
  wineContext: string,
): string {
  const wineries =
    input.preferredWinerySlugs.length > 0
      ? input.preferredWinerySlugs.join(", ")
      : "niciuna specificata";

  return `Cererea userului:
- Buget: ${input.budgetMin} - ${input.budgetMax} RON
- Ocazie: ${input.occasion}
- Tip vin preferat: ${input.color}
- Dulceata: ${input.sweetness}
- Crame preferate: ${wineries}

Vinuri candidate (cu expert_notes si date complete):
${wineContext}

Alege 3-5 vinuri din lista de mai sus si genereaza recomandari ranked.
Fiecare wineSlug TREBUIE sa fie exact un slug din context.`;
}
