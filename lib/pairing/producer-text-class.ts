/**
 * Classify producer text: tasting description vs culinary recommendation.
 */
import {
  isCulinaryChromeText,
  isTastingNoteLeak,
  sanitizeCulinaryText,
} from "@/lib/culinary-extract";
import { categorizeFoodText } from "@/lib/food-taxonomy";
import { foldRomanianText } from "@/lib/pairing/romanian-text";

export type ProducerTextClass =
  | "PRODUCER_DESCRIPTION"
  | "PRODUCER_CULINARY_RECOMMENDATION"
  | "PRODUCER_TECHNICAL_FACT"
  | "OTHER";

export function producerTextClassLabel(value: ProducerTextClass): string {
  if (value === "PRODUCER_CULINARY_RECOMMENDATION") {
    return "Recomandarile producatorului";
  }
  if (value === "PRODUCER_DESCRIPTION") return "Descrierea producatorului";
  if (value === "PRODUCER_TECHNICAL_FACT") return "Fapt tehnic de producator";
  return "Alt text de producator";
}

const CULINARY_CUE_RE =
  /recomand|asocier|pairing|se potriv|acompania|alaturi de|servit cu|ideal (cu|la|pentru)|merge bine|gastronom/i;

const TECHNICAL_CUE_RE =
  /alcool|aciditate|zahar|zaharuri|baric|barrique|invechit|potențial de invechire|potential de invechire|12[,.]?\d?\s*%|13[,.]?\d?\s*%/i;

export function classifyProducerText(text: string | null | undefined): ProducerTextClass {
  const cleaned = sanitizeCulinaryText(text);
  if (!cleaned) return "OTHER";
  if (isCulinaryChromeText(cleaned)) return "OTHER";
  const folded = foldRomanianText(cleaned);
  const foodCats = categorizeFoodText(cleaned).length;
  const tasting =
    isTastingNoteLeak(cleaned) ||
    /gustativ|olfactiv|culoare|nuantele|tanin|scortisoara|lemn|fructe de padure|structura si corp|la nas|pe palat/i.test(
      folded,
    );
  const culinaryCue = CULINARY_CUE_RE.test(folded) || CULINARY_CUE_RE.test(cleaned);
  if (tasting && foodCats <= 1 && !culinaryCue) return "PRODUCER_DESCRIPTION";
  if (culinaryCue && foodCats > 0 && !tasting) return "PRODUCER_CULINARY_RECOMMENDATION";
  if (culinaryCue && foodCats > 0) return "PRODUCER_CULINARY_RECOMMENDATION";
  if (tasting) return "PRODUCER_DESCRIPTION";
  if (TECHNICAL_CUE_RE.test(folded) && foodCats === 0) return "PRODUCER_TECHNICAL_FACT";
  if (foodCats > 0) return "PRODUCER_CULINARY_RECOMMENDATION";
  return "OTHER";
}

export function isProducerCulinaryRecommendation(text: string | null | undefined): boolean {
  return classifyProducerText(text) === "PRODUCER_CULINARY_RECOMMENDATION";
}
