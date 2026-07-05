import "server-only";
import { db } from "@/lib/db";
import { wineSubmissionNotifications } from "@/lib/schema";
import { normalizeSourceUrl } from "@/lib/wine-url";

export async function saveWineSubmissionNotification(input: {
  email: string;
  sourceUrl: string;
  wineId: number;
}): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (!email) return;

  await db.insert(wineSubmissionNotifications).values({
    email,
    sourceUrl: normalizeSourceUrl(input.sourceUrl),
    wineId: input.wineId,
  });
}
