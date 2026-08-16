import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  isPublicationBlockingIssue,
  runIntegrityChecks,
  type IntegrityIssue,
  type WineScanInput,
} from "@/lib/integrity-scan";
import { wines } from "@/lib/schema";

export class PublicationIntegrityError extends Error {
  readonly issues: IntegrityIssue[];

  constructor(issues: IntegrityIssue[]) {
    const codes = issues.map((issue) => issue.code).join(", ");
    super(
      `Publicarea a fost blocata. Vinul ramane in asteptare. Probleme: ${codes}. ${issues
        .map((issue) => issue.message)
        .join(" ")}`,
    );
    this.name = "PublicationIntegrityError";
    this.issues = issues;
  }
}

export function evaluatePublicationGate(issues: IntegrityIssue[]): {
  ok: boolean;
  blocking: IntegrityIssue[];
} {
  const blocking = issues.filter(isPublicationBlockingIssue);
  return { ok: blocking.length === 0, blocking };
}

export async function loadWineScanInput(
  wineId: number,
): Promise<WineScanInput | null> {
  const row = await db.query.wines.findFirst({
    where: eq(wines.id, wineId),
    with: {
      winery: { columns: { name: true } },
      region: { columns: { name: true } },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    wineryId: row.wineryId,
    wineryName: row.winery?.name ?? null,
    regionId: row.regionId,
    regionName: row.region?.name ?? null,
    type: row.type,
    sweetness: row.sweetness,
    vintage: row.vintage,
    grapeVarieties: row.grapeVarieties,
    priceAvg: row.priceAvg,
    currentPrice: row.currentPrice,
    priceHistory: row.priceHistory,
    valueScore: row.valueScore,
    criticScore: row.criticScore,
    ratingAvg: row.ratingAvg,
    communityScore: row.communityScore,
    medals: row.medals,
    status: row.status,
    sourceUrl: row.sourceUrl,
    affiliateLinks: row.affiliateLinks,
    descriptionEditorial: row.descriptionEditorial,
    valueExplanation: row.valueExplanation,
    tasteProfile: row.tasteProfile,
    thingsYouShouldKnow: row.thingsYouShouldKnow,
    foodPairingNotes: row.foodPairingNotes,
    dessertPairings: row.dessertPairings,
    recommendedOccasions: row.recommendedOccasions,
    expertNotes: row.expertNotes,
    tastingNotes: row.tastingNotes,
    producerContent: row.producerContent,
    producerPageUrl: row.producerPageUrl,
    tastingSheetUrl: row.tastingSheetUrl,
    alcohol: row.alcohol,
    acidity: row.acidity,
    sugar: row.sugar,
    cellarPotential: row.cellarPotential,
    drinkabilityStart: row.drinkabilityStart,
    drinkabilityEnd: row.drinkabilityEnd,
    foodPairings: row.foodPairings,
    updatedAt: row.updatedAt,
  };
}

export async function assertWineCanBePublished(wineId: number): Promise<void> {
  const input = await loadWineScanInput(wineId);
  if (!input) {
    throw new Error("Vin negasit.");
  }

  const report = runIntegrityChecks([input]);
  const gate = evaluatePublicationGate(report.issues);
  if (!gate.ok) {
    throw new PublicationIntegrityError(gate.blocking);
  }
}
