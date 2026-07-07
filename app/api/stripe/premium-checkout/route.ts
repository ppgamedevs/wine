import { z } from "zod";
import { isStripeConfigured } from "@/lib/stripe/config";
import { createPremiumCheckoutSession } from "@/lib/stripe/premium-checkout";

const requestSchema = z.object({
  plan: z.enum(["monthly", "annual"]),
  wineryName: z.string().min(2).max(160),
  winerySlug: z.string().max(120).optional(),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  try {
    if (!isStripeConfigured()) {
      return Response.json(
        { error: "Plata online nu este configurata inca." },
        { status: 503 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: "Date invalide." }, { status: 400 });
    }

    const session = await createPremiumCheckoutSession(parsed.data);

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
