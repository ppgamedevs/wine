import type { VintageEvidenceRecord } from "@/lib/vintage/types";

const SCOPES = new Set([
  "region",
  "appellation",
  "grape_region",
  "winery",
  "wine",
]);

const EVIDENCE_TYPES = new Set([
  "winter_water",
  "spring_frost",
  "flowering",
  "rain_drought",
  "heat",
  "disease_hail",
  "veraison_ripening",
  "harvest_timing_weather",
  "sugar_acidity",
  "phenolic_ripeness",
  "yield_selection",
  "producer_note",
  "critic_review",
  "official_report",
  "maturity_guidance",
]);

const IMPACTS = new Set(["positive", "negative", "mixed", "neutral"]);

export interface VintageEvidenceValidation {
  valid: boolean;
  errors: string[];
  evidence: VintageEvidenceRecord[];
}

export function validateVintageEvidence(
  input: unknown,
): VintageEvidenceValidation {
  if (!Array.isArray(input)) {
    return { valid: false, errors: ["Evidence file must be an array."], evidence: [] };
  }
  const errors: string[] = [];
  const evidence: VintageEvidenceRecord[] = [];
  input.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") {
      errors.push(`[${index}] not an object`);
      return;
    }
    const item = raw as Partial<VintageEvidenceRecord>;
    const itemErrors: string[] = [];
    if (!item.scope || !SCOPES.has(item.scope)) itemErrors.push(`[${index}] invalid scope`);
    if (!item.evidenceType || !EVIDENCE_TYPES.has(item.evidenceType)) {
      itemErrors.push(`[${index}] invalid evidenceType`);
    }
    if (!item.impact || !IMPACTS.has(item.impact)) itemErrors.push(`[${index}] invalid impact`);
    if (!item.sourceUrl || !/^https?:\/\//i.test(item.sourceUrl)) {
      itemErrors.push(`[${index}] sourceUrl must be http(s)`);
    }
    if (!item.sourceTitle?.trim()) itemErrors.push(`[${index}] sourceTitle required`);
    if (!item.publisher?.trim()) itemErrors.push(`[${index}] publisher required`);
    if (!item.excerpt?.trim()) itemErrors.push(`[${index}] excerpt required`);
    if (typeof item.confidence !== "number" || item.confidence < 0 || item.confidence > 1) {
      itemErrors.push(`[${index}] confidence must be 0..1`);
    }
    if (item.vintage != null && (!Number.isInteger(item.vintage) || item.vintage < 1900)) {
      itemErrors.push(`[${index}] vintage must be a year or null`);
    }
    errors.push(...itemErrors);
    if (itemErrors.length === 0) {
      evidence.push({
        ...item,
        scope: item.scope!,
        evidenceType: item.evidenceType!,
        impact: item.impact!,
        sourceUrl: item.sourceUrl!,
        sourceTitle: item.sourceTitle!,
        publisher: item.publisher!,
        excerpt: item.excerpt!,
        publishedAt: item.publishedAt ?? null,
        eventDate: item.eventDate ?? null,
        confidence: item.confidence!,
        producerClaim: item.producerClaim === true,
        independent: item.independent === true,
        regionalException: item.regionalException === true,
        maturity: item.maturity ?? null,
        region: item.region ?? null,
        appellation: item.appellation ?? null,
        grape: item.grape ?? null,
        wineryId: item.wineryId ?? null,
        wineId: item.wineId ?? null,
        familyKey: item.familyKey ?? null,
        vintage: item.vintage ?? null,
      });
    }
  });
  return { valid: errors.length === 0, errors, evidence };
}
