import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { regions, wineries, wines, type WineMedal } from "../lib/schema";
import { buildWineImageAlt } from "@/lib/wine-images";

const PRODUCER_PAGE = "https://crama-apogeum.ro/pages/vinul";
const WINERY_SLUG = "crama-apogeum";

interface Vintage {
  year: number;
  image: string;
  awards: Array<{ competition: string; medal: WineMedal["medal"] }>;
}

const VINTAGES: Vintage[] = [
  {
    year: 2011,
    image:
      "https://crama-apogeum.ro/cdn/shop/files/sticla-dreapta_1200x.png?v=1790075386",
    awards: [
      { competition: "Asia Wine Trophy", medal: "gold" },
      { competition: "Sakura Japan Women's Wine Awards", medal: "gold" },
      { competition: "Berliner Wein Trophy", medal: "silver" },
    ],
  },
  {
    year: 2012,
    image:
      "https://crama-apogeum.ro/cdn/shop/files/Apogeum-sticla_1200x.png?v=1790075227",
    awards: [
      { competition: "Concours Mondial de Bruxelles", medal: "gold" },
    ],
  },
  {
    year: 2013,
    image:
      "https://crama-apogeum.ro/cdn/shop/files/sticla-dreapta_1200x.png?v=1790075386",
    awards: [
      {
        competition: "Great American International Wine Competition, New York",
        medal: "gold",
      },
      {
        competition: "International Wine Contest Bucharest",
        medal: "silver",
      },
    ],
  },
  {
    year: 2014,
    image:
      "https://crama-apogeum.ro/cdn/shop/files/Apogeum-sticla_1200x.png?v=1790075227",
    awards: [
      {
        competition: "Great American International Wine Competition, New York",
        medal: "double_gold",
      },
      { competition: "Concours Mondial de Bruxelles", medal: "silver" },
      { competition: "Veritas Awards", medal: "silver" },
    ],
  },
  {
    year: 2015,
    image:
      "https://crama-apogeum.ro/cdn/shop/files/Apogeum-sticla_1200x.png?v=1790075227",
    awards: [
      { competition: "Sakura Japan Women's Wine Awards", medal: "gold" },
      { competition: "Veritas Awards", medal: "silver" },
      { competition: "Decanter World Wine Awards", medal: "silver" },
    ],
  },
  {
    year: 2016,
    image:
      "https://crama-apogeum.ro/cdn/shop/files/Apogeum-sticla-1-1-1_1200x.png?v=1790076508",
    awards: [
      { competition: "Veritas Awards", medal: "silver" },
      { competition: "Decanter World Wine Awards", medal: "bronze" },
    ],
  },
  {
    year: 2017,
    image:
      "https://crama-apogeum.ro/cdn/shop/files/Apogeum_2017_Feteasca_Neagra_800_x_800_px_1200x.png?v=1790256164",
    awards: [
      { competition: "Decanter World Wine Awards", medal: "gold" },
    ],
  },
  {
    year: 2019,
    image:
      "https://crama-apogeum.ro/cdn/shop/files/Apogeum_2019_800_x_800_px_1200x.png?v=1790256418",
    awards: [
      { competition: "Catad'Or World Wine Awards Chile", medal: "gold" },
      { competition: "Citadelles du Vin", medal: "gold" },
    ],
  },
  {
    year: 2020,
    image:
      "https://crama-apogeum.ro/cdn/shop/files/Apogeum-sticla_1200x.png?v=1790075227",
    awards: [
      { competition: "Portugal Wine Trophy", medal: "gold" },
      { competition: "Citadelles du Vin", medal: "gold" },
    ],
  },
  {
    year: 2021,
    image:
      "https://crama-apogeum.ro/cdn/shop/files/apogeum_feteasca_neagra_2021_red_1200x.jpg?v=1790257221",
    awards: [{ competition: "Citadelles du Vin", medal: "double_gold" }],
  },
];

const TASTING_NOTES =
  "Fetească Neagră de la Crama Apogeum: arome de prună uscată, magiun, fructe de pădure, coacăze negre, stejar, vanilie, ciocolată și cafea. Taninuri moi, catifelate, după 24 de luni în baric de stejar francez și 12 luni în sticlă.";

function medalsFor(vintage: Vintage): WineMedal[] {
  return vintage.awards.map((award) => ({
    competition: award.competition,
    medal: award.medal,
    importance: "high",
  }));
}

function descriptionFor(vintage: Vintage): string {
  const awards = vintage.awards
    .map((award) => `${award.competition} (${award.medal.replace("_", " ")})`)
    .join(", ");
  return `Apogeum Fetească Neagră ${vintage.year} este vinul de semnătură al Cramei Apogeum, produs în podgoria Dealu Mare din Gura Vadului. Producătorul descrie o Fetească Neagră obținută din vie veche de 50 de ani, cu recolte mici, cules manual, fermentare lentă și macerare în amfore de argilă, urmată de 24 de luni în butoaie noi de stejar francez și 12 luni în sticlă. Recolta ${vintage.year} este prezentată pe pagina oficială a producătorului cu următoarele distincții: ${awards}.`;
}

function thingsFor(vintage: Vintage): string[] {
  return [
    `Recolta ${vintage.year}, Fetească Neagră, podgoria Dealu Mare.`,
    "Vie de aproximativ 50 de ani, producție mică de 5-6 tone/ha, cules manual.",
    "Fermentare în amfore de argilă, 24 de luni în stejar francez și 12 luni în sticlă.",
    ...vintage.awards.map(
      (award) => `${award.competition}: ${award.medal.replace("_", " ")}.`,
    ),
    "Prețul și Value Score rămân indisponibile până există o ofertă Profitshare verificată pentru produsul exact.",
  ];
}

async function main() {
  const apply = process.argv.includes("--apply");
  const region = await db.query.regions.findFirst({
    where: eq(regions.slug, "dealu-mare"),
    columns: { id: true, name: true },
  });
  const existingWinery = await db.query.wineries.findFirst({
    where: eq(wineries.slug, WINERY_SLUG),
    columns: { id: true, name: true },
  });

  let wineryId = existingWinery?.id;
  console.log(
    JSON.stringify({
      winery: existingWinery
        ? { action: "existing", id: existingWinery.id }
        : { action: apply ? "create" : "dry-run", slug: WINERY_SLUG },
    }),
  );

  if (!wineryId) {
    if (!apply) {
      for (const vintage of VINTAGES) {
        console.log(
          JSON.stringify({
            vintage: vintage.year,
            slug: `apogeum-feteasca-neagra-${vintage.year}`,
            action: "dry-run",
          }),
        );
      }
      return;
    }
    const [created] = await db
      .insert(wineries)
      .values({
        slug: WINERY_SLUG,
        name: "Crama Apogeum",
        regionId: region?.id ?? null,
        description:
          "Cramă din Gura Vadului, Dealu Mare, cunoscută pentru vinul de semnătură Apogeum, o Fetească Neagră produsă din vie veche și maturată în amfore și stejar francez.",
        website: "https://crama-apogeum.ro/",
        logoUrl:
          "https://crama-apogeum.ro/cdn/shop/files/logo_300x300.png?v=1787660135",
        verified: true,
        status: "verified",
      })
      .returning({ id: wineries.id });
    wineryId = created.id;
    console.log(JSON.stringify({ winery: { action: "created", id: wineryId } }));
  }

  for (const vintage of VINTAGES) {
    const slug = `apogeum-feteasca-neagra-${vintage.year}`;
    const sourceUrl = `${PRODUCER_PAGE}?recolta=${vintage.year}`;
    const existing = await db.query.wines.findFirst({
      where: eq(wines.slug, slug),
      columns: { id: true, slug: true },
    });
    if (existing) {
      console.log(
        JSON.stringify({
          vintage: vintage.year,
          slug,
          action: "existing",
          id: existing.id,
        }),
      );
      continue;
    }
    if (!apply) {
      console.log(
        JSON.stringify({ vintage: vintage.year, slug, action: "dry-run" }),
      );
      continue;
    }

    const [created] = await db
      .insert(wines)
      .values({
        slug,
        name: "Apogeum Fetească Neagră",
        wineryId,
        regionId: region?.id ?? null,
        type: "red",
        sweetness: null,
        vintage: vintage.year,
        grapeVarieties: [{ name: "Fetească Neagră" }],
        alcohol: null,
        sugar: null,
        acidity: null,
        priceAvg: null,
        currentPrice: null,
        lowestPrice30d: null,
        valueScore: null,
        giftScore: null,
        foodMatchScore: null,
        beginnerFriendly: false,
        cellarPotential: null,
        overpricedRisk: null,
        tastingNotes: TASTING_NOTES,
        descriptionEditorial: descriptionFor(vintage),
        tasteProfile:
          "Fetească Neagră cu prune uscată, magiun, fructe de pădure și coacăze negre, stejar, vanilie, ciocolată și cafea; taninuri moi și catifelate.",
        thingsYouShouldKnow: thingsFor(vintage),
        medals: medalsFor(vintage),
        foodPairings: [],
        foodPairingNotes: [],
        dessertPairings: [],
        recommendedOccasions: [],
        sourceUrl,
        producerPageUrl: PRODUCER_PAGE,
        submittedBy: "admin-cli",
        submitType: "community",
        status: "verified",
        imageUrl: vintage.image,
        imageSource: "producer",
        imageAlt: buildWineImageAlt({
          name: "Apogeum Fetească Neagră",
          wineryName: "Crama Apogeum",
          type: "red",
        }),
        availability: [],
        affiliateLinks: [],
        producerContent: {
          tastingNotes: TASTING_NOTES,
          culinaryPairings: null,
          sourceUrls: [PRODUCER_PAGE],
          extractedAt: new Date().toISOString(),
          sourceType: "producer_page",
          extractionMethod: "deterministic",
        },
      })
      .returning({ id: wines.id, slug: wines.slug });
    console.log(
      JSON.stringify({
        vintage: vintage.year,
        slug: created.slug,
        action: "created",
        id: created.id,
      }),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
