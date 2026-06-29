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
import { db } from "@/lib/db";
import {
  DEFAULT_WINE_SOURCE_BADGE,
  wineReports,
  wines,
} from "@/lib/schema";
import { redirect } from "next/navigation";

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

function revalidateAdmin() {
  revalidatePath("/admin/wines");
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
  await db
    .update(wines)
    .set({
      status: "verified",
      sourceBadge: DEFAULT_WINE_SOURCE_BADGE,
    })
    .where(eq(wines.id, wineId));
  revalidateAdmin();
  return { ok: true as const };
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
    .set({ imageUrl: trimmed })
    .where(eq(wines.id, wineId));
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

  revalidateAdmin();
  return { ok: true as const };
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
