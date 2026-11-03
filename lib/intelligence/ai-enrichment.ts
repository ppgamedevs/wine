import type {
  AiCostEstimate,
  AiInterpretation,
  ReconciledClaim,
} from "@/lib/intelligence/types";

export const AI_MODEL = "deepseek-chat";
export const AI_PRICING = {
  inputUsdPerMillion: 0.14,
  outputUsdPerMillion: 0.28,
};

export function estimateAiCost(claims: ReconciledClaim[]): AiCostEstimate {
  const material = claims
    .filter((claim) => claim.value != null)
    .map((claim) => `${claim.field}: ${JSON.stringify(claim.value)}`)
    .join("\n");
  const inputTokens = Math.max(1, Math.ceil(material.length / 4) + 220);
  const outputTokens = 420;
  return {
    requestCount: material.length > 0 ? 1 : 0,
    inputTokens,
    outputTokens,
    estimatedCostUsd:
      (inputTokens / 1_000_000) * AI_PRICING.inputUsdPerMillion +
      (outputTokens / 1_000_000) * AI_PRICING.outputUsdPerMillion,
    model: AI_MODEL,
  };
}

export function buildAiInterpretationPrompt(
  wineName: string,
  claims: ReconciledClaim[],
): string {
  const supported = claims
    .filter((claim) => claim.value != null)
    .map(
      (claim) =>
        `- ${claim.field}: ${JSON.stringify(claim.value)} [${claim.verificationStatus}; ${claim.sourceClass ?? "unknown"}]`,
    )
    .join("\n");
  return [
    "You are VinIntel's editorial assistant.",
    `Wine: ${wineName}.`,
    "Write a concise, useful interpretation using ONLY these source-backed claims:",
    supported || "(no supported claims)",
    "Rules: never invent alcohol, awards, vintages, grape percentages, prices or sensory observations.",
    "If a fact is retailer-attributed, say so. Preserve uncertainty and conflicts.",
    "Do not present general grape-variety knowledge as a tasting observation of this bottle.",
    "Return 2-4 short paragraphs in Romanian.",
  ].join("\n");
}

function allowedNumericTokens(claims: ReconciledClaim[]): Set<string> {
  const tokens = new Set<string>();
  for (const claim of claims) {
    if (claim.value == null) continue;
    const values = Array.isArray(claim.value) ? claim.value : [claim.value];
    for (const value of values) {
      const text = typeof value === "object" ? JSON.stringify(value) : String(value);
      for (const match of text.matchAll(/\d+(?:[.,]\d+)?/g)) {
        tokens.add(match[0].replace(",", "."));
      }
    }
  }
  return tokens;
}

export function validateAiInterpretation(
  text: string,
  claims: ReconciledClaim[],
  options: { forbiddenGenericAromas?: string[] } = {},
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const allowed = allowedNumericTokens(claims);
  const supportedSensory = claims
    .filter((claim) => claim.field === "aroma_descriptors" || claim.field === "taste_descriptors")
    .map((claim) => JSON.stringify(claim.value).toLowerCase())
    .join(" ");
  for (const aroma of options.forbiddenGenericAromas ?? []) {
    if (
      text.toLowerCase().includes(aroma.toLowerCase()) &&
      !supportedSensory.includes(aroma.toLowerCase())
    ) {
      reasons.push(`General variety aroma not supported for this bottle: ${aroma}`);
    }
  }
  for (const match of text.matchAll(/\d+(?:[.,]\d+)?/g)) {
    const token = match[0].replace(",", ".");
    if (!allowed.has(token)) {
      reasons.push(`Unsupported numeric value: ${match[0]}`);
    }
  }
  if (/\b(19|20)\d{2}\b/.test(text)) {
    const vintages = new Set(
      claims
        .filter((claim) => claim.field === "vintage")
        .map((claim) => String(claim.value)),
    );
    for (const match of text.matchAll(/\b(19|20)\d{2}\b/g)) {
      if (!vintages.has(match[0])) reasons.push(`Unsupported vintage: ${match[0]}`);
    }
  }
  if (/\b(medalie|gold|silver|bronze|premiu|award)\b/i.test(text)) {
    const hasAward = claims.some(
      (claim) => claim.field === "awards" && claim.value != null,
    );
    if (!hasAward) reasons.push("Unsupported award/medal statement");
  }
  return { valid: reasons.length === 0, reasons: [...new Set(reasons)] };
}

export async function generateAiInterpretation(input: {
  wineName: string;
  claims: ReconciledClaim[];
  generator?: (prompt: string) => Promise<string>;
  forbiddenGenericAromas?: string[];
}): Promise<AiInterpretation | null> {
  if (!input.generator || input.claims.every((claim) => claim.value == null)) {
    return null;
  }
  const estimate = estimateAiCost(input.claims);
  const prompt = buildAiInterpretationPrompt(input.wineName, input.claims);
  const text = (await input.generator(prompt)).trim();
  const validation = validateAiInterpretation(text, input.claims, {
    forbiddenGenericAromas: input.forbiddenGenericAromas,
  });
  if (!validation.valid) {
    throw new Error(`AI interpretation rejected: ${validation.reasons.join("; ")}`);
  }
  return {
    text,
    model: AI_MODEL,
    supportedClaimHashes: input.claims
      .filter((claim) => claim.value != null)
      .flatMap((claim) => claim.claims.map((source) => source.claimHash)),
    inputTokens: estimate.inputTokens,
    outputTokens: estimate.outputTokens,
    estimatedCostUsd: estimate.estimatedCostUsd,
  };
}
