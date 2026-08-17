/**
 * Clean producer evidence for admin/public display.
 * Raw claims stay in storage. Display is grouped and dechromed.
 */
import {
  isCulinaryChromeText,
  isTastingNoteLeak,
  sanitizeCulinaryText,
} from "@/lib/culinary-extract";
import { foldRomanianText } from "@/lib/pairing/romanian-text";
import {
  classifyProducerText,
  producerTextClassLabel,
  type ProducerTextClass,
} from "@/lib/pairing/producer-text-class";

export interface ProducerEvidenceDisplayItem {
  excerpt: string;
  sourceUrl: string | null;
  dishes: string[];
  categories: string[];
  textClass: ProducerTextClass;
  textClassLabel: string;
}

export interface ProducerClaimDisplayInput {
  dish: string;
  category: string;
  excerpt: string;
  sourceUrl?: string | null;
}

export function uniqueProducerExcerpts(
  claims: ProducerClaimDisplayInput[],
): ProducerEvidenceDisplayItem[] {
  const groups = new Map<string, ProducerEvidenceDisplayItem>();
  for (const claim of claims) {
    const excerpt = sanitizeCulinaryText(claim.excerpt);
    if (!excerpt) continue;
    if (isCulinaryChromeText(excerpt)) continue;
    const key = `${claim.sourceUrl ?? ""}::${foldRomanianText(excerpt)}`;
    const current = groups.get(key);
    if (current) {
      if (!current.dishes.includes(claim.dish)) current.dishes.push(claim.dish);
      if (!current.categories.includes(claim.category)) {
        current.categories.push(claim.category);
      }
      continue;
    }
    const textClass = classifyProducerText(excerpt);
    groups.set(key, {
      excerpt,
      sourceUrl: claim.sourceUrl ?? null,
      dishes: [claim.dish],
      categories: [claim.category],
      textClass,
      textClassLabel: producerTextClassLabel(textClass),
    });
  }
  return [...groups.values()].filter(
    (item) =>
      item.textClass === "PRODUCER_CULINARY_RECOMMENDATION" ||
      (!isTastingNoteLeak(item.excerpt) && item.textClass !== "OTHER"),
  );
}

export function displayProducerCulinary(text: string | null | undefined): {
  text: string;
  textClass: ProducerTextClass;
  textClassLabel: string;
} {
  const cleaned = sanitizeCulinaryText(text);
  const textClass = classifyProducerText(cleaned);
  return {
    text: textClass === "PRODUCER_CULINARY_RECOMMENDATION" ? cleaned : "",
    textClass,
    textClassLabel: producerTextClassLabel(textClass),
  };
}
