import "server-only";
import Stripe from "stripe";
import { envOrUndefined } from "@/lib/env";
import { absoluteUrl } from "@/lib/seo";

let stripeClient: Stripe | null = null;

export const STRIPE_API_VERSION = "2026-06-24.dahlia" as const;

export function getStripeSecretKey(): string | undefined {
  return envOrUndefined("STRIPE_SECRET_KEY");
}

export function getStripePublishableKey(): string | undefined {
  return envOrUndefined("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
}

export function getStripeWebhookSecret(): string | undefined {
  return envOrUndefined("STRIPE_WEBHOOK_SECRET");
}

export function isStripeConfigured(): boolean {
  return Boolean(getStripeSecretKey());
}

export function getStripe(): Stripe {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY lipseste din configuratie.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: STRIPE_API_VERSION,
    });
  }

  return stripeClient;
}

export async function createBillingPortalSession(input: {
  customerId: string;
  returnPath?: string;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: input.customerId,
    return_url: absoluteUrl(input.returnPath ?? "/wineries/premium"),
  });

  if (!session.url) {
    throw new Error("Stripe nu a returnat URL pentru portal.");
  }

  return { url: session.url };
}
