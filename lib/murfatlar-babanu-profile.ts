export const BABANU_PRODUCER = "Murfatlar";
export const BABANU_RANGE = "Babanu";
export const BABANU_PRODUCER_PAGE = "https://murfatlar-vinul.ro/babanu/";

export type BabanuVariantKey =
  | "rosu-demidulce"
  | "rosu-demisec"
  | "alb-demidulce"
  | "alb-demisec"
  | "roze-demidulce";

export interface BabanuVariant {
  key: BabanuVariantKey;
  name: string;
  type: "red" | "white" | "rose";
  sweetness: "demidulce" | "demisec";
  sourceVariant: string;
  image: string;
  tastingNotes: string;
  culinaryPairings: string;
  foodNotes: Array<{ dish: string; note: string }>;
  editorial: {
    description: string;
    tasteProfile: string;
    thingsYouShouldKnow: string[];
  };
}

/**
 * Source-backed Babanu 2 L profiles. Only facts visible on the official producer
 * page and product images are recorded here. Grape varieties, vintage and
 * awards are deliberately not inferred.
 */
export const BABANU_VARIANTS: BabanuVariant[] = [
  {
    key: "rosu-demidulce",
    name: "Babanu Roșu Demidulce, 2L",
    type: "red",
    sweetness: "demidulce",
    sourceVariant: "rosu-demidulce-2000ml",
    image: "/images/wines/murfatlar-babanu-rosu-demidulce-2000ml.webp",
    tastingNotes:
      "Culoare: limpede, roșu-rubiniu. Miros: caracteristic de strugure. Gust: plăcut, cu note dulci, taninuri moi, aciditate medie, un vin tânăr. Temperatura de servire: 14-16°C.",
    culinaryPairings:
      "Se poate servi cu toate tipurile de mâncăruri, un vin puțin pretențios la asocierea culinară.",
    foodNotes: [],
    editorial: {
      description:
        "Babanu Roșu Demidulce este un vin roșu de 2 litri de la Murfatlar, descris de producător ca un vin tânăr, cu taninuri moi și note dulci. O alegere simplă pentru mesele de zi cu zi, fără pretenții de pairing complicat.",
      tasteProfile:
        "Roșu-rubiniu, cu miros caracteristic de strugure și gust plăcut, cu note dulci, taninuri moi și aciditate medie.",
      thingsYouShouldKnow: [
        "Îmbuteliere de 2 litri, conform etichetei.",
        "Producătorul îl descrie ca fiind potrivit pentru toate tipurile de mâncăruri.",
        "Nu există date oficiale despre soiuri sau recoltă în sursa consultată.",
      ],
    },
  },
  {
    key: "rosu-demisec",
    name: "Babanu Roșu Demisec, 2L",
    type: "red",
    sweetness: "demisec",
    sourceVariant: "rosu-demisec-2000ml",
    image: "/images/wines/murfatlar-babanu-rosu-demisec-2000ml.webp",
    tastingNotes:
      "Culoare: limpede, roșu-rubiniu. Miros: caracteristic de strugure. Gust: plăcut, cu taninuri moi, aciditate medie, un vin tânăr. Temperatura de servire: 14-16°C.",
    culinaryPairings:
      "Se poate servi cu toate tipurile de mâncăruri, un vin puțin pretențios la asocierea culinară.",
    foodNotes: [],
    editorial: {
      description:
        "Babanu Roșu Demisec este varianta mai puțin dulce a vinului roșu Babanu de 2 litri. Producătorul îl descrie ca un vin tânăr, cu taninuri moi și aciditate medie, gândit pentru mesele obișnuite.",
      tasteProfile:
        "Roșu-rubiniu, cu miros caracteristic de strugure, taninuri moi și aciditate medie.",
      thingsYouShouldKnow: [
        "Îmbuteliere de 2 litri, conform etichetei.",
        "Producătorul îl descrie ca fiind potrivit pentru toate tipurile de mâncăruri.",
        "Nu există date oficiale despre soiuri sau recoltă în sursa consultată.",
      ],
    },
  },
  {
    key: "alb-demidulce",
    name: "Babanu Alb Demidulce, 2L",
    type: "white",
    sweetness: "demidulce",
    sourceVariant: "alb-demidulce-2000ml",
    image: "/images/wines/murfatlar-babanu-alb-demidulce-2000ml.webp",
    tastingNotes:
      "Culoare: limpede, galben-auriu. Miros: caracteristic de strugure bine copt. Gust: fructat, bogat, plăcut, un vin lejer, aciditate medie. Temperatura de servire: 7-9°C.",
    culinaryPairings:
      "Se poate servi cu toate tipurile de mâncăruri, un vin puțin pretențios la asocierea culinară.",
    foodNotes: [],
    editorial: {
      description:
        "Babanu Alb Demidulce este un vin alb de 2 litri de la Murfatlar, cu miros de strugure bine copt și gust fructat, bogat, dar lejer. Este descris de producător ca o opțiune flexibilă pentru masă.",
      tasteProfile:
        "Galben-auriu, fructat și bogat, cu aciditate medie și un gust lejer.",
      thingsYouShouldKnow: [
        "Îmbuteliere de 2 litri, conform etichetei.",
        "Producătorul îl descrie ca fiind potrivit pentru toate tipurile de mâncăruri.",
        "Nu există date oficiale despre soiuri sau recoltă în sursa consultată.",
      ],
    },
  },
  {
    key: "alb-demisec",
    name: "Babanu Alb Demisec, 2L",
    type: "white",
    sweetness: "demisec",
    sourceVariant: "alb-demisec-2000ml",
    image: "/images/wines/murfatlar-babanu-alb-demisec-2000ml.webp",
    tastingNotes:
      "Culoare: limpede, galben-auriu. Miros: caracteristic de strugure pârguit. Gust: echilibrat, bogat, plăcut, un vin lejer, aciditate medie. Temperatura de servire: 7-9°C.",
    culinaryPairings:
      "Se poate servi cu toate tipurile de mâncăruri, un vin puțin pretențios la asocierea culinară.",
    foodNotes: [],
    editorial: {
      description:
        "Babanu Alb Demisec este varianta mai puțin dulce a vinului alb Babanu de 2 litri. Producătorul descrie un vin echilibrat, bogat și lejer, cu miros de strugure pârguit.",
      tasteProfile:
        "Galben-auriu, echilibrat și bogat, cu aciditate medie și un gust lejer.",
      thingsYouShouldKnow: [
        "Îmbuteliere de 2 litri, conform etichetei.",
        "Producătorul îl descrie ca fiind potrivit pentru toate tipurile de mâncăruri.",
        "Nu există date oficiale despre soiuri sau recoltă în sursa consultată.",
      ],
    },
  },
  {
    key: "roze-demidulce",
    name: "Babanu Roze Demidulce, 2L",
    type: "rose",
    sweetness: "demidulce",
    sourceVariant: "roze-demidulce-2000ml",
    image: "/images/wines/murfatlar-babanu-roze-demidulce-2000ml.webp",
    tastingNotes:
      "Culoare: roz intens. Miros: de intensitate medie, fructat și vegetal, aromă distinctă de fructe. Gust: un vin cu aciditate medie, lejer, ușor fructat. Temperatura de servire: 8-10°C.",
    culinaryPairings:
      "Se recomandă cu mâncăruri de carne albă, pește de apă dulce, preparate de legume, brânză, carne de porc.",
    foodNotes: [
      { dish: "Carne albă", note: "Recomandare din sursa producătorului." },
      {
        dish: "Pește de apă dulce",
        note: "Recomandare din sursa producătorului.",
      },
      {
        dish: "Preparate de legume",
        note: "Recomandare din sursa producătorului.",
      },
      { dish: "Brânză", note: "Recomandare din sursa producătorului." },
      { dish: "Carne de porc", note: "Recomandare din sursa producătorului." },
    ],
    editorial: {
      description:
        "Babanu Roze Demidulce este un vin roze de 2 litri de la Murfatlar, cu aromă fructată și vegetală și un gust lejer, ușor fructat. Producătorul îl recomandă la carne albă, pește de apă dulce, legume, brânză și carne de porc.",
      tasteProfile:
        "Roz intens, fructat și vegetal, cu aciditate medie și un gust lejer, ușor fructat.",
      thingsYouShouldKnow: [
        "Îmbuteliere de 2 litri, conform etichetei.",
        "Producătorul recomandă asocierea cu carne albă, pește de apă dulce, legume, brânză și carne de porc.",
        "Nu există date oficiale despre soiuri sau recoltă în sursa consultată.",
      ],
    },
  },
];

export function babanuSourceUrl(variant: BabanuVariant): string {
  const url = new URL(BABANU_PRODUCER_PAGE);
  url.searchParams.set("variant", variant.sourceVariant);
  return url.toString();
}

export function babanuIdentityKey(variant: BabanuVariant): string {
  return [
    BABANU_PRODUCER.toLowerCase(),
    BABANU_RANGE.toLowerCase(),
    variant.key,
    variant.sweetness,
    "2000ml",
    "nv",
  ].join("|");
}
