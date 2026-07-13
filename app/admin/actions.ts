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

const updateWineSchema = z.object({
  wineId: z.number().int().positive(),
  descriptionEditorial: z.string().optional(),
  valueExplanation: z.string().optional(),
  tasteProfile: z.string().optional(),
  valueScore: z.coerce.number().int().min(1).max(100).optional(),
  giftScore: z.coerce.number().int().min(1).max(100).optional(),
  foodMatchScore: z.coerce.number().int().min(1).max(100).optional(),
  thingsYouShouldKnow: z.string().optional(),
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
