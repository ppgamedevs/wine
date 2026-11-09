import "../lib/load-env";
import { eq, or } from "drizzle-orm";
import { db } from "../lib/db";
import { regions, wineries, wines } from "../lib/schema";
import { buildWineSlug } from "../lib/wine-url";
import { buildWineImageAlt } from "@/lib/wine-images";
import type { FoodPairing } from "@/lib/schema";

const PRODUCER = "Murfatlar";
const RANGE = "Paznicii Viei";
const PRODUCER_PAGE = "https://murfatlar-vinul.ro/paznicii-viei/";

interface Variant {
  key: string;
  name: string;
  type: "red" | "white" | "rose";
  sweetness: "demisec" | "sec";
  sourceVariant: string;
  image: string;
  tastingNotes: string;
  culinaryPairings: string;
  editorial: {
    description: string;
    tasteProfile: string;
    thingsYouShouldKnow: string[];
  };
  foodPairings: FoodPairing[];
}

const VARIANTS: Variant[] = [
  {
    key: "cabernet-sauvignon-3000ml",
    name: "Paznicii Viei Cabernet Sauvignon, 3L",
    type: "red",
    sweetness: "demisec",
    sourceVariant: "cabernet-sauvignon-3000ml",
    image:
      "https://murfatlar-vinul.ro/wp-content/uploads/2023/10/pack-paznicii_1.png",
    tastingNotes:
      "Culoare: limpede, roșu-rubiniu. Miros: delicat, fructos, vegetal de ierburi uscate. Gust: pătrunzător, cu taninuri ferme, aciditate medie, delicat condimentat pe final, cu gust remanent scurt și intens. Temperatura de servire: 15-16°C.",
    culinaryPairings:
      "Se asociază foarte bine cu carne roșie la grătar sau pe plită, gătită simplu, rustic, condimentată, cu carne de porc sau berbecuț la proțap, rață la cuptor, castane și pâine neagră, cu carne de vânat, platou de brânzeturi asortate.",
    editorial: {
      description:
        "Paznicii Viei Cabernet Sauvignon este un vin roșu demisec de 3 litri de la Murfatlar, produs în podgoria Murfatlar cu denumire de origine controlată și cules târziu. Producătorul îl descrie ca un vin limpede, roșu-rubiniu, cu miros delicat, fructos, vegetal de ierburi uscate și gust pătrunzător, cu taninuri ferme și aciditate medie. Este o alegere pentru mesele cu carne roșie la grătar sau la plită, condimentată simplu, și pentru platouri de brânzeturi. Formatul de 3 litri este gândit pentru consum la masă, nu pentru colecție.",
      tasteProfile:
        "Roșu-rubiniu, cu miros delicat, fructos și vegetal de ierburi uscate, taninuri ferme și aciditate medie.",
      thingsYouShouldKnow: [
        "Îmbuteliere bag-in-box de 3 litri, conform paginii oficiale a producătorului.",
        "Denumire de origine controlată Murfatlar, cules târziu.",
        "Prețul și Value Score rămân indisponibile până există o ofertă Profitshare verificată pentru produsul exact.",
      ],
    },
    foodPairings: [
      {
        dish: "Carne roșie la grătar",
        note: "Recomandare din pagina oficială a producătorului.",
        basis: ["producer_evidence"],
        strength: "strong",
      },
      {
        dish: "Platou de brânzeturi",
        note: "Recomandare din pagina oficială a producătorului.",
        basis: ["producer_evidence"],
        strength: "good",
      },
    ],
  },
  {
    key: "merlot-cabernet-sauvignon-roze-3000ml",
    name: "Paznicii Viei Merlot & Cabernet Sauvignon Roze, 3L",
    type: "rose",
    sweetness: "demisec",
    sourceVariant: "merlot-cabernet-sauvignon-roze-3000ml",
    image:
      "https://murfatlar-vinul.ro/wp-content/uploads/2023/10/pack-paznicii_2.png",
    tastingNotes:
      "Culoare: limpede, luminos, cu o culoare roz-pal. Miros: intens fructat și condimentat, cu note timide florale. Gust: un vin savuros, cu buchet de fructe roșii, proaspete, cu aciditate relativ mare, ce-i conferă prospețime. Temperatura de servire: 7-8°C.",
    culinaryPairings:
      "Se poate asocia ușor cu salate, pește la grătar, preparate asortate cu legume, deserturi dulci și sărate. Poate fi servit și la salate de fructe proaspete, de mango sau pepene galben.",
    editorial: {
      description:
        "Paznicii Viei Merlot & Cabernet Sauvignon Roze este un vin roze demisec de 3 litri de la Murfatlar, din podgoria Murfatlar, cu denumire de origine controlată și cules la maturitate deplină. Producătorul îl descrie ca un vin limpede, luminos, roz-pal, cu miros intens fructat și condimentat, note florale timide și gust savuros de fructe roșii proaspete, susținut de o aciditate relativ mare. Se servește răcit, la 7-8°C, lângă salate, pește la grătar, legume și deserturi.",
      tasteProfile:
        "Roz-pal, fructat și condimentat, cu note florale, fructe roșii proaspete și aciditate vie.",
      thingsYouShouldKnow: [
        "Îmbuteliere bag-in-box de 3 litri, conform paginii oficiale a producătorului.",
        "Denumire de origine controlată Murfatlar, cules la maturitate deplină.",
        "Prețul și Value Score rămân indisponibile până există o ofertă Profitshare verificată pentru produsul exact.",
      ],
    },
    foodPairings: [
      {
        dish: "Pește la grătar",
        note: "Recomandare din pagina oficială a producătorului.",
        basis: ["producer_evidence"],
        strength: "strong",
      },
      {
        dish: "Salate de fructe",
        note: "Recomandare din pagina oficială a producătorului.",
        basis: ["producer_evidence"],
        strength: "good",
      },
    ],
  },
  {
    key: "chardonnay-3000ml",
    name: "Paznicii Viei Chardonnay, 3L",
    type: "white",
    sweetness: "sec",
    sourceVariant: "chardonnay-3000ml",
    image:
      "https://murfatlar-vinul.ro/wp-content/uploads/2023/10/pack-paznicii_3.png",
    tastingNotes:
      "Culoare: limpede, galben-auriu cu nuanțe verzui. Miros: de citrice și fructe tropicale, la care se adaugă note de pere. Gust: expresiv, proaspăt și persistent, cu nuanțe de coajă de portocală, ușor amărui, cu aciditate fină, delicată și cu o mineralitate dată de solul calcaros al podgoriei. Temperatura de servire: 7-10°C.",
    culinaryPairings:
      "Se poate servi foarte bine cu mâncăruri pe bază de carne albă, midii, pește de apă sărată și dulce, preparate din berbecuț, porc, pui la cuptor.",
    editorial: {
      description:
        "Paznicii Viei Chardonnay este un vin alb sec de 3 litri de la Murfatlar, din podgoria Murfatlar, cu denumire de origine controlată și cules târziu. Producătorul îl descrie ca un vin limpede, galben-auriu cu nuanțe verzui, cu citrice, fructe tropicale și pere, gust expresiv și proaspăt, cu note de coajă de portocală și o mineralitate dată de solul calcaros. Se servește la 7-10°C, cu carne albă, midii și pește.",
      tasteProfile:
        "Galben-auriu cu reflexe verzui, citrice, fructe tropicale și pere, gust proaspăt și mineral.",
      thingsYouShouldKnow: [
        "Îmbuteliere bag-in-box de 3 litri, conform paginii oficiale a producătorului.",
        "Denumire de origine controlată Murfatlar, cules târziu.",
        "Prețul și Value Score rămân indisponibile până există o ofertă Profitshare verificată pentru produsul exact.",
      ],
    },
    foodPairings: [
      {
        dish: "Pește și fructe de mare",
        note: "Recomandare din pagina oficială a producătorului.",
        basis: ["producer_evidence"],
        strength: "strong",
      },
      {
        dish: "Pui la cuptor",
        note: "Recomandare din pagina oficială a producătorului.",
        basis: ["producer_evidence"],
        strength: "good",
      },
    ],
  },
];

function sourceUrl(variant: Variant): string {
  const url = new URL(PRODUCER_PAGE);
  url.searchParams.set("variant", variant.sourceVariant);
  return url.toString();
}

async function main() {
  const apply = process.argv.includes("--apply");
  const winery = await db.query.wineries.findFirst({
    where: eq(wineries.slug, "murfatlar"),
    columns: { id: true, name: true },
  });
  if (!winery) throw new Error("Winery Murfatlar is missing.");
  const region = await db.query.regions.findFirst({
    where: eq(regions.slug, "murfatlar"),
    columns: { id: true },
  });

  for (const variant of VARIANTS) {
    const slug = buildWineSlug({
      producer: PRODUCER,
      name: variant.name,
      vintage: null,
    });
    const source = sourceUrl(variant);
    const existing = await db.query.wines.findFirst({
      where: or(eq(wines.slug, slug), eq(wines.sourceUrl, source)),
      columns: { id: true, slug: true, status: true },
    });
    console.log(
      JSON.stringify({
        key: variant.key,
        slug,
        source,
        action: existing ? "existing" : apply ? "create" : "dry-run",
        existing,
      }),
    );
    if (existing || !apply) continue;

    const [created] = await db
      .insert(wines)
      .values({
        slug,
        name: variant.name,
        wineryId: winery.id,
        regionId: region?.id ?? null,
        type: variant.type,
        sweetness: variant.sweetness,
        vintage: null,
        grapeVarieties: variant.name.includes("Merlot")
          ? [{ name: "Merlot" }, { name: "Cabernet Sauvignon" }]
          : [{ name: variant.name.includes("Chardonnay") ? "Chardonnay" : "Cabernet Sauvignon" }],
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
        tastingNotes: variant.tastingNotes,
        descriptionEditorial: variant.editorial.description,
        tasteProfile: variant.editorial.tasteProfile,
        thingsYouShouldKnow: variant.editorial.thingsYouShouldKnow,
        foodPairings: variant.foodPairings,
        foodPairingNotes: [],
        dessertPairings: [],
        recommendedOccasions: [],
        sourceUrl: source,
        producerPageUrl: PRODUCER_PAGE,
        submittedBy: "admin-cli",
        submitType: "community",
        status: "verified",
        imageUrl: variant.image,
        imageSource: "producer",
        imageAlt: buildWineImageAlt({
          name: variant.name,
          wineryName: winery.name,
          type: variant.type,
        }),
        availability: [],
        affiliateLinks: [],
        producerContent: {
          tastingNotes: variant.tastingNotes,
          culinaryPairings: variant.culinaryPairings,
          sourceUrls: [PRODUCER_PAGE],
          extractedAt: new Date().toISOString(),
          sourceType: "producer_page",
          extractionMethod: "deterministic",
        },
      })
      .returning({ id: wines.id, slug: wines.slug });
    console.log(JSON.stringify({ created }));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
