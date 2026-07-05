import "server-only";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/schema";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(value: string | null | undefined): value is string {
  if (!value?.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function addNewsletterSubscriber(
  email: string,
  source = "wine_approval",
): Promise<{ added: boolean }> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    return { added: false };
  }

  await db
    .insert(subscribers)
    .values({ email: normalized, source })
    .onConflictDoNothing();

  return { added: true };
}
