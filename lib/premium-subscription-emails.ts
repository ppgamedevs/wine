import "server-only";
import { and, eq, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  computePremiumExpiryDate,
  sendPremiumExpiredEmail,
  sendPremiumExpiryReminderEmail,
  sendPremiumWelcomeEmail,
  toSqlTimestamp,
  type PremiumEmailContext,
} from "@/lib/emails/winery-premium";
import {
  wineryPremiumCheckouts,
  wineries,
  type PremiumCheckoutPlan,
  type StripeSubscriptionStatus,
} from "@/lib/schema";
import {
  deactivateWineryPremiumSubscription,
  isActiveSubscriptionStatus,
  isStripeSubscriptionStillActive,
} from "@/lib/stripe/subscription-sync";

function parseSqlDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T") + "Z";
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function loadActiveStripeFlag(input: {
  wineryId: number | null;
  stripeSubscriptionId: string | null;
}): Promise<boolean> {
  if (input.stripeSubscriptionId) {
    return isStripeSubscriptionStillActive(input.stripeSubscriptionId);
  }

  if (!input.wineryId) return false;

  const winery = await db.query.wineries.findFirst({
    where: eq(wineries.id, input.wineryId),
    columns: {
      stripeSubscriptionId: true,
      stripeSubscriptionStatus: true,
    },
  });

  if (!winery?.stripeSubscriptionId) {
    return isActiveSubscriptionStatus(
      winery?.stripeSubscriptionStatus as StripeSubscriptionStatus | null | undefined,
    );
  }

  return isStripeSubscriptionStillActive(winery.stripeSubscriptionId);
}

export function buildPremiumEmailContext(input: {
  email: string;
  wineryName: string;
  winerySlug: string | null;
  plan: PremiumCheckoutPlan;
  completedAt: string | null;
  expiresAt: string | null;
  hasActiveStripeSubscription?: boolean;
}): PremiumEmailContext | null {
  const startedAt = parseSqlDate(input.completedAt);
  const expiresAt =
    parseSqlDate(input.expiresAt) ??
    (startedAt ? computePremiumExpiryDate(input.plan, startedAt) : null);

  if (!startedAt || !expiresAt) return null;

  return {
    email: input.email,
    wineryName: input.wineryName,
    winerySlug: input.winerySlug,
    plan: input.plan,
    startedAt,
    expiresAt,
    hasActiveStripeSubscription: input.hasActiveStripeSubscription ?? false,
  };
}

export async function sendWelcomeEmailForCheckout(
  checkoutId: number,
): Promise<{ sent: boolean }> {
  const checkout = await db.query.wineryPremiumCheckouts.findFirst({
    where: eq(wineryPremiumCheckouts.id, checkoutId),
  });

  if (!checkout || checkout.welcomeEmailSentAt) {
    return { sent: false };
  }

  const hasActiveStripeSubscription = await loadActiveStripeFlag({
    wineryId: checkout.wineryId,
    stripeSubscriptionId: checkout.stripeSubscriptionId,
  });

  const ctx = buildPremiumEmailContext({
    email: checkout.email,
    wineryName: checkout.wineryName,
    winerySlug: checkout.winerySlug,
    plan: checkout.plan,
    completedAt: checkout.completedAt,
    expiresAt: checkout.expiresAt,
    hasActiveStripeSubscription,
  });

  if (!ctx) return { sent: false };

  const result = await sendPremiumWelcomeEmail(ctx);
  if (result.sent) {
    await db
      .update(wineryPremiumCheckouts)
      .set({ welcomeEmailSentAt: toSqlTimestamp(new Date()) })
      .where(eq(wineryPremiumCheckouts.id, checkout.id));
  }

  return result;
}

export interface PremiumEmailJobResult {
  remindersSent: number;
  expiredSent: number;
  deactivated: number;
  skippedActiveSubscriptions: number;
}

export async function runPremiumSubscriptionEmailJob(options?: {
  dryRun?: boolean;
}): Promise<PremiumEmailJobResult> {
  const dryRun = options?.dryRun ?? false;
  let remindersSent = 0;
  let expiredSent = 0;
  let deactivated = 0;
  let skippedActiveSubscriptions = 0;

  const reminderCandidates = await db.query.wineryPremiumCheckouts.findMany({
    where: and(
      eq(wineryPremiumCheckouts.status, "completed"),
      isNotNull(wineryPremiumCheckouts.expiresAt),
      isNull(wineryPremiumCheckouts.reminderEmailSentAt),
      sql`date(${wineryPremiumCheckouts.expiresAt}) = date('now', '+7 days')`,
    ),
    limit: 100,
  });

  for (const checkout of reminderCandidates) {
    const hasActiveStripeSubscription = await loadActiveStripeFlag({
      wineryId: checkout.wineryId,
      stripeSubscriptionId: checkout.stripeSubscriptionId,
    });

    const ctx = buildPremiumEmailContext({
      email: checkout.email,
      wineryName: checkout.wineryName,
      winerySlug: checkout.winerySlug,
      plan: checkout.plan,
      completedAt: checkout.completedAt,
      expiresAt: checkout.expiresAt,
      hasActiveStripeSubscription,
    });
    if (!ctx) continue;

    if (dryRun) {
      console.info("[premium-emails] reminder dry-run", checkout.wineryName);
      remindersSent += 1;
      continue;
    }

    const result = await sendPremiumExpiryReminderEmail(ctx);
    if (result.sent) {
      await db
        .update(wineryPremiumCheckouts)
        .set({ reminderEmailSentAt: toSqlTimestamp(new Date()) })
        .where(eq(wineryPremiumCheckouts.id, checkout.id));
      remindersSent += 1;
    }
  }

  const expiredCandidates = await db.query.wineryPremiumCheckouts.findMany({
    where: and(
      eq(wineryPremiumCheckouts.status, "completed"),
      isNotNull(wineryPremiumCheckouts.expiresAt),
      isNull(wineryPremiumCheckouts.expiredEmailSentAt),
      lte(wineryPremiumCheckouts.expiresAt, sql`(datetime('now'))`),
    ),
    limit: 100,
  });

  for (const checkout of expiredCandidates) {
    const stillActive = await loadActiveStripeFlag({
      wineryId: checkout.wineryId,
      stripeSubscriptionId: checkout.stripeSubscriptionId,
    });

    if (stillActive) {
      skippedActiveSubscriptions += 1;
      continue;
    }

    const ctx = buildPremiumEmailContext({
      email: checkout.email,
      wineryName: checkout.wineryName,
      winerySlug: checkout.winerySlug,
      plan: checkout.plan,
      completedAt: checkout.completedAt,
      expiresAt: checkout.expiresAt,
      hasActiveStripeSubscription: false,
    });
    if (!ctx) continue;

    if (dryRun) {
      console.info("[premium-emails] expired dry-run", checkout.wineryName);
      expiredSent += 1;
      continue;
    }

    const result = await sendPremiumExpiredEmail(ctx);
    if (result.sent) {
      await db
        .update(wineryPremiumCheckouts)
        .set({ expiredEmailSentAt: toSqlTimestamp(new Date()) })
        .where(eq(wineryPremiumCheckouts.id, checkout.id));

      if (checkout.wineryId) {
        const winery = await db.query.wineries.findFirst({
          where: eq(wineries.id, checkout.wineryId),
          columns: { slug: true },
        });
        await deactivateWineryPremiumSubscription(
          checkout.wineryId,
          winery?.slug,
        );
        deactivated += 1;
      }

      expiredSent += 1;
    }
  }

  return { remindersSent, expiredSent, deactivated, skippedActiveSubscriptions };
}
