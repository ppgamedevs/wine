import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";

/** ProfitShare links used at import; eMAG clean URLs stay in availability for price checks. */
const AFFILIATE_FIXES: {
  slug: string;
  profitshareUrl: string;
  priceRon: number;
}[] = [
  {
    slug: "balla-geza-mustoasa-de-maderat-2024",
    profitshareUrl: "https://l.profitshare.ro/l/16159175",
    priceRon: 55,
  },
  {
    slug: "balla-geza-furmint-2024",
    profitshareUrl: "https://l.profitshare.ro/l/16160229",
    priceRon: 101,
  },
  {
    slug: "balla-geza-cadarca-2022-stonewines",
    profitshareUrl: "https://l.profitshare.ro/l/16160277",
    priceRon: 101,
  },
  {
    slug: "balla-geza-cabernet-franc-2020-stonewines",
    profitshareUrl: "https://l.profitshare.ro/l/16160286",
    priceRon: 124,
  },
  {
    slug: "balla-geza-rozzy-2024-vin-perlant",
    profitshareUrl: "https://l.profitshare.ro/l/16160294",
    priceRon: 60,
  },
  {
    slug: "balla-geza-frizzy-2025-vin-perlant",
    profitshareUrl: "https://l.profitshare.ro/l/16160449",
    priceRon: 60,
  },
];

async function main() {
  for (const fix of AFFILIATE_FIXES) {
    const wine = await db.query.wines.findFirst({
      where: eq(wines.slug, fix.slug),
    });

    if (!wine) {
      console.warn("Skip missing", fix.slug);
      continue;
    }

    const affiliateLinks = [...(wine.affiliateLinks ?? [])];
    const emagIndex = affiliateLinks.findIndex((entry) =>
      entry.url?.includes("emag.ro"),
    );

    const profitshareAffiliate = {
      retailer: "eMAG.ro",
      url: fix.profitshareUrl,
      priceRon: fix.priceRon,
    };

    if (emagIndex >= 0) {
      affiliateLinks[emagIndex] = profitshareAffiliate;
    } else {
      affiliateLinks.push(profitshareAffiliate);
    }

    await db
      .update(wines)
      .set({
        affiliateLinks,
        submitType: "affiliate",
        sourceUrl: fix.profitshareUrl,
      })
      .where(eq(wines.id, wine.id));

    console.log("Fixed affiliate link for", fix.slug);
  }
}

main().catch(console.error);
