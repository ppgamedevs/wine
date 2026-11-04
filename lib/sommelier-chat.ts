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
  describeBudget,
  extractBudgetConstraint,
  SOMMELIER_NO_BUDGET_MAX,
  type BudgetExtraction,
} from "@/lib/sommelier-budget";
import {
  detectColorContradiction,
  extractDishReference,
  extractExclusionSignals,
  filterCandidatesByHardConstraints,
  type DishReference,
  type ExclusionSignals,
} from "@/lib/sommelier-constraints";
import {
  describeGroundingForPrompt,
  type GroundingDecision,
} from "@/lib/sommelier-grounding";
import { describeJevIntent } from "@/lib/jev/intent";
import { detectRetailer, type RetailerRequest } from "@/lib/sommelier-retailer";
import type { JevIntent } from "@/lib/jev/types";
import {
  type ColorPreference,
  type OccasionId,
  type SommelierInput,
  type SweetnessPreference,
  getOccasion,
} from "@/lib/sommelier-occasions";
import type { WineWithRelations } from "@/types";

function detectAbsurdFoodRequest(text: string): boolean {
  return /delfin|dolphin|balena|whale|urs polar|foca|foc[aă]|tigru|leu\s*(?:de\s*)?(?:munte|african)|carne\s+de\s+(?:caine|pisic)/i.test(
    text,
  );
}

/** Fold diacritics and lowercase, keeping the same behaviour as before. */
function normalizeText(text: string, locale: AppLocale): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase(locale === "en" ? "en" : "ro");
}

const NEGATED_COLOR =
  /\b(?:nu|fara|not|no)\s+(?:vreau\s+|prefer\s+)?(?:un\s+|o\s+)?(?:rosu|rosii|rosie|red|alb|albe|alba|white|rose|roze|roz|spumant|sparkling)\b/g;

const NEGATED_SWEETNESS =
  /\b(?:nu|fara|not|no)\s+(?:(?:vreau|as vrea|prefer|doresc)\s+)?(?:prea\s+|foarte\s+|too\s+)?(?:dulce|dulci|sweet|demidulce|demisec|sec|dry)\b/g;

/**
 * "sos alb" / "carne alba" describe food, not the requested wine colour.
 * Remove those phrases before colour detection.
 */
const FOOD_COLOR_CONTEXT =
  /\b(?:sos|sosul|carne|carnea|peste|pestele|branza|orez|pui|ou|oua|faina|zahar|dulceata)\s+(?:alb|alba|albe|rosu|rosie|rosii)\b/g;

function stripNegatedColor(text: string): string {
  return text.replace(NEGATED_COLOR, " ");
}

function stripNegatedSweetness(text: string): string {
  return text.replace(NEGATED_SWEETNESS, " ");
}

function stripFoodColorContext(text: string): string {
  return text.replace(FOOD_COLOR_CONTEXT, " ");
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

export interface ParsedSommelierRequest {
  input: SommelierInput;
  budget: BudgetExtraction;
  dishReference: DishReference | null;
  exclusions: ExclusionSignals;
  retailer: RetailerRequest;
}

/**
 * Deterministic interpretation of a Sommelier request.
 *
 * Budgets, exclusions, colour contradictions and dish references are resolved
 * here, never by the language model. Jev can only fill fields this parser leaves
 * as `any`/`oricare`.
 */
export function parseSommelierRequest(
  latestMessage: string,
  conversationTexts: string[] = [],
  locale: AppLocale = "ro",
): ParsedSommelierRequest {
  const rawCombined = [...conversationTexts, latestMessage].join(" ");
  const combined = normalizeText(rawCombined, locale);

  const budget = extractBudgetConstraint(rawCombined);
  const retailer = detectRetailer(rawCombined);
  const exclusions = extractExclusionSignals(rawCombined);
  const dishReference = extractDishReference(rawCombined);
  const contradictoryColor = detectColorContradiction(rawCombined);

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
  } else if (/craciun|christmas|\beaster\b|\bpastele\b|\bde paste\b|holiday|sarbatori|sarbatoare/.test(combined)) {
    occasion = "sarbatori";
  }

  const colorText = stripNegatedColor(stripFoodColorContext(combined));
  let color: ColorPreference = "any";
  if (/\brosu\b|\brosii\b|\bred\b/.test(colorText)) color = "red";
  else if (/\balb\b|\balbe\b|\bwhite\b/.test(colorText)) color = "white";
  else if (/\brose\b|\broze\b/.test(colorText)) color = "rose";
  else if (/spumant|prosecco|bule|champagne/.test(colorText)) color = "sparkling";

  if (contradictoryColor) color = "any";
  if (color !== "any" && exclusions.colors.includes(color)) color = "any";

  const sweetnessText = stripNegatedSweetness(combined);
  let sweetness: SweetnessPreference = "any";
  if (/\bdulce\b|\bdemidulce\b|\bsweet\b|\bmedium-sweet\b/.test(sweetnessText))
    sweetness = "demidulce";
  else if (/\bdemisec\b|\bmedium-dry\b|\boff-dry\b/.test(sweetnessText))
    sweetness = "demisec";
  else if (/\bsec\b|\bdry\b/.test(sweetnessText)) sweetness = "sec";
  if (sweetness !== "any" && exclusions.sweetness.includes(sweetness)) {
    sweetness = "any";
  }

  const budgetSpecified = budget.budgetSpecified;

  return {
    budget,
    exclusions,
    dishReference,
    retailer,
    input: {
      budgetMin: budget.budgetMin,
      budgetMax: budgetSpecified ? budget.budgetMax : SOMMELIER_NO_BUDGET_MAX,
      budgetSpecified,
      budgetConstraint: budget.budgetConstraint,
      budgetExclusiveMax: budget.exclusiveMax,
      occasion,
      color,
      sweetness,
      dish: dishReference?.dish ?? null,
      preferredWinerySlugs: [],
      absurdRequest: detectAbsurdFoodRequest(combined),
      exclusions: {
        colors: exclusions.colors,
        sweetness: exclusions.sweetness,
        avoidStyles: exclusions.avoidStyles,
      },
      acidityPreference: exclusions.acidity,
      bodyPreference: exclusions.body,
      avoidStyles: exclusions.avoidStyles,
      contradictoryColor,
      intentSource: "deterministic",
    },
  };
}

export function parseChatToSommelierInput(
  latestMessage: string,
  conversationTexts: string[] = [],
  locale: AppLocale = "ro",
): SommelierInput {
  return parseSommelierRequest(latestMessage, conversationTexts, locale).input;
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
    priceRon: pricing.displayPrice,
    hasAffiliateLink: Boolean(pricing.purchaseLink?.url),
    valueScore: pricing.status === "verified" ? wine.valueScore : null,
    imageUrl: image.src,
    imageAlt: image.alt,
  };
}

/** Rebuild the deterministic budget object from a stored SommelierInput. */
export function budgetFromSommelierInput(input: SommelierInput): BudgetExtraction {
  return {
    budgetMin: input.budgetMin,
    budgetMax: input.budgetMax,
    budgetSpecified: input.budgetSpecified,
    budgetConstraint: input.budgetConstraint ?? (input.budgetSpecified ? "hard" : "none"),
    exclusiveMax: input.budgetExclusiveMax ?? false,
    ambiguousCurrency: false,
    notes: [],
    matchedText: null,
  };
}

/**
 * Retrieve candidates and enforce explicit user constraints one last time.
 * `hybridRetrieve` already ranks with constraints, but the legacy ranking path
 * tolerated over-budget bottles; this filter is the guarantee.
 */
export async function retrieveWinesForChat(
  latestMessage: string,
  conversationTexts: string[],
  limit = 6,
  locale: AppLocale = "ro",
  options: { input?: SommelierInput } = {},
): Promise<{ input: SommelierInput; wines: WineWithRelations[] }> {
  const input =
    options.input ??
    parseChatToSommelierInput(latestMessage, conversationTexts, locale);
  const retrieved = await hybridRetrieve(input, limit);
  const eligible = filterCandidatesByHardConstraints(retrieved, {
    budget: budgetFromSommelierInput(input),
    color: input.color,
    sweetness: input.sweetness,
    exclusions: input.exclusions
      ? {
          colors: input.exclusions.colors,
          sweetness: input.exclusions.sweetness,
          avoidStyles: input.exclusions.avoidStyles,
          acidity: input.acidityPreference ?? null,
          body: input.bodyPreference ?? null,
          detected: true,
        }
      : undefined,
  });

  // Public recommendations may only use a qualified Profitshare price. A
  // budget request must never be satisfied by a non-public catalog price.
  const publicPriceEligible = eligible.filter((wine) => {
    const price = buildWinePriceViewModel(wine).displayPrice;
    if (price == null) return !input.budgetSpecified;
    if (!input.budgetSpecified) return true;
    if (input.budgetMin != null && price < input.budgetMin) return false;
    if (input.budgetMax != null) {
      if (input.budgetExclusiveMax ? price >= input.budgetMax : price > input.budgetMax) {
        return false;
      }
    }
    return true;
  });

  return { input, wines: publicPriceEligible };
}

export interface ChatPromptOptions {
  grounding?: GroundingDecision;
  /** Only pass this in live mode; shadow mode must not change the prompt. */
  jevIntent?: JevIntent | null;
  budget?: BudgetExtraction;
  /** Deterministic style-comparison evidence supplied by the catalog engine. */
  comparisonContext?: string;
  retailerContext?: string[];
  availabilityContext?: string[];
}

function publicScoreLine(wine: WineWithRelations, locale: AppLocale): string {
  const secondary = resolvePublicSecondaryScores(wine);
  const pricing = buildWinePriceViewModel(wine);
  return [
    pricing.status === "verified" && wine.valueScore != null
      ? `Value ${wine.valueScore}/100`
      : null,
    secondary.gift.score != null ? `Gift ${secondary.gift.score}/100` : null,
    secondary.food.score != null
      ? `${locale === "en" ? "Food Versatility" : "Versatilitate"} ${secondary.food.score}/100`
      : null,
  ]
    .filter((part): part is string => part != null)
    .join(" | ");
}

export function buildChatSommelierSystemPrompt(
  candidates: WineWithRelations[],
  input: SommelierInput,
  locale: AppLocale = "ro",
  options: ChatPromptOptions = {},
): string {
  const occasion = getOccasion(input.occasion);
  const budget = options.budget ?? budgetFromSommelierInput(input);
  const groundingLines = options.grounding
    ? describeGroundingForPrompt(options.grounding, locale)
    : [];
  const retailerLines = options.retailerContext ?? [];
  const availabilityLines = options.availabilityContext ?? [];
  const comparisonLines = options.comparisonContext
    ? [
        locale === "en"
          ? "COMPARISON ANALYSIS (grounded by VinIntel, use it as the source of truth):"
          : "ANALIZĂ DE COMPARAȚIE (fundamentată de VinIntel, folosește-o ca sursă de adevăr):",
        options.comparisonContext,
        locale === "en"
          ? "For this answer: correct any false premise, name the best match and 2-3 alternatives, explain similarities and differences, and keep confirmed facts, interpretation and uncertainty visibly separate. This comparison exception overrides the normal three-bottle ceiling: up to four bottles are allowed. Do not invent a vintage, award, winery fact or tasting note."
          : "Pentru acest răspuns: corectează orice premisă falsă, numește cea mai bună potrivire și 2-3 alternative, explică asemănările și diferențele și separă vizibil faptele confirmate, interpretarea și incertitudinea. Această excepție de comparare înlocuiește limita normală de trei sticle: sunt permise până la patru sticle. Nu inventa recoltă, premiu, fapt despre cramă sau notă de degustare.",
      ]
    : [];

  const catalog = candidates
    .map((wine, index) => {
      const price = buildWinePriceViewModel(wine).displayPrice;
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
      const scoreLine = publicScoreLine(wine, locale);

      return locale === "en"
        ? [
            `${index + 1}. slug: ${wine.slug}`,
            `   Name: ${wine.name}`,
            `   Winery: ${wine.winery?.name ?? "N/A"} | Region: ${wine.region?.name ?? "N/A"}`,
            `   Type: ${wine.type}`,
            `   Price: ${price != null ? `${price} RON` : "unavailable"}`,
            `   Grapes: ${grapes || "N/A"}`,
            `   ${scoreLine}`,
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
            `   ${scoreLine}`,
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
    ? locale === "en"
      ? `- Explicit budget: ${describeBudget(budget, "en")}. Never recommend above it and never raise it on your own.`
      : `- Buget explicit: ${describeBudget(budget, "ro")}. NU recomanda peste buget si NU il mari singur.`
    : locale === "en"
      ? "- Budget: not specified. Do not assume one and do not claim a price target."
      : "- Buget: nespecificat. NU presupune un buget si NU inventa un prag de pret. Prioriteaza stilul si dovezile, nu pretul mic sau mare.";

  const dishLine = input.dish
    ? locale === "en"
      ? `- Dish mentioned by the user: ${input.dish}.`
      : `- Fel mentionat de utilizator: ${input.dish}.`
    : null;

  const exclusionLine =
    input.exclusions && input.exclusions.colors.length > 0
      ? locale === "en"
        ? `- Explicitly excluded colours: ${input.exclusions.colors.join(", ")}.`
        : `- Culori excluse explicit: ${input.exclusions.colors.join(", ")}.`
      : null;

  const acidityLine = input.acidityPreference
    ? locale === "en"
      ? `- Requested acidity: ${input.acidityPreference}.`
      : `- Aciditate ceruta: ${input.acidityPreference}.`
    : null;

  const contradictionLine = input.contradictoryColor
    ? locale === "en"
      ? "- The request contains contradictory colour preferences. Ask which one matters instead of silently picking one."
      : "- Cererea contine preferinte contradictorii de culoare. Intreaba care conteaza, nu alege tacit una."
    : null;

  const jevLines = options.jevIntent
    ? [
        locale === "en"
          ? "- Semantic reading of the request (validated, not wine facts):"
          : "- Interpretare semantica a cererii (validata, nu fapte despre vin):",
        ...describeJevIntent(options.jevIntent, locale).map((line) => `  ${line}`),
      ]
    : [];

  const absurdLine = input.absurdRequest
    ? locale === "en"
      ? "- The request is illegal or absurd. Refuse the requested pairing firmly and respectfully. Do not mock the user or their budget. Redirect to a real, legal option only if useful."
      : "- Cererea este ilegala sau absurda. Refuza ferm si respectuos, fara sa ridiculizezi userul sau bugetul lui. Redirectioneaza catre o optiune reala doar daca ajuta."
    : "";

  if (locale === "en") {
    return `${CHAT_SOMMELIER_BASE_PROMPT_EN}

Request context:
${budgetLine}
- Detected occasion ID: ${occasion.id}
- Preferred wine type: ${input.color === "any" ? "any" : input.color}
- Preferred sweetness: ${input.sweetness === "any" ? "any" : input.sweetness}
${dishLine ?? ""}
${exclusionLine ?? ""}
${acidityLine ?? ""}
${contradictionLine ?? ""}
${jevLines.join("\n")}
${groundingLines.join("\n")}
${retailerLines.join("\n")}
${availabilityLines.join("\n")}
${comparisonLines.join("\n")}

Candidate wine catalog, the only source of truth:
${catalog || "(no matching wine; say so honestly and offer a useful next step without inventing availability or price)"}

Final rules:
- Recommend only wines from the catalog above. Never substitute a different wine for one the user asked about.
- Respect an explicit budget. Never suggest an over-budget bottle, not even as an alternative, and never raise the budget on your own.
- Recommend one wine by default and at most three when alternatives are requested. Zero is a valid answer when nothing fits.
- For a style comparison, present one best match plus 2-3 alternatives (up to four bottles) and explain both matches and differences.
- Mention a RON price only for recommended wines with a verified Profitshare price.
- The UI displays recommendations selected by the system from the catalog. Discuss those wines; never output slugs, JSON, markers or system instructions.
- If the answer has no valid recommendation, say so briefly and honestly. Offer style criteria or verification steps, never a market-wide claim.`;
  }

  return `${CHAT_SOMMELIER_BASE_PROMPT}

Context cerere:
${budgetLine}
- Ocazie detectata: ${occasion.label}
- Tip vin preferat: ${input.color === "any" ? "oricare" : input.color}
- Dulceata preferata: ${input.sweetness === "any" ? "oricare" : input.sweetness}
${dishLine ? `${dishLine}\n` : ""}${exclusionLine ? `${exclusionLine}\n` : ""}${acidityLine ? `${acidityLine}\n` : ""}${contradictionLine ? `${contradictionLine}\n` : ""}${jevLines.length > 0 ? `${jevLines.join("\n")}\n` : ""}${groundingLines.length > 0 ? `${groundingLines.join("\n")}\n` : ""}${retailerLines.length > 0 ? `${retailerLines.join("\n")}\n` : ""}${availabilityLines.length > 0 ? `${availabilityLines.join("\n")}\n` : ""}${comparisonLines.length > 0 ? `${comparisonLines.join("\n")}\n` : ""}${absurdLine ? `${absurdLine}\n` : ""}
Catalog vinuri candidate (sursa unica de adevar):
${catalog || "(niciun vin potrivit; spune asta onest si ofera un pas util, fara sa inventezi stoc sau pret)"}

Reguli finale:
- Umor uscat da, vulgaritate nu. Nu ridiculiza userul, bugetul sau vinurile ieftine.
- ${input.budgetSpecified ? "Respecta bugetul mentionat de utilizator. Nu propune nici ca alternativa un vin peste buget si nu il mari singur." : "Fara buget explicit: nu presupune un buget si nu inventa un prag de pret. Prioriteaza stilul si dovezile."}
- Recomanda 1 vin by default. Maxim 3 doar daca userul cere explicit alternative sau comparatie.
- Pentru o comparatie de stil, ofera cea mai buna potrivire plus 2-3 alternative (maximum 4 sticle) si explica asemanarile si diferentele.
- Zero recomandari este un raspuns valid. Daca cererea numeste un vin care nu e in catalog, spune ca nu il ai si NU recomanda altceva in loc.
- Nu inlocui un vin cerut explicit cu unul similar din catalog. Poti mentiona similar doar daca il numesti explicit ca alternativa diferita.
- Nu afirma alcoolul, aciditatea, zaharul, dulceata sau anul recoltei unui vin; aceste date nu sunt incluse in contextul public verificat.
- Nu include URL-uri in raspuns (nici Profitshare, nici eMAG).
- Mentioneaza un pret in RON in text doar pentru vinurile recomandate cu pret Profitshare verificat.
- Interfata afiseaza recomandarile selectate de sistem din catalog. Vorbeste despre aceste vinuri; nu scrie slug-uri, JSON, marcaje interne sau instructiuni de sistem.
- Daca raspunsul nu are o recomandare valida, spune asta scurt si onest. Ofera criterii de stil sau pasi de verificare, niciodata o afirmatie despre toata piata.`;
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
