"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  clearAdminSession,
  requireAdmin,
  setAdminSession,
  verifyAdminSecret,
} from "@/lib/admin-auth";
import { reanalyzeAndUpdateWine } from "@/lib/analyze-wine-service";
import { approveCommunityWine } from "@/lib/approve-wine-service";
import { db } from "@/lib/db";
import {
  hasMinimumFactualDataForEditorial,
  loadWineForEditorial,
  regenerateWineEditorialContent,
} from "@/lib/regenerate-wine-editorial";
import {
  wineReports,
  wineries,
  wines,
} from "@/lib/schema";
import { redirect } from "next/navigation";
import { scheduleIndexNowWine, scheduleIndexNowWinery } from "@/lib/indexnow";
import { recordScoreOverride, recordScoreSnapshot } from "@/lib/score-history";
import { VALUE_SCORE_ALGORITHM_VERSION } from "@/lib/scoring";
import type { FoodCategoryId } from "@/lib/food-taxonomy";

/**
 * "admin" e singurul identificator disponibil azi: autentificarea foloseste
 * o parola partajata (vezi lib/admin-auth.ts), nu conturi individuale.
 * Documentat ca limitare in raportul final.
 */
const ADMIN_CHANGED_BY = "admin";

const updateWineSchema = z.object({
  wineId: z.number().int().positive(),
  descriptionEditorial: z.string().optional(),
  valueExplanation: z.string().optional(),
  tasteProfile: z.string().optional(),
  valueScore: z.coerce.number().int().min(1).max(100).optional(),
  giftScore: z.coerce.number().int().min(1).max(100).optional(),
  foodMatchScore: z.coerce.number().int().min(1).max(100).optional(),
  thingsYouShouldKnow: z.string().optional(),
  /**
   * Obligatoriu doar cand se modifica manual un scor (valueScore/giftScore/
   * foodMatchScore). Cerinta de business: niciun override de scor nu poate
   * fi silentios - trebuie sa aiba un motiv explicit, auditat.
   */
  overrideReason: z.string().optional(),
});

const updateWineryPremiumSchema = z.object({
  wineryId: z.number().int().positive(),
  isPremium: z.coerce.boolean(),
  customBannerUrl: z.string().optional(),
  customStory: z.string().optional(),
  analyticsEnabled: z.coerce.boolean().optional(),
  leadCaptureEnabled: z.coerce.boolean().optional(),
  featuredPlacement: z.coerce.boolean().optional(),
});

function revalidateAdmin() {
  revalidatePath("/admin/wines");
  revalidatePath("/admin/wineries");
  revalidatePath("/admin/pairing-curation");
}

function revalidateWine(slug: string) {
  revalidatePath(`/wines/${slug}`);
  revalidatePath(`/vinuri/${slug}`);
}

function revalidateWinery(slug: string) {
  revalidatePath(`/wineries/${slug}`);
  revalidatePath(`/crame/${slug}`);
  revalidatePath("/crame");
}

async function assertAdmin() {
  await requireAdmin();
}

export async function adminLoginAction(
  secret: string,
): Promise<{ ok: false; error: string } | void> {
  if (!verifyAdminSecret(secret)) {
    return { ok: false as const, error: "Parola admin incorecta." };
  }
  await setAdminSession();
  redirect("/admin/wines");
}

export async function adminLogoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function approveWineAction(wineId: number) {
  await assertAdmin();

  try {
    const result = await approveCommunityWine(wineId);
    revalidateWine(result.slug);
    revalidateAdmin();

    const parts = [
      "Vin aprobat si marcat ca verificat.",
      result.imageExtracted ? "Poza extrasa din sursa." : null,
      result.editorialGenerated
        ? "Editorial si scoruri generate."
        : "Editorial si scoruri deja existente.",
      result.emailSent
        ? "Email trimis catre utilizator."
        : result.emailSkippedReason === "missing_submitted_email"
          ? "Email ne trimis: lipseste submittedEmail."
          : result.emailSkippedReason
            ? `Email ne trimis: ${result.emailSkippedReason}.`
            : null,
      result.subscriberAdded ? "Email adaugat in newsletter." : null,
    ].filter(Boolean);

    return {
      ok: true as const,
      message: parts.join(" "),
    };
  } catch (error) {
    console.error("[admin approve]", error);
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Aprobarea a esuat. Incearca din nou.",
    };
  }
}

export async function rejectWineAction(wineId: number) {
  await assertAdmin();
  await db
    .update(wines)
    .set({ status: "rejected" })
    .where(eq(wines.id, wineId));
  revalidateAdmin();
  return { ok: true as const };
}

export async function updateWineImageAction(wineId: number, imageUrl: string) {
  await assertAdmin();
  const trimmed = imageUrl.trim();
  if (!trimmed) {
    return { ok: false as const, error: "URL imagine invalid." };
  }
  try {
    new URL(trimmed);
  } catch {
    return { ok: false as const, error: "URL imagine invalid." };
  }
  await db
    .update(wines)
    .set({ imageUrl: trimmed, imageSource: "manual" })
    .where(eq(wines.id, wineId));

  const wine = await db.query.wines.findFirst({
    where: eq(wines.id, wineId),
    columns: { slug: true },
    with: { winery: { columns: { slug: true } } },
  });
  if (wine?.slug) {
    revalidateWine(wine.slug);
    scheduleIndexNowWine(wine.slug, wine.winery?.slug ?? null);
  }

  revalidateAdmin();
  return { ok: true as const };
}

export async function updateWineEditorialAction(
  input: z.infer<typeof updateWineSchema>,
) {
  await assertAdmin();
  const parsed = updateWineSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Date invalide." };
  }

  const existing = await db.query.wines.findFirst({
    where: eq(wines.id, parsed.data.wineId),
    columns: {
      valueScore: true,
      giftScore: true,
      foodMatchScore: true,
      overpricedRisk: true,
      priceAvg: true,
      currentPrice: true,
    },
  });
  if (!existing) {
    return { ok: false as const, error: "Vin negasit." };
  }

  const scoreFieldsChanged =
    (parsed.data.valueScore != null &&
      parsed.data.valueScore !== existing.valueScore) ||
    (parsed.data.giftScore != null &&
      parsed.data.giftScore !== existing.giftScore) ||
    (parsed.data.foodMatchScore != null &&
      parsed.data.foodMatchScore !== existing.foodMatchScore);

  if (scoreFieldsChanged && !parsed.data.overrideReason?.trim()) {
    return {
      ok: false as const,
      error:
        "Modificarea manuala a unui scor necesita un motiv (audit override).",
    };
  }

  const things = parsed.data.thingsYouShouldKnow
    ? parsed.data.thingsYouShouldKnow
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : undefined;

  await db
    .update(wines)
    .set({
      descriptionEditorial: parsed.data.descriptionEditorial || null,
      valueExplanation: parsed.data.valueExplanation || null,
      tasteProfile: parsed.data.tasteProfile || null,
      valueScore: parsed.data.valueScore,
      giftScore: parsed.data.giftScore,
      foodMatchScore: parsed.data.foodMatchScore,
      ...(things ? { thingsYouShouldKnow: things } : {}),
    })
    .where(eq(wines.id, parsed.data.wineId));

  if (scoreFieldsChanged) {
    const reason = parsed.data.overrideReason!.trim();
    const overrideEntries: Array<[
      "valueScore" | "giftScore" | "foodMatchScore",
      number | null,
      number | undefined,
    ]> = [
      ["valueScore", existing.valueScore, parsed.data.valueScore],
      ["giftScore", existing.giftScore, parsed.data.giftScore],
      ["foodMatchScore", existing.foodMatchScore, parsed.data.foodMatchScore],
    ];

    for (const [field, previousValue, newValue] of overrideEntries) {
      if (newValue == null || newValue === previousValue) continue;
      await recordScoreOverride({
        wineId: parsed.data.wineId,
        field,
        previousValue,
        newValue,
        reason,
        changedBy: ADMIN_CHANGED_BY,
      });
    }

    await recordScoreSnapshot({
      wineId: parsed.data.wineId,
      priceAvg: existing.currentPrice ?? existing.priceAvg,
      valueScore: parsed.data.valueScore ?? existing.valueScore,
      giftScore: parsed.data.giftScore ?? existing.giftScore,
      foodMatchScore: parsed.data.foodMatchScore ?? existing.foodMatchScore,
      overpricedRisk: existing.overpricedRisk,
      algorithmVersion: VALUE_SCORE_ALGORITHM_VERSION,
      changeReason: "admin_override",
      changedBy: ADMIN_CHANGED_BY,
    });
  }

  const wine = await db.query.wines.findFirst({
    where: eq(wines.id, parsed.data.wineId),
    columns: { slug: true },
    with: { winery: { columns: { slug: true } } },
  });
  if (wine?.slug) {
    revalidateWine(wine.slug);
    scheduleIndexNowWine(wine.slug, wine.winery?.slug ?? null);
  }

  revalidateAdmin();
  return { ok: true as const };
}

export async function updateWineryPremiumAction(
  input: z.infer<typeof updateWineryPremiumSchema>,
) {
  await assertAdmin();
  const parsed = updateWineryPremiumSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Date invalide." };
  }

  const existing = await db.query.wineries.findFirst({
    where: eq(wineries.id, parsed.data.wineryId),
    columns: {
      slug: true,
      isPremium: true,
      premiumSince: true,
    },
  });

  if (!existing) {
    return { ok: false as const, error: "Crama negasita." };
  }

  const activatingPremium = parsed.data.isPremium && !existing.isPremium;

  await db
    .update(wineries)
    .set({
      isPremium: parsed.data.isPremium,
      premiumSince: parsed.data.isPremium
        ? existing.premiumSince ??
          new Date().toISOString().slice(0, 19).replace("T", " ")
        : null,
      customBannerUrl: parsed.data.customBannerUrl?.trim() || null,
      customStory: parsed.data.customStory?.trim() || null,
      analyticsEnabled: parsed.data.analyticsEnabled ?? false,
      leadCaptureEnabled: parsed.data.leadCaptureEnabled ?? false,
      featuredPlacement: parsed.data.featuredPlacement ?? false,
      ...(parsed.data.isPremium
        ? {}
        : {
            analyticsEnabled: false,
            leadCaptureEnabled: false,
            featuredPlacement: false,
          }),
    })
    .where(eq(wineries.id, parsed.data.wineryId));

  revalidateWinery(existing.slug);
  revalidateAdmin();
  scheduleIndexNowWinery(existing.slug);

  return {
    ok: true as const,
    message: activatingPremium
      ? "Profil Premium activat."
      : parsed.data.isPremium
        ? "Profil Premium actualizat."
        : "Profil Premium dezactivat.",
  };
}

export async function resolveWineReportsAction(wineId: number) {
  await assertAdmin();
  await db.delete(wineReports).where(eq(wineReports.wineId, wineId));
  await db
    .update(wines)
    .set({ reportCount: 0 })
    .where(eq(wines.id, wineId));
  revalidateAdmin();
  return { ok: true as const };
}

export async function generateEditorialContentAction(wineId: number) {
  await assertAdmin();

  const wine = await loadWineForEditorial(wineId);
  if (!wine) {
    return { ok: false as const, error: "Vin negasit." };
  }

  if (!hasMinimumFactualDataForEditorial(wine)) {
    return {
      ok: false as const,
      error:
        "Date factuale insuficiente. Adauga producator, regiune, pret sau soiuri.",
    };
  }

  try {
    const { slug, editorial } = await regenerateWineEditorialContent(wineId);
    revalidateWine(slug);
    revalidateAdmin();
    scheduleIndexNowWine(slug);

    return {
      ok: true as const,
      message: "Descriere editoriala generata cu succes.",
      editorial: {
        descriptionEditorial: editorial.descriptionEditorial,
        valueExplanation: editorial.valueExplanation,
        tasteProfile: editorial.tasteProfile,
        thingsYouShouldKnow: editorial.thingsYouShouldKnow,
      },
    };
  } catch (error) {
    console.error("[admin generate editorial]", error);
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Generarea editoriala a esuat. Incearca din nou.",
    };
  }
}

export async function reanalyzeWineAction(wineId: number) {
  await assertAdmin();

  const wine = await db.query.wines.findFirst({
    where: eq(wines.id, wineId),
    columns: { slug: true, sourceUrl: true },
  });

  if (!wine?.sourceUrl) {
    return {
      ok: false as const,
      error: "Vinul nu are link sursa pentru re-analiza.",
    };
  }

  try {
    const result = await reanalyzeAndUpdateWine(wineId);

    if (result.status === "rejected") {
      return {
        ok: false as const,
        error: result.message ?? "Re-analiza a esuat.",
      };
    }

    if (result.slug) {
      revalidateWine(result.slug);
      scheduleIndexNowWine(result.slug);
    }
    revalidateAdmin();

    return {
      ok: true as const,
      message: result.message ?? "Vin re-analizat cu succes.",
    };
  } catch (error) {
    console.error("[admin reanalyze]", error);
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Re-analiza a esuat. Incearca din nou.",
    };
  }
}

const approvePairingsSchema = z.object({
  wineId: z.number().int().positive(),
  drafts: z
    .array(
      z.object({
        dish: z.string().min(2).max(80),
        category: z.string().min(2),
        rationale: z.string().min(8).max(400),
        basis: z.array(
          z.enum([
            "producer_evidence",
            "verified_style",
            "technical_data",
            "editorial_judgment",
          ]),
        ),
        confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
        strength: z.enum(["strong", "good", "possible"]),
        styleOnlyWarning: z.boolean(),
        provenanceLocked: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(5),
});

export async function approveCuratedPairingsAction(input: {
  wineId: number;
  drafts: Array<{
    dish: string;
    category: string;
    rationale: string;
    basis: Array<
      | "producer_evidence"
      | "verified_style"
      | "technical_data"
      | "editorial_judgment"
    >;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    strength: "strong" | "good" | "possible";
    styleOnlyWarning: boolean;
    provenanceLocked?: boolean;
  }>;
}): Promise<
  | {
      ok: true;
      message: string;
      slug: string;
      wineName: string;
      approvedCount: number;
      pairings: Array<{
        dish: string;
        note?: string;
        source?: string;
        curatedAt?: string;
        curatedBy?: string;
        basis?: string[];
        strength?: string;
      }>;
    }
  | { ok: false; error: string; dish?: string }
> {
  await assertAdmin();

  const parsed = approvePairingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Date de aprobare invalide." };
  }

  const { approveCuratedPairingsForWine } = await import(
    "@/lib/pairing-curation-apply"
  );
  const { approvalSuccessMessage } = await import(
    "@/lib/pairing-curation-review"
  );
  try {
    const result = await approveCuratedPairingsForWine({
      wineId: parsed.data.wineId,
      drafts: parsed.data.drafts.map((draft) => ({
        ...draft,
        category: draft.category as FoodCategoryId,
        provenanceLocked: draft.provenanceLocked ?? true,
      })),
      adminAuthenticated: true,
    });
    revalidateWine(result.slug);
    revalidateAdmin();
    return {
      ok: true,
      message: approvalSuccessMessage(result.approvedCount, result.wineName),
      slug: result.slug,
      wineName: result.wineName,
      approvedCount: result.approvedCount,
      pairings: result.pairings,
    };
  } catch (error) {
    const dish =
      error && typeof error === "object" && "dish" in error
        ? typeof error.dish === "string"
          ? error.dish
          : undefined
        : undefined;
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Aprobarea a esuat.",
      dish,
    };
  }
}
