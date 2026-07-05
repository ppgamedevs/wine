import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  wineSubmissionNotifications,
  wines,
} from "@/lib/schema";
import { isValidEmail } from "@/lib/subscribers";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function resolveWineSubmittedEmail(
  wineId: number,
): Promise<string | null> {
  const notifications = await db.query.wineSubmissionNotifications.findMany({
    where: eq(wineSubmissionNotifications.wineId, wineId),
    orderBy: desc(wineSubmissionNotifications.createdAt),
    columns: { email: true, notifiedAt: true },
  });

  if (notifications.some((entry) => entry.notifiedAt)) {
    return null;
  }

  const wine = await db.query.wines.findFirst({
    where: eq(wines.id, wineId),
    columns: { submittedEmail: true, submittedBy: true },
  });

  if (isValidEmail(wine?.submittedEmail)) {
    return normalizeEmail(wine.submittedEmail);
  }

  for (const notification of notifications) {
    if (isValidEmail(notification.email)) {
      return normalizeEmail(notification.email);
    }
  }

  if (isValidEmail(wine?.submittedBy)) {
    return normalizeEmail(wine.submittedBy);
  }

  return null;
}

export async function markWineSubmissionNotificationsSent(
  wineId: number,
): Promise<void> {
  const notifiedAt = new Date().toISOString();
  await db
    .update(wineSubmissionNotifications)
    .set({ notifiedAt })
    .where(eq(wineSubmissionNotifications.wineId, wineId));
}
