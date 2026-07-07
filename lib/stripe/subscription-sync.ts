import "server-only";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import {
  computePremiumExpiryDate,
  toSqlTimestamp,
} from "@/lib/emails/winery-premium";
import {
  wineryPremiumCheckouts,
  wineries,
  type PremiumCheckoutPlan,
  type StripeSubscriptionStatus,
} from "@/lib/schema";
import { getStripe } from "@/lib/stripe/config";
import { findWineryByNameInsensitive } from "@/lib/winery-detection";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set<StripeSubscriptionStatus>([
  "active",
  "trialing",
  "past_due",
]);

export function nowSqlTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export function unixSecondsToSqlTimestamp(unixSeconds: number): string {
  return toSqlTimestamp(new Date(unixSeconds * 1000));
}

export function parsePremiumPlan(value: string | null | undefined): PremiumCheckoutPlan {
  return value === "monthly" ? "monthly" : "annual";
}

export function normalizeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): StripeSubscriptionStatus {
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  if (status === "past_due") return "past_due";
  if (status === "canceled") return "canceled";
  if (status === "unpaid") return "unpaid";
  if (status === "incomplete") return "incomplete";
  if (status === "incomplete_expired") return "incomplete_expired";
  if (status === "paused") return "paused";
  return "canceled";
}

export function isActiveSubscriptionStatus(
  status: StripeSubscriptionStatus | null | undefined,
): boolean {
  return status != null && ACTIVE_SUBSCRIPTION_STATUSES.has(status);
}

type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_end?: number;
};

export function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date {
  const extended = subscription as SubscriptionWithPeriod;
  if (typeof extended.current_period_end === "number") {
    return new Date(extended.current_period_end * 1000);
  }

  const item = subscription.items.data[0] as
    | (Stripe.SubscriptionItem & { current_period_end?: number })
    | undefined;
  if (item && typeof item.current_period_end === "number") {
    return new Date(item.current_period_end * 1000);
  }

  const plan = parsePremiumPlan(subscription.metadata?.plan);
  return computePremiumExpiryDate(plan, new Date());
}

export function getInvoicePeriodEnd(invoice: Stripe.Invoice): Date | null {
  const line = invoice.lines.data[0];
  const end = line?.period?.end;
  if (typeof end === "number") {
    return new Date(end * 1000);
  }
  return null;
}

export async function retrieveStripeSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function findWineryByStripeSubscriptionId(subscriptionId: string) {
  return db.query.wineries.findFirst({
    where: eq(wineries.stripeSubscriptionId, subscriptionId),
  });
}

export async function findCheckoutByStripeSubscriptionId(subscriptionId: string) {
  return db.query.wineryPremiumCheckouts.findFirst({
    where: eq(wineryPremiumCheckouts.stripeSubscriptionId, subscriptionId),
  });
}

export async function resolveWineryForCheckout(input: {
  wineryName: string;
  winerySlug?: string;
}) {
  if (input.winerySlug?.trim()) {
    const bySlug = await db.query.wineries.findFirst({
      where: eq(wineries.slug, input.winerySlug.trim()),
    });
    if (bySlug) return bySlug;
  }

  return findWineryByNameInsensitive(input.wineryName);
}

function revalidateWineryPaths(slug: string | null | undefined): void {
  if (!slug) return;
  revalidatePath(`/wineries/${slug}`);
  revalidatePath(`/wineries/${slug}/dashboard`);
  revalidatePath("/crame");
  revalidatePath("/admin/wineries");
}

export interface ApplyPremiumSubscriptionInput {
  wineryId: number;
  winerySlug: string | null;
  plan: PremiumCheckoutPlan;
  premiumSince: string;
  expiresAt: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  stripeSubscriptionStatus: StripeSubscriptionStatus;
}

export async function applyPremiumSubscriptionToWinery(
  input: ApplyPremiumSubscriptionInput,
): Promise<void> {
  await db
    .update(wineries)
    .set({
      isPremium: true,
      premiumSince: input.premiumSince,
      premiumExpiresAt: input.expiresAt,
      premiumPlan: input.plan,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      stripeSubscriptionStatus: input.stripeSubscriptionStatus,
      analyticsEnabled: true,
      leadCaptureEnabled: true,
      featuredPlacement: true,
    })
    .where(eq(wineries.id, input.wineryId));

  revalidateWineryPaths(input.winerySlug);
}

export async function deactivateWineryPremiumSubscription(
  wineryId: number,
  winerySlug: string | null | undefined,
  status: StripeSubscriptionStatus = "canceled",
): Promise<void> {
  await db
    .update(wineries)
    .set({
      isPremium: false,
      analyticsEnabled: false,
      leadCaptureEnabled: false,
      featuredPlacement: false,
      stripeSubscriptionStatus: status,
      stripeSubscriptionId: null,
    })
    .where(eq(wineries.id, wineryId));

  revalidateWineryPaths(winerySlug);
}

export async function syncCheckoutSubscriptionFields(input: {
  checkoutId: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  expiresAt: string;
  resetBillingCycleEmails?: boolean;
}): Promise<void> {
  await db
    .update(wineryPremiumCheckouts)
    .set({
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      expiresAt: input.expiresAt,
      ...(input.resetBillingCycleEmails
        ? {
            reminderEmailSentAt: null,
            expiredEmailSentAt: null,
          }
        : {}),
    })
    .where(eq(wineryPremiumCheckouts.id, input.checkoutId));
}

export interface SyncStripeSubscriptionResult {
  wineryMatched: boolean;
  wineryId: number | null;
  winerySlug: string | null;
  checkoutId: number | null;
  expiresAt: string;
  plan: PremiumCheckoutPlan;
}

export async function syncStripeSubscription(
  subscription: Stripe.Subscription,
  options?: {
    checkoutId?: number;
    wineryName?: string;
    winerySlug?: string;
    email?: string;
    phone?: string;
    premiumSince?: string;
    resetBillingCycleEmails?: boolean;
  },
): Promise<SyncStripeSubscriptionResult> {
  const plan = parsePremiumPlan(subscription.metadata?.plan);
  const status = normalizeSubscriptionStatus(subscription.status);
  const periodEnd = getSubscriptionPeriodEnd(subscription);
  const expiresAt = unixSecondsToSqlTimestamp(Math.floor(periodEnd.getTime() / 1000));
  const premiumSince = options?.premiumSince ?? nowSqlTimestamp();
  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  let checkout =
    options?.checkoutId != null
      ? await db.query.wineryPremiumCheckouts.findFirst({
          where: eq(wineryPremiumCheckouts.id, options.checkoutId),
        })
      : null;

  if (!checkout) {
    checkout =
      (await findCheckoutByStripeSubscriptionId(subscription.id)) ?? undefined;
  }

  const wineryName =
    options?.wineryName ??
    subscription.metadata?.wineryName?.trim() ??
    checkout?.wineryName ??
    "";
  const winerySlugMeta =
    options?.winerySlug ??
    (subscription.metadata?.winerySlug?.trim() ||
      checkout?.winerySlug ||
      undefined);

  let winery =
    checkout?.wineryId != null
      ? await db.query.wineries.findFirst({
          where: eq(wineries.id, checkout.wineryId),
        })
      : null;

  if (!winery) {
    winery = await findWineryByStripeSubscriptionId(subscription.id);
  }

  if (!winery && wineryName) {
    winery = await resolveWineryForCheckout({
      wineryName,
      winerySlug: winerySlugMeta,
    });
  }

  if (winery && isActiveSubscriptionStatus(status)) {
    await applyPremiumSubscriptionToWinery({
      wineryId: winery.id,
      winerySlug: winery.slug,
      plan,
      premiumSince: winery.premiumSince ?? premiumSince,
      expiresAt,
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: status,
    });
  } else if (winery && !isActiveSubscriptionStatus(status)) {
    await deactivateWineryPremiumSubscription(winery.id, winery.slug, status);
  }

  if (checkout) {
    await db
      .update(wineryPremiumCheckouts)
      .set({
        status: "completed",
        completedAt: checkout.completedAt ?? premiumSince,
        expiresAt,
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        wineryId: winery?.id ?? checkout.wineryId,
        winerySlug: winery?.slug ?? winerySlugMeta ?? checkout.winerySlug,
        email:
          options?.email ??
          subscription.metadata?.email ??
          checkout.email,
        phone:
          options?.phone ??
          subscription.metadata?.phone ??
          checkout.phone,
        plan,
      })
      .where(eq(wineryPremiumCheckouts.id, checkout.id));

    if (isActiveSubscriptionStatus(status)) {
      await syncCheckoutSubscriptionFields({
        checkoutId: checkout.id,
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        expiresAt,
        resetBillingCycleEmails: options?.resetBillingCycleEmails ?? false,
      });
    }
  }

  return {
    wineryMatched: Boolean(winery),
    wineryId: winery?.id ?? null,
    winerySlug: winery?.slug ?? winerySlugMeta ?? null,
    checkoutId: checkout?.id ?? null,
    expiresAt,
    plan,
  };
}

export function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const extended = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
    parent?: {
      subscription_details?: {
        subscription?: string | Stripe.Subscription | null;
      } | null;
    } | null;
  };

  const parentSubscription = extended.parent?.subscription_details?.subscription;
  if (typeof parentSubscription === "string") return parentSubscription;
  if (parentSubscription && typeof parentSubscription === "object") {
    return parentSubscription.id;
  }

  const legacySubscription = extended.subscription;
  if (typeof legacySubscription === "string") return legacySubscription;
  if (legacySubscription && typeof legacySubscription === "object") {
    return legacySubscription.id;
  }

  return null;
}

export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (!subscriptionId) return;

  const subscription = await retrieveStripeSubscription(subscriptionId);
  const invoicePeriodEnd = getInvoicePeriodEnd(invoice);
  if (invoicePeriodEnd) {
    const patched = subscription as SubscriptionWithPeriod;
    patched.current_period_end = Math.floor(invoicePeriodEnd.getTime() / 1000);
  }

  await syncStripeSubscription(subscription, { resetBillingCycleEmails: true });
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const status = normalizeSubscriptionStatus(subscription.status);
  const winery = await findWineryByStripeSubscriptionId(subscription.id);

  if (isActiveSubscriptionStatus(status)) {
    await syncStripeSubscription(subscription);
    return;
  }

  if (winery && (status === "canceled" || status === "unpaid")) {
    const periodEnd = getSubscriptionPeriodEnd(subscription);
    const stillInPeriod = periodEnd.getTime() > Date.now();

    if (stillInPeriod && subscription.cancel_at_period_end) {
      await db
        .update(wineries)
        .set({
          stripeSubscriptionStatus: status,
          premiumExpiresAt: unixSecondsToSqlTimestamp(
            Math.floor(periodEnd.getTime() / 1000),
          ),
        })
        .where(eq(wineries.id, winery.id));
      return;
    }

    await deactivateWineryPremiumSubscription(winery.id, winery.slug, status);
  }
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const winery = await findWineryByStripeSubscriptionId(subscription.id);
  if (!winery) return;

  await deactivateWineryPremiumSubscription(
    winery.id,
    winery.slug,
    normalizeSubscriptionStatus(subscription.status),
  );
}

export async function isStripeSubscriptionStillActive(
  subscriptionId: string | null | undefined,
): Promise<boolean> {
  if (!subscriptionId) return false;

  try {
    const subscription = await retrieveStripeSubscription(subscriptionId);
    return isActiveSubscriptionStatus(normalizeSubscriptionStatus(subscription.status));
  } catch {
    return false;
  }
}

export function extractSubscriptionFromSession(
  session: Stripe.Checkout.Session,
): Stripe.Subscription | null {
  if (!session.subscription) return null;
  if (typeof session.subscription === "string") return null;
  return session.subscription;
}

export function getSubscriptionIdFromSession(
  session: Stripe.Checkout.Session,
): string | null {
  if (!session.subscription) return null;
  return typeof session.subscription === "string"
    ? session.subscription
    : session.subscription.id;
}

export function getCustomerIdFromSession(
  session: Stripe.Checkout.Session,
): string | null {
  if (typeof session.customer === "string") return session.customer;
  return session.customer?.id ?? null;
}
