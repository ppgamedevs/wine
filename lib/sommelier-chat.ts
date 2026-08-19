import { buildWinePriceViewModel } from "@/lib/wine-price";
import {
  CHAT_SOMMELIER_BASE_PROMPT,
  CHAT_SOMMELIER_BASE_PROMPT_EN,
} from "@/lib/ai/prompts";
import type { AppLocale } from "@/i18n/locale";
import { resolveWineImage } from "@/lib/wine-images";
import { formatWineMedalsForSommelier } from "@/lib/wine-medals";
import { formatProducerContentForSommelier } from "@/lib/producer-page-extract";
import { resolvePublicSecondaryScores } from "@/lib/scoring-v2/public-secondary-display";
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

function normalizeText(text: string, locale: AppLocale): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase(locale === "en" ? "en" : "ro");
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
  locale: AppLocale = "ro",
): SommelierInput {
  const combined = normalizeText(
    [...conversationTexts, latestMessage].join(" "),
    locale,
  );

  let budgetMin = 0;
  let budgetMax = DEFAULT_BUDGET_MAX;
  let budgetSpecified = false;
  let budgetConstraint: SommelierInput["budgetConstraint"] = "none";

  const aroundMatch = combined.match(
    /(?:in jur de|aproximativ|around|about|roughly|vreo)\s*(\d{2,4})\s*(?:de\s*)?(?:lei|ron)/,
  );
  const subMatch = combined.match(
    /(?:sub|under|below)\s*(\d{2,4})\s*(?:de\s*)?(?:lei|ron)/,
  );
  if (subMatch) {
    budgetMax = Number.parseInt(subMatch[1] ?? "", 10);
    budgetSpecified = true;
    budgetConstraint = "hard";
  }

  const maxMatch = combined.match(
    /(?:maxim|maximum|pana la|up to|max)\s*(\d{2,4})\s*(?:lei|ron)/,
  );
  if (maxMatch) {
    budgetMax = Number.parseInt(maxMatch[1] ?? "", 10);
    budgetSpecified = true;
    budgetConstraint = "hard";
  }

  const rangeMatch = combined.match(
    /(\d{2,4})\s*[-\u2013]\s*(\d{2,4})\s*(?:lei|ron)/,
  );
  if (rangeMatch) {
    budgetMin = Number.parseInt(rangeMatch[1] ?? "", 10);
    budgetMax = Number.parseInt(rangeMatch[2] ?? "", 10);
    budgetSpecified = true;
    budgetConstraint = "hard";
  }

  const bugetMatch = combined.match(
    /(?:buget|budget)\s*(?:of\s*)?(\d{2,4})\s*(?:lei|ron)/,
  );
  if (bugetMatch && !subMatch && !maxMatch) {
    budgetMax = Number.parseInt(bugetMatch[1] ?? "", 10);
    budgetSpecified = true;
    budgetConstraint = "approximate";
  }

  if (aroundMatch) {
    budgetMax = Number.parseInt(aroundMatch[1] ?? "", 10);
    budgetSpecified = true;
    budgetConstraint = "approximate";
  }

  if (!budgetSpecified) {
    budgetMax = NO_BUDGET_MAX;
    budgetConstraint = "none";
  }

  if (budgetSpecified && budgetConstraint !== "hard" && budgetMax < 30) {
    budgetMax = 30;
  }
  if (budgetMin > budgetMax) budgetMin = 0;

  let occasion: OccasionId = "oricare";
  if (
    /cozonac|pasca|gogosi|placinta|desert|dessert|cake|prajitur|papana|coliva|dulceata/.test(
      combined,
    )
  ) {
    occasion = "pentru-desert";
  } else if (/sarmale|stuffed cabbage|mamaliga|polenta|varza/.test(combined)) {
    occasion = "sarmale";
  } else if (/gratar|grill|grilled meat|barbecue|mititei|mici|bbq/.test(combined)) {
    occasion = "gratar";
  } else if (/nunta|nunti|botez|wedding/.test(combined)) {
    occasion = "nunta";
  } else if (/cadou business|business gift|partner|partener|client/.test(combined)) {
    occasion = "cadou-business";
  } else if (/cadou|gift|dar|aniversare|birthday/.test(combined)) {
    occasion = "cadou";
  } else if (/cina romantica|romantic dinner|date night|romantic|in doi/.test(combined)) {
    occasion = "cina-romantica";
  } else if (/petrecere|party|friends|prieteni|grup/.test(combined)) {
    occasion = "petrecere";
  } else if (/craciun|christmas|easter|paste|holiday|sarbatori|sarbatoare/.test(combined)) {
    occasion = "sarbatori";
  }

  let color: ColorPreference = "any";
  if (/\brosu\b|\brosii\b|\bred\b/.test(combined)) color = "red";
  else if (/\balb\b|\balbe\b|\bwhite\b/.test(combined)) color = "white";
  else if (/\brose\b|\broze\b/.test(combined)) color = "rose";
  else if (/spumant|prosecco|bule|champagne/.test(combined)) color = "sparkling";

  let sweetness: SweetnessPreference = "any";
  if (/\bdulce\b|\bdemidulce\b|\bsweet\b|\bmedium-sweet\b/.test(combined))
    sweetness = "demidulce";
  else if (/\bdemisec\b|\bmedium-dry\b|\boff-dry\b/.test(combined))
    sweetness = "demisec";
  else if (/\bsec\b|\bdry\b/.test(combined)) sweetness = "sec";

  return {
    budgetMin,
    budgetMax,
    budgetSpecified,
    budgetConstraint,
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
  locale: AppLocale = "ro",
): Promise<{ input: SommelierInput; wines: WineWithRelations[] }> {
  const input = parseChatToSommelierInput(
    latestMessage,
    conversationTexts,
    locale,
  );
  const wines = await hybridRetrieve(input, limit);
  return { input, wines };
}

export function buildChatSommelierSystemPrompt(
  candidates: WineWithRelations[],
  input: SommelierInput,
  locale: AppLocale = "ro",
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
      const secondary = resolvePublicSecondaryScores(wine);
      const publicScoreLine = [
        `Value ${wine.valueScore ?? "N/A"}/100`,
        secondary.gift.score != null
          ? `Gift ${secondary.gift.score}/100`
          : null,
        secondary.food.score != null
          ? `${locale === "en" ? "Food Versatility" : "Versatilitate"} ${secondary.food.score}/100`
          : null,
      ]
        .filter((part): part is string => part != null)
        .join(" | ");

      return locale === "en"
        ? [
            `${index + 1}. slug: ${wine.slug}`,
            `   Name: ${wine.name}`,
            `   Winery: ${wine.winery?.name ?? "N/A"} | Region: ${wine.region?.name ?? "N/A"}`,
            `   Type: ${wine.type}`,
            `   Price: ${price != null ? `${price} RON` : "unavailable"}`,
            `   Grapes: ${grapes || "N/A"}`,
            `   ${publicScoreLine}`,
            medalsSummary ? `   Medals: ${medalsSummary}` : null,
            producerSummary ? `   Producer: ${producerSummary}` : null,
            foodNotes ? `   Food pairings: ${foodNotes}` : null,
            dessertNotes ? `   Dessert pairings: ${dessertNotes}` : null,
          ]
            .filter(Boolean)
            .join("\n")
        : [
        `${index + 1}. slug: ${wine.slug}`,
        `   Nume: ${wine.name}`,
        `   Crama: ${wine.winery?.name ?? "N/A"} | Regiune: ${wine.region?.name ?? "N/A"}`,
        `   Tip: ${wine.type}`,
        `   Pret: ${price != null ? `${price} RON` : "indisponibil"}`,
        `   Soiuri: ${grapes || "N/A"}`,
        `   ${publicScoreLine}`,
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

  if (locale === "en") {
    const englishBudget = input.budgetSpecified
      ? `- Explicit budget: ${input.budgetMin}-${input.budgetMax} RON`
      : "- Budget: not specified. Do not invent one. Prioritize fit and Value Score.";
    return `${CHAT_SOMMELIER_BASE_PROMPT_EN}

Request context:
${englishBudget}
- Detected occasion ID: ${occasion.id}
- Preferred wine type: ${input.color === "any" ? "any" : input.color}
- Preferred sweetness: ${input.sweetness === "any" ? "any" : input.sweetness}

Candidate wine catalog, the only source of truth:
${catalog || "(no matching wine, explain this honestly and suggest relaxing the request)"}

Final rules:
- Respect an explicit budget.
- Recommend one wine by default and at most three when alternatives are requested.
- Mention an approximate RON price only for recommended wines.
- The final RECOMMENDED_SLUGS line must contain exact catalog slugs in recommendation order.`;
  }

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
- Nu afirma alcoolul, aciditatea, zaharul, dulceata sau anul recoltei unui vin; aceste date nu sunt incluse in contextul public verificat.
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
