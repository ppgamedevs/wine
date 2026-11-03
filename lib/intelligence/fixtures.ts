import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SourceFixture, WineIntelligenceInput } from "@/lib/intelligence/types";

const fixtureDir = join(process.cwd(), "lib", "fixtures");

function read(name: string): string {
  return readFileSync(join(fixtureDir, name), "utf8");
}

export const MURFATLAR_ZESTREA_URL = "https://murfatlar-vinul.ro/zestrea/";
export const AUCHAN_TARGET_URL =
  "https://www.auchan.ro/vin-alb-demisec-murfatlar-zestrea-muscat-ottonel-0-75-l-sgr/p";

export function loadTargetSources(): SourceFixture[] {
  return [
    {
      url: MURFATLAR_ZESTREA_URL,
      title: "Murfatlar Zestrea — official producer page",
      kind: "html",
      body: read("murfatlar-zestrea.html"),
      observedAt: "2026-11-03T11:56:00.000Z",
      classification: "official_producer_page",
    },
    {
      url: AUCHAN_TARGET_URL,
      title: "Auchan — Vin alb demisec Murfatlar Zestrea, Muscat Ottonel, 0.75 l",
      kind: "json",
      body: read("zestrea-muscat-ottonel-demisec-retailer.json"),
      observedAt: "2026-11-03T11:56:00.000Z",
      classification: "retailer",
    },
  ];
}

export function loadTargetWine(): WineIntelligenceInput {
  return {
    id: 418,
    slug: "murfatlar-zestrea-muscat-ottonel-demisec-0-75l",
    name: "Zestrea Muscat Ottonel Demisec",
    producer: "Murfatlar",
    range: "Zestrea",
    vintage: null,
    color: "alb",
    sweetness: "demisec",
    grapeVarieties: ["Muscat Ottonel"],
    bottleSizeMl: 750,
    sourceUrl: MURFATLAR_ZESTREA_URL,
    producerPageUrl: MURFATLAR_ZESTREA_URL,
    region: "Murfatlar",
    country: "Romania",
    currentFacts: {
      producer: "Murfatlar",
      range: "Zestrea",
      product_name: "Muscat Ottonel",
      grape_varieties: ["Muscat Ottonel"],
      bottle_volume: 750,
      wine_color: "alb",
      sweetness: "demisec",
      serving_temperature: "7-8",
      visual_appearance: ["galben-verzui"],
      aroma_descriptors: ["caracteristic soiului", "plăcut", "îmbietor"],
      taste_descriptors: [
        "echilibrat",
        "aciditate medie",
        "fructe verzi",
        "final remanent savuros",
      ],
    },
  };
}
