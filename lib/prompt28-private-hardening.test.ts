import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

describe("Prompt 28 private route hardening", () => {
  it("removes the dashboard route until owner authentication exists", async () => {
    await expect(
      source("../app/wineries/[slug]/dashboard/page.tsx"),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      source("../app/wineries/[slug]/dashboard/loading.tsx"),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      source("../app/wineries/[slug]/dashboard/error.tsx"),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("keeps every browser billing portal entry disabled", async () => {
    const [route, manage, success, hero, checkout, email] =
      await Promise.all([
        source("../app/api/stripe/billing-portal/route.ts"),
        source("../app/wineries/premium/manage/page.tsx"),
        source("../app/wineries/premium/success/page.tsx"),
        source("../components/wineries/winery-hero.tsx"),
        source("./stripe/premium-checkout.ts"),
        source("./emails/winery-premium.ts"),
      ]);

    expect(route).toContain("{ status: 404 }");
    expect(route).not.toMatch(
      /createBillingPortalSession|stripeCustomerId|db\.query|req\.json/,
    );
    expect(manage).toContain("notFound()");
    expect(manage).not.toMatch(
      /createBillingPortalSession|stripeCustomerId|db\.query/,
    );
    expect(success).not.toMatch(
      /billing-portal|WineryBillingPortalButton|\/dashboard|stripeCustomerId/,
    );
    expect(hero).not.toContain("links.dashboard");
    expect(checkout).not.toContain("createBillingPortalSession");
    expect(email).not.toMatch(
      /\/dashboard|\/wineries\/premium\/manage|Gestioneaza abonamentul/,
    );
  });

  it("does not expose Stripe identifiers through public result props", async () => {
    const checkout = await source("./stripe/premium-checkout.ts");
    const resultInterface = checkout.match(
      /export interface FulfillPremiumCheckoutResult \{[\s\S]*?\n\}/,
    )?.[0];

    expect(resultInterface).toBeDefined();
    expect(resultInterface).not.toMatch(
      /stripeCustomerId|stripeSubscriptionId/,
    );
    await expect(
      source("../components/wineries/winery-dashboard-panel.tsx"),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      source("../components/wineries/winery-billing-portal-button.tsx"),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});
