import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { DEFAULT_WINE_SOURCE_BADGE, wines } from "@/lib/schema";
import {
  extractAndSaveWineImageIfMissing,
  generateAndApplyFullEditorialIfMissing,
} from "@/lib/wine-enrichment";
import { sendWineApprovalEmail } from "@/lib/wine-approval-email";
import { addNewsletterSubscriber } from "@/lib/subscribers";
import {
  markWineSubmissionNotificationsSent,
  resolveWineSubmittedEmail,
} from "@/lib/wine-submitter-email";
import { scheduleIndexNowWine } from "@/lib/indexnow";
import { assertWineCanBePublished } from "@/lib/publication-integrity";
import { matchDishPairingSlug } from "@/lib/dish-pairing-pages";
import { slugify } from "@/lib/wine-url";

export interface ApproveCommunityWineResult {
  slug: string;
  imageExtracted: boolean;
  editorialGenerated: boolean;
  emailSent: boolean;
  emailSkippedReason?: string;
  subscriberAdded: boolean;
}

export async function approveCommunityWine(
  wineId: number,
): Promise<ApproveCommunityWineResult> {
  const wine = await db.query.wines.findFirst({
    where: eq(wines.id, wineId),
    columns: { id: true, slug: true, status: true },
  });

  if (!wine) {
    throw new Error("Vin negasit.");
  }

  if (wine.status !== "user_submitted") {
    throw new Error("Doar vinurile in asteptare pot fi aprobate.");
  }

  const imageExtracted = await extractAndSaveWineImageIfMissing(wineId);
  const editorialGenerated = await generateAndApplyFullEditorialIfMissing(wineId);

  await assertWineCanBePublished(wineId);

  await db
    .update(wines)
    .set({
      status: "verified",
      sourceBadge: DEFAULT_WINE_SOURCE_BADGE,
    })
    .where(eq(wines.id, wineId));

  const wineForEmail = await db.query.wines.findFirst({
    where: eq(wines.id, wineId),
    with: { winery: true, region: true },
  });

  if (!wineForEmail) {
    throw new Error("Vin aprobat dar nu a putut fi reincarcat.");
  }

  const submittedEmail = await resolveWineSubmittedEmail(wineId);
  let emailSent = false;
  let emailSkippedReason: string | undefined;
  let subscriberAdded = false;

  if (submittedEmail) {
    const emailResult = await sendWineApprovalEmail(
      {
        id: wineForEmail.id,
        name: wineForEmail.name,
        slug: wineForEmail.slug,
        vintage: wineForEmail.vintage,
        type: wineForEmail.type,
        sweetness: wineForEmail.sweetness,
        priceAvg: wineForEmail.priceAvg,
        currentPrice: wineForEmail.currentPrice,
        valueScore: wineForEmail.valueScore,
        descriptionEditorial: wineForEmail.descriptionEditorial,
        tasteProfile: wineForEmail.tasteProfile,
        sourceUrl: wineForEmail.sourceUrl,
        grapeVarieties: wineForEmail.grapeVarieties,
        affiliateLinks: wineForEmail.affiliateLinks,
        availability: wineForEmail.availability,
        winery: wineForEmail.winery,
        region: wineForEmail.region,
      },
      submittedEmail,
    );

    emailSent = emailResult.sent;
    emailSkippedReason = emailResult.skippedReason;

    if (emailResult.sent) {
      await markWineSubmissionNotificationsSent(wineId);
    }

    const subscriberResult = await addNewsletterSubscriber(
      submittedEmail,
      "wine_approval",
    );
    subscriberAdded = subscriberResult.added;
  } else {
    emailSkippedReason = "missing_submitted_email";
  }

  scheduleIndexNowWine(wineForEmail.slug, {
    winerySlug: wineForEmail.winery?.slug ?? null,
    regionSlug: wineForEmail.region?.slug ?? null,
    grapeSlugs: (wineForEmail.grapeVarieties ?? []).map((g) =>
      g.slug ?? slugify(g.name),
    ),
    dishSlugs: (wineForEmail.foodPairings ?? [])
      .map((p) => matchDishPairingSlug(p.dish))
      .filter((slug): slug is string => Boolean(slug)),
  });

  return {
    slug: wine.slug,
    imageExtracted,
    editorialGenerated,
    emailSent,
    emailSkippedReason,
    subscriberAdded,
  };
}
