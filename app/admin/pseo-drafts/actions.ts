"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import {
  generatePseoDrafts,
  reviewPseoDraft,
} from "@/lib/pseo-flywheel-service";
import type { PseoDraftStatus } from "@/lib/schema";

const reviewSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(["draft", "approved", "published", "rejected"]),
  notes: z.string().max(2_000).optional(),
});

export async function reviewPseoDraftAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = reviewSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) return;

  await reviewPseoDraft({
    id: parsed.data.id,
    status: parsed.data.status as PseoDraftStatus,
    notes: parsed.data.notes,
  });
  revalidatePath("/admin/pseo-drafts");
}

export async function generatePseoDraftsAction(): Promise<void> {
  await requireAdmin();
  await generatePseoDrafts({ limit: 400 });
  revalidatePath("/admin/pseo-drafts");
}
