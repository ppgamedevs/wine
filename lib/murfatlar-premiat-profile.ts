import type { EditorialFoodPairingNote } from "@/lib/schema";
import type { WineType } from "@/types";

export const PREMIAT_PRODUCER_PAGE = "https://murfatlar-vinul.ro/premiat/";
export const PREMIAT_RANGE = "Premiat Eticheta Neagra";
export const PREMIAT_PRODUCER = "Murfatlar";

export type PremiatColour = "rosu" | "alb" | "roze";

export interface PremiatVariant {
  key: PremiatColour;
  label: string;
  name: string;
  type: WineType;
  sweetness: "demisec";
  bottleSizeMl: 750;
  sourceVariant: string;
  image: string;
  servingTemperature: string;
  tastingNotes: string;
  culinaryPairings: string;
  foodNotes: EditorialFoodPairingNote[];
  editorial: {
    description: string;
    tasteProfile: string;
    thingsYouShouldKnow: string[];
  };
}

const PREMIAT_VARIANTS: PremiatVariant[] = [
  {
    key: "rosu",
    label: "Roșu",
    name: "Premiat Eticheta Neagra Roșu, 0.75L",
    type: "red",
    sweetness: "demisec",
    bottleSizeMl: 750,
    sourceVariant: "rosu-750ml",
    image: "/images/wines/murfatlar-premiat-eticheta-neagra-rosu-750ml.webp",
    servingTemperature: "14-16°C",
    tastingNotes:
      "Culoare: roșu-rubiniu, limpede. Miros: caracteristic strugurelui. Gust: taninuri moi, aciditate medie, vin tânăr, proaspăt, cu fructuozitate delicată. Temperatura de servire: 14-16°C.",
    culinaryPairings:
      "Preparate din carne roșie, miel și specialități la grătar.",
    foodNotes: [
      {
        dish: "Carne roșie la grătar",
        note: "Recomandarea producătorului pentru acest vin demisec.",
      },
      { dish: "Miel", note: "Asociere indicată de producător." },
      {
        dish: "Specialități la grătar",
        note: "Asociere indicată de producător.",
      },
    ],
    editorial: {
      description:
        "Un vin roșu demisec de la Murfatlar, din gama Premiat Eticheta Neagra. Producătorul descrie un vin tânăr, proaspăt, cu taninuri moi și fructuozitate delicată, gândit pentru mesele cu carne roșie și grătar.",
      tasteProfile:
        "Roșu-rubiniu, taninuri moi, aciditate medie, fructuozitate delicată; este descris de producător ca un vin tânăr și proaspăt.",
      thingsYouShouldKnow: [
        "Producătorul descrie taninuri moi și aciditate medie.",
        "Asocierea culinară este indicată de producător, nu evaluată independent de VinIntel.",
      ],
    },
  },
  {
    key: "alb",
    label: "Alb",
    name: "Premiat Eticheta Neagra Alb, 0.75L",
    type: "white",
    sweetness: "demisec",
    bottleSizeMl: 750,
    sourceVariant: "alb-750ml",
    image: "/images/wines/murfatlar-premiat-eticheta-neagra-alb-750ml.webp",
    servingTemperature: "6-8°C",
    tastingNotes:
      "Culoare: galben-verzui, limpede. Miros: caracteristic strugurelui. Gust: plăcut, lejer, de o corpolență medie, aciditate bună, cu gust remanent suculent. Temperatura de servire: 6-8°C.",
    culinaryPairings:
      "Specialități de pește, crustacee, fructe de mare, pui și cărnuri slabe.",
    foodNotes: [
      {
        dish: "Pește și fructe de mare",
        note: "Recomandarea producătorului pentru acest vin demisec.",
      },
      { dish: "Crustacee", note: "Asociere indicată de producător." },
      {
        dish: "Pui și cărnuri slabe",
        note: "Asociere indicată de producător.",
      },
    ],
    editorial: {
      description:
        "Un vin alb demisec din gama Premiat Eticheta Neagra, produs de Murfatlar. Producătorul îl descrie ca lejer, cu corpolență medie, aciditate bună și un gust remanent suculent.",
      tasteProfile:
        "Galben-verzui, lejer, corpolență medie, aciditate bună, gust remanent suculent; descriere preluată de la producător.",
      thingsYouShouldKnow: [
        "Producătorul descrie un vin lejer, cu aciditate bună.",
        "Soiurile nu sunt precizate în sursa oficială consultată; nu le inventăm.",
      ],
    },
  },
  {
    key: "roze",
    label: "Roze",
    name: "Premiat Eticheta Neagra Roze, 0.75L",
    type: "rose",
    sweetness: "demisec",
    bottleSizeMl: 750,
    sourceVariant: "roze-750ml",
    image: "/images/wines/murfatlar-premiat-eticheta-neagra-roze-750ml.webp",
    servingTemperature: "8-9°C",
    tastingNotes:
      "Culoare: roz, cu nuanțe de somon. Miros: delicat, fructat, de cireșe crude. Gust: plăcut, lejer, cu aciditate medie. Temperatura de servire: 8-9°C.",
    culinaryPairings:
      "Mezeluri din carne de porc, brânzeturi proaspete de oaie și capră, legume crude.",
    foodNotes: [
      {
        dish: "Mezeluri din porc",
        note: "Recomandarea producătorului pentru acest vin demisec.",
      },
      {
        dish: "Brânzeturi proaspete de oaie și capră",
        note: "Asociere indicată de producător.",
      },
      { dish: "Legume crude", note: "Asociere indicată de producător." },
    ],
    editorial: {
      description:
        "Un roze demisec din gama Premiat Eticheta Neagra, produs de Murfatlar. Producătorul descrie note de cireșe crude, un gust lejer și aciditate medie.",
      tasteProfile:
        "Roz cu nuanțe de somon, delicat, fructat, cireșe crude, lejer, aciditate medie; descriere preluată de la producător.",
      thingsYouShouldKnow: [
        "Producătorul descrie un roze fructat, cu note de cireșe crude.",
        "Nu există date oficiale despre soiuri în sursa consultată.",
      ],
    },
  },
];

export const PREMIAT_VARIANTS_750ML = PREMIAT_VARIANTS;

export function premiatSourceUrl(variant: PremiatVariant): string {
  const url = new URL(PREMIAT_PRODUCER_PAGE);
  url.searchParams.set("variant", variant.sourceVariant);
  return url.toString();
}

export function premiatIdentityKey(variant: PremiatVariant): string {
  return [
    PREMIAT_PRODUCER.toLowerCase(),
    PREMIAT_RANGE.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    variant.key,
    variant.sweetness,
    "750ml",
    "nv",
  ].join("|");
}

export function premiatVariantByKey(key: PremiatColour): PremiatVariant | null {
  return PREMIAT_VARIANTS.find((variant) => variant.key === key) ?? null;
}
