import { looksLikeInferredCellarPotential } from "@/lib/editorial-claim-validator";
import type { ProducerPageContent } from "@/lib/schema";

export interface CellarDisplayInput {
  type?: string | null;
  price?: number | null;
  cellarPotential?: number | null;
  drinkabilityStart?: number | null;
  drinkabilityEnd?: number | null;
  producerContent?: ProducerPageContent | null;
}

export type CellarDisplayKind = "verified" | "estimate" | "none";

export interface CellarDisplay {
  kind: CellarDisplayKind;
  label: string;
  value: string;
}

export function hasExplicitAgeingEvidence(input: CellarDisplayInput): boolean {
  return (
    input.producerContent?.facts?.cellarPotentialYears != null ||
    (input.drinkabilityStart != null && input.drinkabilityEnd != null)
  );
}

export function resolveCellarDisplay(input: CellarDisplayInput): CellarDisplay | null {
  if (input.cellarPotential == null) return null;

  if (hasExplicitAgeingEvidence(input)) {
    return {
      kind: "verified",
      label: "Potential invechire",
      value: `pana la ${input.cellarPotential} ani`,
    };
  }

  if (
    looksLikeInferredCellarPotential({
      type: input.type,
      price: input.price,
      cellarPotential: input.cellarPotential,
      drinkabilityStart: input.drinkabilityStart,
      drinkabilityEnd: input.drinkabilityEnd,
    })
  ) {
    return {
      kind: "estimate",
      label: "Pastrare (estimare VinIntel)",
      value: `orientare generala, pana la ${input.cellarPotential} ani`,
    };
  }

  return {
    kind: "estimate",
    label: "Pastrare (estimare VinIntel)",
    value: `orientare generala, pana la ${input.cellarPotential} ani`,
  };
}
