import {
  fulfillPremiumCheckout,
  type FulfillPremiumCheckoutResult,
} from "@/lib/stripe/premium-checkout";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe/config";
import {
  handleInvoicePaid,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from "@/lib/stripe/subscription-sync";
import type Stripe from "stripe";

export const runtime = "nodejs";

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<FulfillPremiumCheckoutResult | null> {
  if (!session.metadata?.plan) {
    return null;
  }
  return fulfillPremiumCheckout(session.id);
}

export async function POST(req: Request) {
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    return Response.json({ error: "Webhook neconfigurat." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Semnatura lipsa." }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe-webhook] signature failed", error);
    return Response.json({ error: "Semnatura invalida." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      default:
        break;
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("[stripe-webhook] handler failed", error);
    return Response.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}
