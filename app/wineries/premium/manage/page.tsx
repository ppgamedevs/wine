import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { wineries } from "@/lib/schema";
import { createBillingPortalSession, isStripeConfigured } from "@/lib/stripe/config";

export const metadata = {
  title: "Gestionare abonament Premium",
  robots: { index: false, follow: false },
};

interface ManagePageProps {
  searchParams: Promise<{ crama?: string }>;
}

export default async function PremiumManagePage({
  searchParams,
}: ManagePageProps) {
  const { crama } = await searchParams;

  if (!crama?.trim() || !isStripeConfigured()) {
    notFound();
  }

  const winery = await db.query.wineries.findFirst({
    where: eq(wineries.slug, crama.trim()),
    columns: {
      slug: true,
      stripeCustomerId: true,
    },
  });

  if (!winery?.stripeCustomerId) {
    notFound();
  }

  const session = await createBillingPortalSession({
    customerId: winery.stripeCustomerId,
    returnPath: `/wineries/${winery.slug}/dashboard`,
  });

  redirect(session.url);
}
