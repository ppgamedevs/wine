import { resolveCellarDisplay } from "@/lib/cellar-display";
import {
  getVerifiedTechnicalValue,
  type PublicTechnicalTrust,
} from "@/lib/tech-facts/public-trust";
import { resolvePublicWinePairings } from "@/lib/public-wine-pairings";
import { formatRon } from "@/lib/format";
import {
  MIN_RECOMMENDED_VALUE_SCORE,
  VALUE_SCORE_NEUTRAL_MIN,
  valueScoreVerdictLabel,
} from "@/lib/value-score-thresholds";
import { WINE_TYPE_TO_TOP_SLUG } from "@/lib/top-lists";
import { resolveWineDisplayPrice } from "@/lib/wine-price";
import { resolvePublicQualityScore } from "@/lib/public-quality-score";
import type { WineWithRelations } from "@/types";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";

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

function englishWorthItAnalysis(wine: WineWithRelations): WorthItAnalysis {
  const value = wine.valueScore ?? 0;
  const price = resolveWineDisplayPrice(wine);
  if (price == null) {
    return {
      verdict: "partial",
      headline: "Price currently unavailable",
      summary:
        "We cannot confirm current value without a qualified Profitshare offer. No price-based recommendation is shown.",
      bullets: [
        "We do not assume a price when no qualified offer is available.",
        "Compare alternatives with a verifiable Profitshare price before buying.",
      ],
    };
  }

  if (wine.valueScore == null) {
    return {
      verdict: "partial",
      headline: "Value Score unavailable",
      summary:
        "We have a qualified Profitshare offer, but not enough evidence to calculate a reliable Value Score.",
      bullets: [
        "We do not substitute an invented score when price or quality evidence is insufficient.",
        "Compare the qualified offer with similar wines before buying.",
      ],
    };
  }

  const priceLabel = formatRon(price, "en");
  if (value >= MIN_RECOMMENDED_VALUE_SCORE) {
    return {
      verdict: "da",
      headline: "Good value for money",
      summary: `${wine.name} offers good value at ${priceLabel}, with a Value Score of ${value}/100.`,
      bullets: [
        `Value Score ${value}/100 is above our ${MIN_RECOMMENDED_VALUE_SCORE}/100 recommendation threshold.`,
        "Check the separately evaluated food pairings for this wine.",
      ],
    };
  }
  if (value >= VALUE_SCORE_NEUTRAL_MIN) {
    return {
      verdict: "partial",
      headline: "Fair value",
      summary: `${wine.name} is a reasonable choice at ${priceLabel}, with a Value Score of ${value}/100.`,
      bullets: [
        `Value Score ${value}/100 is in the fair-price range.`,
        `For a clearer recommendation, look for at least ${MIN_RECOMMENDED_VALUE_SCORE}/100.`,
      ],
    };
  }
  return {
    verdict: "nu",
    headline: "Better value is available",
    summary: `At ${priceLabel}, ${wine.name} has a Value Score of ${value}/100. We recommend comparing better-value alternatives.`,
    bullets: [
      `Value Score ${value}/100 is below the neutral ${VALUE_SCORE_NEUTRAL_MIN}/100 threshold.`,
      "Check similar wines with a better price-to-quality ratio.",
    ],
  };
}

export function buildWorthItAnalysis(
  wine: WineWithRelations,
  locale: AppLocale = "ro",
): WorthItAnalysis {
  if (locale === "en") return englishWorthItAnalysis(wine);
  const value = wine.valueScore ?? 0;
  const price = resolveWineDisplayPrice(wine);
  const priceLabel = formatRon(price);
  const risk = wine.overpricedRisk ?? "medium";

  if (price == null) {
    return {
      verdict: "partial",
      headline: "Preț indisponibil momentan",
      summary:
        "Nu putem confirma dacă merită cumpărat acum fără o ofertă Profitshare calificată. Nu afișăm o recomandare bazată pe preț.",
      bullets: [
        "Nu presupunem un preț atunci când oferta nu este disponibilă.",
        "Compară alternativele cu preț Profitshare verificabil înainte de cumpărare.",
      ],
    };
  }

  if (wine.valueScore == null) {
    return {
      verdict: "partial",
      headline: "Value Score indisponibil",
      summary:
        "Avem o ofertă Profitshare calificată, dar nu avem suficiente dovezi pentru un Value Score fiabil.",
      bullets: [
        "Nu înlocuim scorul cu o valoare inventată când datele sunt insuficiente.",
        "Compară oferta calificată cu vinuri similare înainte de cumpărare.",
      ],
    };
  }

  if (value >= MIN_RECOMMENDED_VALUE_SCORE) {
    return {
      verdict: "da",
      headline: valueScoreVerdictLabel(value),
      summary: `${wine.name} ofera un raport calitate-pret solid la ${priceLabel}, cu Value Score ${value}/100 si ${overpricedLabel[risk]}.`,
      bullets: [
        `Value Score ${value}/100: peste pragul nostru de recomandare (${MIN_RECOMMENDED_VALUE_SCORE}/100).`,
        "Vezi asocierile culinare evaluate separat pentru acest vin.",
        (() => {
          const cellar = resolveCellarDisplay({
            type: wine.type,
            price: resolveWineDisplayPrice(wine),
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
          ? "Marcat în catalog ca opțiune accesibilă pentru începători."
          : "Nu este marcat ca alegere specială pentru începători.",
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
        "Verifică secțiunea de utilizare pentru cadou și masă înainte de alegere.",
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

export function buildWineFaq(
  wine: WineWithRelations,
  locale: AppLocale = "ro",
): WineFaqItem[] {
  const wineryName = wine.winery?.name ?? "crama producatoare";
  const regionName = wine.region?.name ?? "Romania";
  const publicPrice = resolveWineDisplayPrice(wine);
  const price =
    publicPrice != null
      ? formatRon(publicPrice, locale)
      : locale === "en"
        ? "Price currently unavailable"
        : "Preț indisponibil";
  const topPairing = resolvePublicWinePairings(wine, 1, locale)[0] ?? null;
  const quality = resolvePublicQualityScore(wine);
  if (locale === "en") {
    const foodAnswer =
      topPairing == null
        ? "We do not yet have enough data for a wine-specific food recommendation."
        : topPairing.score == null
          ? `One recommended pairing is ${topPairing.dish}. ${topPairing.rationale ?? ""}`.trim()
          : `One of the best pairings is ${topPairing.dish}, with a compatibility score of ${topPairing.score}/100. ${topPairing.rationale ?? ""}`.trim();
    return [
      {
        question: `How much does ${wine.name} cost?`,
        answer:
          publicPrice != null
            ? `The current qualified Profitshare price is ${price}. Prices can vary by offer and promotion.`
            : `We do not currently have a qualified Profitshare offer for ${wine.name}, so no public price is shown.`,
      },
      {
        question: `What food pairs with ${wine.name}?`,
        answer: foodAnswer,
      },
      {
        question: `Is ${wine.name} worth the money?`,
        answer: buildWorthItAnalysis(wine, "en").summary,
      },
      {
        question: `Who makes ${wine.name}?`,
        answer: `${wine.name} is made by ${wine.winery?.name ?? "the producer"}, in ${regionName}. ${wine.winery?.verified ? "The winery is verified in our database." : "The winery is not yet officially verified by VinIntel."}`,
      },
      {
        question: `What is the Quality Score of ${wine.name}?`,
        answer:
          quality.status === "known" && quality.score != null
            ? `VinIntel shows a quality score of ${quality.score}/100, based on ${quality.confidence}% evidence confidence. It is independent of price.`
            : "VinIntel does not show a quality score because the available evidence is insufficient. We do not invent one.",
      },
      {
        question: `What does a Value Score of ${publicPrice != null && wine.valueScore != null ? wine.valueScore : "N/A"} mean?`,
        answer:
          publicPrice != null && wine.valueScore != null
            ? `Value Score is VinIntel's value-for-money score from 0 to 100. A score above ${MIN_RECOMMENDED_VALUE_SCORE} indicates good value at the tracked price.`
            : "Value Score is price-dependent. Without a qualified Profitshare offer and sufficient evidence we show an insufficient-data state instead of a value recommendation.",
      },
    ];
  }
  const foodAnswer =
    topPairing == null
      ? "Nu avem încă suficiente date pentru o recomandare culinară specifică acestui vin."
      : topPairing.score == null
        ? `Una dintre asocierile recomandate este ${topPairing.dish}. ${topPairing.rationale ?? ""}`.trim()
        : `Una dintre cele mai bune asocieri este ${topPairing.dish}, cu un scor de compatibilitate de ${topPairing.score}/100. ${topPairing.rationale ?? ""}`.trim();

  return [
    {
      question: `Cat costa ${wine.name}?`,
      answer:
        publicPrice != null
          ? `Pretul curent din oferta Profitshare calificata este ${price}. Preturile pot varia in functie de oferta si promotie.`
          : `Nu avem momentan o oferta Profitshare calificata pentru ${wine.name}, asa ca nu afisam un pret public.`,
    },
    {
      question: `Ce mancare se potriveste cu ${wine.name}?`,
      answer: foodAnswer,
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
      question: `Ce scor de calitate are ${wine.name}?`,
      answer:
        quality.status === "known" && quality.score != null
          ? `VinIntel afiseaza un scor de calitate de ${quality.score}/100, cu ${quality.confidence}% incredere in date. Scorul este independent de pret.`
          : "VinIntel nu afiseaza un scor de calitate pentru ca dovezile disponibile sunt insuficiente. Nu inventam unul.",
    },
    {
      question: `Ce inseamna Value Score ${publicPrice != null && wine.valueScore != null ? wine.valueScore : "N/A"}?`,
      answer:
        publicPrice != null && wine.valueScore != null
          ? `Value Score masoara raportul calitate-pret de la 0 la 100. Peste ${MIN_RECOMMENDED_VALUE_SCORE} inseamna ca merita banii, intre ${VALUE_SCORE_NEUTRAL_MIN} si ${MIN_RECOMMENDED_VALUE_SCORE - 1} este pret mediu, sub ${VALUE_SCORE_NEUTRAL_MIN} recomandam alternative.`
          : "Value Score depinde de pret si de dovezi suficiente. Fara o oferta Profitshare calificata si date suficiente afisam starea de date insuficiente, nu o recomandare de valoare.",
    },
  ];
}

export function buildProgrammaticLinks(
  wine: WineWithRelations,
  locale: AppLocale = "ro",
) {
  const links: { label: string; href: string }[] = [];

  if (wine.region?.slug) {
    links.push({
      label:
        locale === "en"
          ? `Wines from ${wine.region.name}`
          : `Vinuri din ${wine.region.name}`,
      href: localizedHref(locale, "region", { slug: wine.region.slug }),
    });
  }

  if (wine.winery?.slug) {
    links.push({
      label:
        locale === "en"
          ? `All wines from ${wine.winery.name}`
          : `Toate vinurile ${wine.winery.name}`,
      href: localizedHref(locale, "winery", { slug: wine.winery.slug }),
    });
  }

  links.push({
    label:
      locale === "en"
        ? `Best ${wine.type} wines`
        : `Top vinuri ${wine.type === "red" ? "rosii" : wine.type === "white" ? "albe" : wine.type}`,
    href: localizedHref(locale, "topWine", {
      slug: `vinuri-${WINE_TYPE_TO_TOP_SLUG[wine.type]}`,
    }),
  });

  const publicPrice = resolveWineDisplayPrice(wine);
  if (publicPrice != null && publicPrice <= 50) {
    links.push({
      label:
        locale === "en"
          ? "Best wines under 50 RON"
          : "Cele mai bune vinuri sub 50 lei",
      href: localizedHref(locale, "topWine", {
        slug: "vinuri-sub-50-lei",
      }),
    });
  }

  const topPairing = resolvePublicWinePairings(wine, 1, locale)[0];
  if (topPairing?.dishSlug) {
    links.push({
      label:
        locale === "en"
          ? `Best wines for ${topPairing.dish}`
          : `Vinuri pentru ${topPairing.dish.toLowerCase()}`,
      href: localizedHref(locale, "wineFor", {
        dish: topPairing.dishSlug,
      }),
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
  locale: AppLocale = "ro",
): WineProsCons {
  const pros: string[] = [];
  const cons: string[] = [];
  const value = wine.valueScore ?? 0;
  const hasPublicPrice = resolveWineDisplayPrice(wine) != null;
  const hasValueScore = wine.valueScore != null;

  if (locale === "en") {
    if (hasPublicPrice && hasValueScore && value >= MIN_RECOMMENDED_VALUE_SCORE) {
      pros.push(`Value Score ${value}/100: a clear value recommendation.`);
    } else if (hasPublicPrice && hasValueScore && value >= VALUE_SCORE_NEUTRAL_MIN) {
      pros.push(`Value Score ${value}/100: a reasonable choice.`);
    }
    if (wine.beginnerFriendly) {
      pros.push("An approachable profile for wine beginners.");
    }
    if (hasPublicPrice && hasValueScore && wine.overpricedRisk === "high") {
      cons.push("High overpricing risk compared with similar alternatives.");
    }
    if (hasPublicPrice && hasValueScore && value < VALUE_SCORE_NEUTRAL_MIN) {
      cons.push(
        `Value Score below ${VALUE_SCORE_NEUTRAL_MIN}/100: compare alternatives.`,
      );
    }
    if (hasPublicPrice && !hasValueScore) {
      cons.push("Value Score unavailable: insufficient pricing/quality evidence.");
    }
    if (!hasPublicPrice) {
      cons.push("Price unavailable: check a qualified Profitshare offer before buying.");
    }
    if (pros.length === 0) {
      pros.push("Limited data: prices and scores are still being updated.");
    }
    return { pros: pros.slice(0, 4), cons: cons.slice(0, 4) };
  }

  if (hasPublicPrice && hasValueScore && value >= MIN_RECOMMENDED_VALUE_SCORE) {
    pros.push(`Value Score ${value}/100: recomandare clara la acest pret.`);
  } else if (hasPublicPrice && hasValueScore && value >= VALUE_SCORE_NEUTRAL_MIN) {
    pros.push(`Value Score ${value}/100: alegere acceptabila, fara surprize majore.`);
  }

  if (wine.beginnerFriendly) {
    pros.push("Profil accesibil pentru incepatori.");
  }

  const cellar = resolveCellarDisplay({
    type: wine.type,
    price: resolveWineDisplayPrice(wine),
    cellarPotential: wine.cellarPotential,
    drinkabilityStart: wine.drinkabilityStart,
    drinkabilityEnd: wine.drinkabilityEnd,
    producerContent: wine.producerContent,
  });
  if (cellar?.kind === "verified") {
    pros.push(`${cellar.label}: ${cellar.value}.`);
  }

  const risk = wine.overpricedRisk ?? "medium";
  if (hasPublicPrice && hasValueScore && risk === "high") {
    cons.push("Risc ridicat de suprapret fata de alternative similare.");
  } else if (
    hasPublicPrice &&
    hasValueScore &&
    risk === "medium" &&
    value < MIN_RECOMMENDED_VALUE_SCORE
  ) {
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

  if (hasPublicPrice && hasValueScore && value < VALUE_SCORE_NEUTRAL_MIN) {
    cons.push(`Value Score sub ${VALUE_SCORE_NEUTRAL_MIN}/100: recomandam alternative.`);
  }

  if (hasPublicPrice && !hasValueScore) {
    cons.push("Value Score indisponibil: date insuficiente despre pret si calitate.");
  }

  if (!hasPublicPrice) {
    cons.push("Pret indisponibil: verifica o oferta Profitshare calificata inainte de cumparare.");
  }

  if (pros.length === 0) {
    pros.push("Date limitate: urmeaza actualizarea preturilor si a scorurilor.");
  }

  return { pros: pros.slice(0, 4), cons: cons.slice(0, 4) };
}
