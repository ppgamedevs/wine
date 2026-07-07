import "server-only";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { envOrUndefined } from "@/lib/env";
import { absoluteUrl } from "@/lib/seo";
import { wineryPremiumCheckouts, type PremiumCheckoutPlan } from "@/lib/schema";
import { sendWelcomeEmailForCheckout } from "@/lib/premium-subscription-emails";
import { createBillingPortalSession, getStripe } from "@/lib/stripe/config";
import { getPremiumPlan } from "@/lib/stripe/premium-plans";
import {
  getCustomerIdFromSession,
  getSubscriptionIdFromSession,
  isStripeSubscriptionStillActive,
  nowSqlTimestamp,
  parsePremiumPlan,
  resolveWineryForCheckout,
  retrieveStripeSubscription,
  syncStripeSubscription,
} from "@/lib/stripe/subscription-sync";

export interface CreatePremiumCheckoutInput {
  plan: PremiumCheckoutPlan;
  wineryName: string;
  winerySlug?: string;
  email: string;
  phone?: string;
}

export interface CreatePremiumCheckoutResult {
  sessionId: string;
  url: string;
  existingSubscription?: boolean;
}

function resolvePriceId(plan: PremiumCheckoutPlan): string | undefined {
  const envKey = getPremiumPlan(plan).stripePriceIdEnvKey;
  return envOrUndefined(envKey);
}

export async function createPremiumCheckoutSession(
  input: CreatePremiumCheckoutInput,
): Promise<CreatePremiumCheckoutResult> {
  const winery = await resolveWineryForCheckout({
    wineryName: input.wineryName,
    winerySlug: input.winerySlug,
  });

  if (
    winery?.stripeCustomerId &&
    winery.stripeSubscriptionId &&
    (await isStripeSubscriptionStillActive(winery.stripeSubscriptionId))
  ) {
    const portal = await createBillingPortalSession({
      customerId: winery.stripeCustomerId,
      returnPath: `/wineries/${winery.slug}/dashboard`,
    });

    return {
      sessionId: "",
      url: portal.url,
      existingSubscription: true,
    };
  }

  const stripe = getStripe();
  const planDef = getPremiumPlan(input.plan);
  const priceId = resolvePriceId(input.plan);
  const metadata = {
    plan: input.plan,
    wineryName: input.wineryName.trim(),
    winerySlug: input.winerySlug?.trim() ?? "",
    phone: input.phone?.trim() ?? "",
    email: input.email.trim(),
  };

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = priceId
    ? { price: priceId, quantity: 1 }
    : {
        price_data: {
          currency: "ron",
          unit_amount: planDef.amountRon * 100,
          product_data: {
            name: `VinIntel Premium Profile (${planDef.label})`,
            description: planDef.description,
          },
          recurring: { interval: planDef.interval },
        },
        quantity: 1,
      };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: input.email.trim(),
    line_items: [lineItem],
    metadata,
    subscription_data: {
      metadata,
    },
    success_url: absoluteUrl(
      "/wineries/premium/success?session_id={CHECKOUT_SESSION_ID}",
    ),
    cancel_url: absoluteUrl(
      `/wineries/premium/checkout?plan=${input.plan}${
        input.winerySlug ? `&crama=${encodeURIComponent(input.winerySlug)}` : ""
      }`,
    ),
    locale: "ro",
    billing_address_collection: "auto",
    allow_promotion_codes: true,
  });

  if (!session.url) {
    throw new Error("Stripe nu a returnat URL de checkout.");
  }

  await db.insert(wineryPremiumCheckouts).values({
    stripeSessionId: session.id,
    wineryName: input.wineryName.trim(),
    winerySlug: input.winerySlug?.trim() || null,
    email: input.email.trim(),
    phone: input.phone?.trim() || null,
    plan: input.plan,
    status: "pending",
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}

export interface FulfillPremiumCheckoutResult {
  alreadyProcessed: boolean;
  wineryMatched: boolean;
  winerySlug: string | null;
  wineryName: string;
  email: string;
  plan: PremiumCheckoutPlan;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export async function fulfillPremiumCheckout(
  sessionId: string,
): Promise<FulfillPremiumCheckoutResult | null> {
  const existing = await db.query.wineryPremiumCheckouts.findFirst({
    where: eq(wineryPremiumCheckouts.stripeSessionId, sessionId),
  });

  if (existing?.status === "completed") {
    if (!existing.welcomeEmailSentAt) {
      await sendWelcomeEmailForCheckout(existing.id);
    }

    return {
      alreadyProcessed: true,
      wineryMatched: Boolean(existing.wineryId),
      winerySlug: existing.winerySlug,
      wineryName: existing.wineryName,
      email: existing.email,
      plan: existing.plan,
      stripeCustomerId: existing.stripeCustomerId,
      stripeSubscriptionId: existing.stripeSubscriptionId,
    };
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (session.payment_status !== "paid" && session.status !== "complete") {
    return null;
  }

  const plan = parsePremiumPlan(session.metadata?.plan ?? existing?.plan);
  const wineryName =
    session.metadata?.wineryName?.trim() ?? existing?.wineryName ?? "";
  const winerySlugMeta = session.metadata?.winerySlug?.trim() || undefined;
  const email =
    session.customer_details?.email ??
    session.metadata?.email ??
    existing?.email ??
    "";
  const phone =
    session.metadata?.phone?.trim() || existing?.phone || undefined;

  if (!wineryName || !email) {
    throw new Error("Metadata checkout incompleta.");
  }

  let subscriptionId = getSubscriptionIdFromSession(session);
  let subscription =
    subscriptionId != null
      ? ((typeof session.subscription === "object" && session.subscription
          ? session.subscription
          : null) ??
        (await retrieveStripeSubscription(subscriptionId)))
      : null;

  if (!subscription && subscriptionId) {
    subscription = await retrieveStripeSubscription(subscriptionId);
  }

  if (!subscription) {
    throw new Error("Abonamentul Stripe lipseste din sesiunea de checkout.");
  }

  subscriptionId = subscription.id;
  const premiumSince = nowSqlTimestamp();
  const stripeCustomerId =
    getCustomerIdFromSession(session) ??
    (typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null);

  if (existing) {
    await db
      .update(wineryPremiumCheckouts)
      .set({
        status: "completed",
        completedAt: premiumSince,
        stripeCustomerId,
        stripeSubscriptionId: subscriptionId,
      })
      .where(eq(wineryPremiumCheckouts.id, existing.id));
  } else {
    const winery = await resolveWineryForCheckout({
      wineryName,
      winerySlug: winerySlugMeta,
    });

    await db.insert(wineryPremiumCheckouts).values({
      stripeSessionId: sessionId,
      wineryName,
      winerySlug: winery?.slug ?? winerySlugMeta ?? null,
      email,
      phone: phone ?? null,
      plan,
      status: "completed",
      completedAt: premiumSince,
      stripeCustomerId,
      stripeSubscriptionId: subscriptionId,
      wineryId: winery?.id ?? null,
    });
  }

  const checkoutRecord = await db.query.wineryPremiumCheckouts.findFirst({
    where: eq(wineryPremiumCheckouts.stripeSessionId, sessionId),
  });

  const syncResult = await syncStripeSubscription(subscription, {
    checkoutId: checkoutRecord?.id,
    wineryName,
    winerySlug: winerySlugMeta,
    email,
    phone,
    premiumSince,
  });

  if (checkoutRecord && !checkoutRecord.welcomeEmailSentAt) {
    await sendWelcomeEmailForCheckout(checkoutRecord.id);
  }

  return {
    alreadyProcessed: false,
    wineryMatched: syncResult.wineryMatched,
    winerySlug: syncResult.winerySlug,
    wineryName,
    email,
    plan,
    stripeCustomerId,
    stripeSubscriptionId: subscriptionId,
  };
}
