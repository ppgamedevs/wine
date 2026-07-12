import { buildWinePriceViewModel } from "@/lib/wine-price";
import { CHAT_SOMMELIER_BASE_PROMPT } from "@/lib/ai/prompts";
import { resolveWineImage } from "@/lib/wine-images";
import { formatWineMedalsForSommelier } from "@/lib/wine-medals";
import { formatProducerContentForSommelier } from "@/lib/producer-page-extract";
import type { ChatWineRecommendation } from "@/lib/sommelier-chat-types";
import { hybridRetrieve } from "@/lib/sommelier-rag";
import {
  type ColorPreference,
  type OccasionId,
  type SommelierInput,
  type SweetnessPreference,
  getOccasion,
} from "@/lib/sommelier";
import type { WineWithRelations } from "@/types";

const DEFAULT_BUDGET_MAX = 300;
const NO_BUDGET_MAX = 9999;

function detectAbsurdFoodRequest(text: string): boolean {
  return /delfin|dolphin|balena|whale|urs polar|foca|foc[aă]|tigru|leu\s*(?:de\s*)?(?:munte|african)|carne\s+de\s+(?:caine|pisic)/i.test(
    text,
  );
}

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function extractUserTexts(messages: { role: string; parts: { type: string; text?: string }[] }[]): string[] {
  return messages
    .filter((message) => message.role === "user")
    .map((message) =>
      message.parts
        .filter((part) => part.type === "text" && part.text)
        .map((part) => part.text ?? "")
        .join(""),
    )
    .filter(Boolean);
}

export function parseChatToSommelierInput(
  latestMessage: string,
  conversationTexts: string[] = [],
): SommelierInput {
  const combined = normalizeText([...conversationTexts, latestMessage].join(" "));

  let budgetMin = 0;
  let budgetMax = DEFAULT_BUDGET_MAX;
  let budgetSpecified = false;

  const subMatch = combined.match(/sub\s*(\d{2,4})\s*(?:de\s*)?lei/);
  if (subMatch) {
    budgetMax = Number.parseInt(subMatch[1] ?? "", 10);
    budgetSpecified = true;
  }

  const maxMatch = combined.match(/(?:maxim|maximum|pana la|max)\s*(\d{2,4})\s*lei/);
  if (maxMatch) {
    budgetMax = Number.parseInt(maxMatch[1] ?? "", 10);
    budgetSpecified = true;
  }

  const rangeMatch = combined.match(/(\d{2,4})\s*[-–]\s*(\d{2,4})\s*lei/);
  if (rangeMatch) {
    budgetMin = Number.parseInt(rangeMatch[1] ?? "", 10);
    budgetMax = Number.parseInt(rangeMatch[2] ?? "", 10);
    budgetSpecified = true;
  }

  const bugetMatch = combined.match(/buget\s*(\d{2,4})\s*lei/);
  if (bugetMatch && !subMatch) {
    budgetMax = Number.parseInt(bugetMatch[1] ?? "", 10);
    budgetSpecified = true;
  }

  if (!budgetSpecified) {
    budgetMax = NO_BUDGET_MAX;
  }

  if (budgetSpecified && budgetMax < 30) budgetMax = 30;
  if (budgetMin > budgetMax) budgetMin = 0;

  let occasion: OccasionId = "oricare";
  if (
    /cozonac|pasca|gogosi|placinta|desert|prajitur|papana|coliva|dulceata/.test(
      combined,
    )
  ) {
    occasion = "pentru-desert";
  } else if (/sarmale|mamaliga|varza/.test(combined)) {
    occasion = "sarmale";
  } else if (/gratar|mititei|mici|bbq/.test(combined)) {
    occasion = "gratar";
  } else if (/nunta|nunti|botez/.test(combined)) {
    occasion = "nunta";
  } else if (/cadou business|partener|client/.test(combined)) {
    occasion = "cadou-business";
  } else if (/cadou|dar|aniversare/.test(combined)) {
    occasion = "cadou";
  } else if (/cina romantica|romantic|in doi/.test(combined)) {
    occasion = "cina-romantica";
  } else if (/petrecere|prieteni|grup/.test(combined)) {
    occasion = "petrecere";
  } else if (/craciun|paste|sarbatori|sarbatoare/.test(combined)) {
    occasion = "sarbatori";
  }

  let color: ColorPreference = "any";
  if (/\brosu\b|\brosii\b|\bred\b/.test(combined)) color = "red";
  else if (/\balb\b|\balbe\b|\bwhite\b/.test(combined)) color = "white";
  else if (/\brose\b|\broze\b/.test(combined)) color = "rose";
  else if (/spumant|prosecco|bule|champagne/.test(combined)) color = "sparkling";

  let sweetness: SweetnessPreference = "any";
  if (/\bdulce\b|\bdemidulce\b/.test(combined)) sweetness = "demidulce";
  else if (/\bdemisec\b/.test(combined)) sweetness = "demisec";
  else if (/\bsec\b/.test(combined)) sweetness = "sec";

  return {
    budgetMin,
    budgetMax,
    budgetSpecified,
    occasion,
    color,
    sweetness,
    preferredWinerySlugs: [],
    absurdRequest: detectAbsurdFoodRequest(combined),
  };
}

export function serializeWineForChat(wine: WineWithRelations): ChatWineRecommendation {
  const pricing = buildWinePriceViewModel(wine);
  const image = resolveWineImage(wine);

  return {
    slug: wine.slug,
    name: wine.name,
    vintage: wine.vintage,
    type: wine.type,
    wineryName: wine.winery?.name ?? null,
    priceRon: pricing.displayPrice ?? wine.currentPrice ?? wine.priceAvg,
    hasAffiliateLink: Boolean(pricing.purchaseLink?.url),
    valueScore: wine.valueScore,
    imageUrl: image.src,
    imageAlt: image.alt,
  };
}

export async function retrieveWinesForChat(
  latestMessage: string,
  conversationTexts: string[],
  limit = 6,
): Promise<{ input: SommelierInput; wines: WineWithRelations[] }> {
  const input = parseChatToSommelierInput(latestMessage, conversationTexts);
  const wines = await hybridRetrieve(input, limit);
  return { input, wines };
}

export function buildChatSommelierSystemPrompt(
  candidates: WineWithRelations[],
  input: SommelierInput,
): string {
  const occasion = getOccasion(input.occasion);
  const catalog = candidates
    .map((wine, index) => {
      const price = wine.currentPrice ?? wine.priceAvg;
      const grapes = wine.grapeVarieties.map((g) => g.name).join(", ");
      const foodNotes = wine.foodPairingNotes
        .slice(0, 2)
        .map((p) => p.dish)
        .join(", ");
      const dessertNotes = wine.dessertPairings
        .slice(0, 3)
        .map((p) => p.dish)
        .join(", ");
      const medalsSummary = formatWineMedalsForSommelier(wine.medals);
      const producerSummary = formatProducerContentForSommelier(
        wine.producerContent,
      );

      return [
        `${index + 1}. slug: ${wine.slug}`,
        `   Nume: ${wine.name}${wine.vintage ? ` ${wine.vintage}` : ""}`,
        `   Crama: ${wine.winery?.name ?? "N/A"} | Regiune: ${wine.region?.name ?? "N/A"}`,
        `   Tip: ${wine.type} | Dulceata: ${wine.sweetness ?? "N/A"}`,
        `   Pret: ${price != null ? `${price} RON` : "indisponibil"}`,
        `   Soiuri: ${grapes || "N/A"}`,
        `   Value ${wine.valueScore ?? "N/A"}/100 | Food Match ${wine.foodMatchScore ?? "N/A"}/100`,
        medalsSummary ? `   Medalii: ${medalsSummary}` : null,
        producerSummary ? `   Producator (site): ${producerSummary}` : null,
        foodNotes ? `   Pairing mancare: ${foodNotes}` : null,
        dessertNotes ? `   Pairing desert: ${dessertNotes}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const budgetLine = input.budgetSpecified
    ? `- Buget explicit de la utilizator: ${input.budgetMin}-${input.budgetMax} RON`
    : `- Buget: nespecificat. NU presupune un buget si NU spune "la bugetul asta". Prioritizeaza Value Score si potrivirea culinara, nu pretul mic.`;

  const absurdLine = input.absurdRequest
    ? `- CERERE ABSURDA/ILEGALA detectata. Refuza pairing-ul cerut (ex. carne de delfin e ilegala). Fii ferm si sarcastic, nu cooperativ. Poti lua usor peste picior stilul userului (parizer, mancare dubioasa), apoi redirectioneaza spre ceva real din Romania. Nu recomanda vin ca si cum cererea ar fi normala.`
    : "";

  return `${CHAT_SOMMELIER_BASE_PROMPT}

Context cerere:
${budgetLine}
- Ocazie detectata: ${occasion.label}
- Tip vin preferat: ${input.color === "any" ? "oricare" : input.color}
- Dulceata preferata: ${input.sweetness === "any" ? "oricare" : input.sweetness}
${absurdLine ? `${absurdLine}\n` : ""}
Catalog vinuri candidate (sursa unica de adevar):
${catalog || "(niciun vin in buget; explica onest si sugereaza sa relaxeze bugetul sau cerinta)"}

Format final obligatoriu (ultima linie, separata):
RECOMMENDED_SLUGS: <slug1>[, <slug2>[, <slug3>]]

Reguli finale:
- Umor uscat da, vulgaritate nu. Nu te lasa pacalit de cereri absurde sau ilegale.
- ${input.budgetSpecified ? "Respecta bugetul mentionat de utilizator." : "Fara buget explicit: recomanda cea mai buna potrivire (Value Score + pairing), nu ce e mai ieftin."}
- Recomanda 1 vin by default. Maxim 3 doar daca userul cere explicit alternative sau comparatie.
- Nu include URL-uri in raspuns (nici Profitshare, nici eMAG).
- Mentioneaza pretul aproximativ in RON in text doar pentru vinurile recomandate.
- RECOMMENDED_SLUGS trebuie sa contina slug-uri EXACTE din catalog, in ordinea recomandarilor (1-3).`;
}

export function buildChatSommelierUserPrompt(
  latestMessage: string,
  conversationTexts: string[],
): string {
  const history =
    conversationTexts.length > 1
      ? `Istoric conversatie:\n${conversationTexts.slice(0, -1).map((t) => `- ${t}`).join("\n")}\n\n`
      : "";

  return `${history}Cererea curenta a utilizatorului: ${latestMessage}`;
}
