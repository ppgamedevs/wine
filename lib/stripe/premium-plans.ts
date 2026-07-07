import type { PremiumCheckoutPlan } from "@/lib/schema";

export interface PremiumPlanDefinition {
  id: PremiumCheckoutPlan;
  label: string;
  priceLabel: string;
  amountRon: number;
  interval: "month" | "year";
  stripePriceIdEnvKey: string;
  description: string;
}

export const PREMIUM_PLANS: Record<PremiumCheckoutPlan, PremiumPlanDefinition> =
  {
    monthly: {
      id: "monthly",
      label: "Premium lunar",
      priceLabel: "99 lei/luna",
      amountRon: 99,
      interval: "month",
      stripePriceIdEnvKey: "STRIPE_PREMIUM_MONTHLY_PRICE_ID",
      description: "Facturare lunara, anulare oricand.",
    },
    annual: {
      id: "annual",
      label: "Premium anual",
      priceLabel: "990 lei/an",
      amountRon: 990,
      interval: "year",
      stripePriceIdEnvKey: "STRIPE_PREMIUM_ANNUAL_PRICE_ID",
      description: "2 luni gratuite fata de planul lunar.",
    },
  };

export function parsePremiumPlan(value: string | null | undefined): PremiumCheckoutPlan {
  return value === "monthly" ? "monthly" : "annual";
}

export function getPremiumPlan(plan: PremiumCheckoutPlan): PremiumPlanDefinition {
  return PREMIUM_PLANS[plan];
}
