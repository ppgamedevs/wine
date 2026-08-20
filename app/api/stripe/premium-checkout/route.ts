import { z } from "zod";
import { isStripeConfigured } from "@/lib/stripe/config";
import { createPremiumCheckoutSession } from "@/lib/stripe/premium-checkout";
import { guardInteractiveApi } from "@/lib/security/api-guard";
import { readBoundedJson } from "@/lib/security/request-body";
import { RATE_LIMIT_POLICIES } from "@/lib/security/route-policy";

const requestSchema = z.object({
  plan: z.enum(["monthly", "annual"]),
  wineryName: z.string().min(2).max(160),
  winerySlug: z.string().max(120).optional(),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  try {
    const denied = await guardInteractiveApi(req, {
      checkLevel: "deepAnalysis",
      rateLimit: RATE_LIMIT_POLICIES.premiumCheckout,
    });
    if (denied) return denied;

    if (!isStripeConfigured()) {
      return Response.json(
        { error: "Plata online nu este configurata inca." },
        { status: 503 },
      );
    }

    const parsedBody = await readBoundedJson(req, requestSchema, 4_096);
    if (!parsedBody.ok) return parsedBody.response;

    const session = await createPremiumCheckoutSession(parsedBody.data);

    return Response.json({
      ok: true,
      sessionId: session.sessionId,
      url: session.url,
      existingSubscription: session.existingSubscription ?? false,
    });
  } catch (error) {
    console.error("[stripe-premium-checkout]", error);
    return Response.json(
      { error: "Nu am putut porni checkout-ul Stripe." },
      { status: 500 },
    );
  }
}
