import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { wineries } from "@/lib/schema";
import { createBillingPortalSession, isStripeConfigured } from "@/lib/stripe/config";

const requestSchema = z.object({
  winerySlug: z.string().min(2).max(120),
});

export async function POST(req: Request) {
  try {
    if (!isStripeConfigured()) {
      return Response.json(
        { error: "Plata online nu este configurata." },
        { status: 503 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: "Date invalide." }, { status: 400 });
    }

    const winery = await db.query.wineries.findFirst({
      where: eq(wineries.slug, parsed.data.winerySlug),
      columns: {
        slug: true,
        stripeCustomerId: true,
      },
    });

    if (!winery?.stripeCustomerId) {
      return Response.json(
        { error: "Nu exista client Stripe pentru aceasta crama." },
        { status: 404 },
      );
    }

    const session = await createBillingPortalSession({
      customerId: winery.stripeCustomerId,
      returnPath: `/wineries/${winery.slug}/dashboard`,
    });

    return Response.json({ ok: true, url: session.url });
  } catch (error) {
    console.error("[stripe-billing-portal]", error);
    return Response.json(
      { error: "Nu am putut deschide portalul de facturare." },
      { status: 500 },
    );
  }
}
