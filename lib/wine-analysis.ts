import { resolveCellarDisplay } from "@/lib/cellar-display";
import {
  getVerifiedTechnicalValue,
  type PublicTechnicalTrust,
} from "@/lib/tech-facts/public-trust";
import { formatRon } from "@/lib/format";
import {
  MIN_RECOMMENDED_VALUE_SCORE,
  VALUE_SCORE_NEUTRAL_MIN,
  valueScoreVerdictLabel,
} from "@/lib/value-score-thresholds";
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
  const priceLabel = formatRon(price);
  const risk = wine.overpricedRisk ?? "medium";

  if (value >= MIN_RECOMMENDED_VALUE_SCORE) {
    return {
      verdict: "da",
      headline: valueScoreVerdictLabel(value),
      summary: `${wine.name} ofera un raport calitate-pret solid la ${priceLabel}, cu Value Score ${value}/100 si ${overpricedLabel[risk]}.`,
      bullets: [
        `Value Score ${value}/100: peste pragul nostru de recomandare (${MIN_RECOMMENDED_VALUE_SCORE}/100).`,
        wine.foodMatchScore
          ? `Versatilitate la masa ${wine.foodMatchScore}/100: utilitate larga la masa, nu potrivire cu un fel anume.`
          : "Se potriveste bine cu preparate traditionale romanesti.",
        (() => {
          const cellar = resolveCellarDisplay({
            type: wine.type,
            price: wine.currentPrice ?? wine.priceAvg,
            cellarPotential: wine.cellarPotential,
            drinkabilityStart: wine.drinkabilityStart,
            drinkabilityEnd: wine.drinkabilityEnd,
            producerContent: wine.producerContent,
          });
          if (cellar?.kind === "verified") {
            return `${cellar.label}: ${cellar.value}.`;
          }
          return "Orientare generala de pastrare: consum in urmatorii 2-3 ani, daca nu exista fereastra documentata.";
        })(),
        wine.beginnerFriendly
          ? "Accesibil si pentru incepatori: profil echilibrat, fara surprize neplacute."
          : "Profil mai complex, recomandat celor cu experienta in vinuri.",
      ],
    };
  }

  if (value >= VALUE_SCORE_NEUTRAL_MIN) {
    return {
      verdict: "partial",
      headline: valueScoreVerdictLabel(value),
      summary: `${wine.name} este o alegere acceptabila la ${priceLabel}, cu Value Score ${value}/100. Nu iese in evidenta, dar nici nu dezamageste daca stii ce cauti.`,
      bullets: [
        `Value Score ${value}/100: in zona de pret mediu (${VALUE_SCORE_NEUTRAL_MIN}-${MIN_RECOMMENDED_VALUE_SCORE - 1}).`,
        overpricedLabel[risk] === "risc ridicat de suprapret"
          ? "Atentie la pret: pentru acelasi buget pot exista optiuni cu scor mai bun."
          : "Pretul este rezonabil pentru calitatea oferita, fara a fi o achizitie evidenta.",
        wine.giftScore && wine.giftScore >= 80
          ? `Gift Score ${wine.giftScore}/100: functioneaza bine ca dar.`
          : "Mai potrivit pentru consum personal decat ca dar premium.",
        `Pentru recomandari clare, cauta vinuri cu cel putin ${MIN_RECOMMENDED_VALUE_SCORE}/100 Value Score.`,
      ],
    };
  }

  return {
    verdict: "nu",
    headline: valueScoreVerdictLabel(value),
    summary: `La ${priceLabel}, ${wine.name} are Value Score ${value}/100. Recomandam alternative cu raport mai bun calitate-pret.`,
    bullets: [
      `Value Score ${value}/100: sub pragul de ${VALUE_SCORE_NEUTRAL_MIN}/100 pentru o recomandare neutra.`,
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
  const topPairing =
    wine.foodPairings?.[0]?.dish ?? "mancare traditionala romaneasca";

  return [
    {
      question: `Cat costa ${wine.name}?`,
      answer: `Pretul mediu actual este ${price}, urmarit in magazine din Romania. Preturile pot varia in functie de retailer si promotii.`,
    },
    {
      question: `Ce mancare se potriveste cu ${wine.name}?`,
      answer: `Recomandam in special ${topPairing}. Versatilitatea la masa este ${wine.foodMatchScore ?? "N/A"}/100; potrivirea de fel se calculeaza separat.`,
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
      answer: `Value Score masoara raportul calitate-pret de la 0 la 100. Peste ${MIN_RECOMMENDED_VALUE_SCORE} inseamna ca merita banii, intre ${VALUE_SCORE_NEUTRAL_MIN} si ${MIN_RECOMMENDED_VALUE_SCORE - 1} este pret mediu, sub ${VALUE_SCORE_NEUTRAL_MIN} recomandam alternative.`,
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

  const topDish = wine.foodPairings?.[0]?.dish;
  if (topDish) {
    const dishSlug = topDish
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");
    links.push({
      label: `Vinuri pentru ${topDish.toLowerCase()}`,
      href: `/vin-pentru/${dishSlug}`,
    });
  }

  return links;
}

export interface WineProsCons {
  pros: string[];
  cons: string[];
}

export function buildWineProsCons(
  wine: WineWithRelations,
  technicalTrust: PublicTechnicalTrust,
): WineProsCons {
  const pros: string[] = [];
  const cons: string[] = [];
  const value = wine.valueScore ?? 0;

  if (value >= MIN_RECOMMENDED_VALUE_SCORE) {
    pros.push(`Value Score ${value}/100: recomandare clara la acest pret.`);
  } else if (value >= VALUE_SCORE_NEUTRAL_MIN) {
    pros.push(`Value Score ${value}/100: alegere acceptabila, fara surprize majore.`);
  }

  if (wine.foodMatchScore && wine.foodMatchScore >= 75) {
    pros.push(`Versatilitate la masa ${wine.foodMatchScore}/100: compatibilitate larga, nu un fel anume.`);
  }

  if (wine.giftScore && wine.giftScore >= 80) {
    pros.push(`Gift Score ${wine.giftScore}/100: functioneaza bine ca dar.`);
  }

  if (wine.beginnerFriendly) {
    pros.push("Profil accesibil pentru incepatori.");
  }

  const cellar = resolveCellarDisplay({
    type: wine.type,
    price: wine.currentPrice ?? wine.priceAvg,
    cellarPotential: wine.cellarPotential,
    drinkabilityStart: wine.drinkabilityStart,
    drinkabilityEnd: wine.drinkabilityEnd,
    producerContent: wine.producerContent,
  });
  if (cellar?.kind === "verified") {
    pros.push(`${cellar.label}: ${cellar.value}.`);
  }

  const risk = wine.overpricedRisk ?? "medium";
  if (risk === "high") {
    cons.push("Risc ridicat de suprapret fata de alternative similare.");
  } else if (risk === "medium" && value < MIN_RECOMMENDED_VALUE_SCORE) {
    cons.push("Pretul poate fi optimizat: exista optiuni cu scor mai bun.");
  }

  const verifiedAlcohol = getVerifiedTechnicalValue(
    technicalTrust,
    "alcohol",
  );
  if (typeof verifiedAlcohol === "number" && verifiedAlcohol >= 14.5) {
    cons.push(
      `Alcool ${verifiedAlcohol}%: mai potrivit cu mâncare consistentă.`,
    );
  }

  if (value < VALUE_SCORE_NEUTRAL_MIN) {
    cons.push(`Value Score sub ${VALUE_SCORE_NEUTRAL_MIN}/100: recomandam alternative.`);
  }

  if (!wine.priceAvg) {
    cons.push("Pret indisponibil: verifica sursa inainte de cumparare.");
  }

  if (pros.length === 0) {
    pros.push("Date limitate: urmeaza actualizarea preturilor si a scorurilor.");
  }

  return { pros: pros.slice(0, 4), cons: cons.slice(0, 4) };
}
