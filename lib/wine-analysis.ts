import { formatRon } from "@/lib/format";
import { WINE_TYPE_TO_TOP_SLUG } from "@/lib/top-lists";
import type { WineWithRelations } from "@/types";

export interface WorthItAnalysis {
  verdict: "da" | "partial" | "nu";
  headline: string;
  summary: string;
  bullets: string[];
}

const overpricedLabel = {
  low: "risc scazut de suprapret",
  medium: "risc moderat de suprapret",
  high: "risc ridicat de suprapret",
} as const;

export function buildWorthItAnalysis(wine: WineWithRelations): WorthItAnalysis {
  const value = wine.valueScore ?? 0;
  const price = wine.priceAvg;
  const risk = wine.overpricedRisk ?? "medium";

  if (value >= 85 && risk !== "high") {
    return {
      verdict: "da",
      headline: "Da, merita banii",
      summary: `${wine.name} ofera un raport calitate-pret solid la ${formatRon(price)}, cu Value Score ${value}/100 si ${overpricedLabel[risk]}.`,
      bullets: [
        `Value Score ${value}/100: printre cele mai bune optiuni din segmentul sau de pret.`,
        wine.foodMatchScore
          ? `Food Match ${wine.foodMatchScore}/100: se potriveste bine cu mancarea romaneasca clasica.`
          : "Se potriveste bine cu preparate traditionale romanesti.",
        wine.cellarPotential
          ? `Potential de invechire ${wine.cellarPotential}/10 ani: poate evolua frumos in pivnita.`
          : "Potrivit pentru consum in urmatorii 2-3 ani.",
        wine.beginnerFriendly
          ? "Accesibil si pentru incepatori: profil echilibrat, fara surprize neplacute."
          : "Profil mai complex, recomandat celor cu experienta in vinuri.",
      ],
    };
  }

  if (value >= 75) {
    return {
      verdict: "partial",
      headline: "Merita, cu rezerve",
      summary: `${wine.name} este o alegere decenta la ${formatRon(price)}, dar exista alternative cu Value Score mai bun in acelasi buget.`,
      bullets: [
        `Value Score ${value}/100: peste medie, dar nu exceptional.`,
        overpricedLabel[risk] === "risc ridicat de suprapret"
          ? "Atentie la pret: exista sanse sa gasesti variante mai bune la acelasi cost."
          : "Pretul este rezonabil pentru calitatea oferita.",
        wine.giftScore && wine.giftScore >= 80
          ? `Gift Score ${wine.giftScore}/100: functioneaza bine ca dar.`
          : "Mai potrivit pentru consum personal decat ca dar premium.",
        "Compara cu recomandarile noastre din aceeasi regiune inainte de cumparare.",
      ],
    };
  }

  return {
    verdict: "nu",
    headline: "Nu prea merita la pretul actual",
    summary: `La ${formatRon(price)}, ${wine.name} are Value Score ${value}/100. Recomandam alternative cu raport mai bun calitate-pret.`,
    bullets: [
      `Value Score ${value}/100: sub pragul nostru de recomandare activa.`,
      overpricedLabel[risk],
      "Verifica sectiunea de recomandari pentru vinuri similare la pret mai bun.",
      wine.ratingCount > 100
        ? `Bazat pe ${wine.ratingCount} evaluari si date de piata actualizate.`
        : "Date limitate: asteapta actualizarea preturilor inainte de cumparare.",
    ],
  };
}

export interface WineFaqItem {
  question: string;
  answer: string;
}

export function buildWineFaq(wine: WineWithRelations): WineFaqItem[] {
  const wineryName = wine.winery?.name ?? "crama producatoare";
  const regionName = wine.region?.name ?? "Romania";
  const price = formatRon(wine.priceAvg);
  const topPairing = wine.foodPairings[0]?.dish ?? "mancare traditionala romaneasca";

  return [
    {
      question: `Cat costa ${wine.name}?`,
      answer: `Pretul mediu actual este ${price}, urmarit in magazine din Romania. Preturile pot varia in functie de retailer si promotii.`,
    },
    {
      question: `Ce mancare se potriveste cu ${wine.name}?`,
      answer: `Recomandam in special ${topPairing}. Vinul are Food Match Score ${wine.foodMatchScore ?? "N/A"}/100 pentru preparate romanesti.`,
    },
    {
      question: `Merita ${wine.name} banii?`,
      answer: buildWorthItAnalysis(wine).summary,
    },
    {
      question: `Cine produce ${wine.name}?`,
      answer: `${wine.name} este produs de ${wineryName}, din regiunea ${regionName}. ${wine.winery?.verified ? "Crama este verificata in baza noastra de date." : "Crama nu este inca verificata oficial de VinIntel."}`,
    },
    {
      question: `Ce inseamna Value Score ${wine.valueScore ?? "N/A"}?`,
      answer:
        "Value Score este un indicator de la 0 la 100 care masoara cat de bun este vinul raportat la pretul cerut. Peste 85 inseamna excelent raport calitate-pret.",
    },
  ];
}

export function buildProgrammaticLinks(wine: WineWithRelations) {
  const links: { label: string; href: string }[] = [];

  if (wine.region?.slug) {
    links.push({
      label: `Vinuri din ${wine.region.name}`,
      href: `/regiuni/${wine.region.slug}`,
    });
  }

  if (wine.winery?.slug) {
    links.push({
      label: `Toate vinurile ${wine.winery.name}`,
      href: `/wineries/${wine.winery.slug}`,
    });
  }

  links.push({
    label: `Top vinuri ${wine.type === "red" ? "rosii" : wine.type === "white" ? "albe" : wine.type}`,
    href: `/topuri/vinuri-${WINE_TYPE_TO_TOP_SLUG[wine.type]}`,
  });

  if (wine.priceAvg && wine.priceAvg <= 50) {
    links.push({
      label: "Cele mai bune vinuri sub 50 lei",
      href: "/topuri/vinuri-sub-50-lei",
    });
  }

  const topDish = wine.foodPairings[0]?.dish;
  if (topDish) {
    const dishSlug = topDish
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");
    links.push({
      label: `Vinuri pentru ${topDish.toLowerCase()}`,
      href: `/perechi/${dishSlug}`,
    });
  }

  return links;
}
