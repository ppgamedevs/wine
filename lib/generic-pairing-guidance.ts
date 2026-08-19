import type { WineType } from "@/types";
import type { AppLocale } from "@/i18n/locale";

/**
 * Orientare generala de pairing pe tip de vin + dulceata, folosita STRICT
 * cand vinul nu are pairing-uri evaluate (`foodPairings` gol).
 *
 * Important: aceasta NU este o evaluare specifica a vinului curent, ci
 * cunostinta general acceptata despre categoria de vin (rosu sec, alb sec
 * etc.). De aceea nu are scor numeric (un numar ar simula precizie pe care
 * nu o avem) si este intotdeauna afisata cu o eticheta explicita de
 * "orientare generala", nu ca fapt verificat despre acest vin. Inlocuieste
 * fallback-ul anterior care arata mereu pairing-uri de vin rosu (sarmale,
 * mititei) indiferent de tipul real al vinului - o eroare care putea aparea
 * la un vin alb, roze, spumant sau dulce.
 */
export interface GenericPairingGuidance {
  categories: string[];
  note: string;
}

function englishGuidance(
  type: WineType | string | undefined,
  isSweetish: boolean,
  isOffDry: boolean,
): GenericPairingGuidance {
  switch (type) {
    case "red":
      return {
        categories: ["red meat and stews", "aged cheese", "rich sauces"],
        note: "Dry red wines generally suit rich dishes. Sweeter red styles are usually better with dessert or strongly flavored cheese.",
      };
    case "white":
      return isSweetish
        ? {
            categories: ["light desserts", "strong cheese", "foie gras"],
            note: "Sweet or medium-sweet white wines generally work with light desserts or strongly flavored cheese.",
          }
        : {
            categories: ["fish and seafood", "light dishes", "fresh cheese"],
            note: "Dry and medium-dry white wines generally suit lighter dishes, fish, and seafood.",
          };
    case "rose":
      return {
        categories: ["summer salads", "grilled chicken or fish", "Mediterranean dishes"],
        note: "Dry rosé is generally versatile with light to medium dishes.",
      };
    case "sparkling":
      return {
        categories: [
          "appetizers",
          "seafood",
          isSweetish || isOffDry ? "light desserts" : "light starters",
        ],
        note: "Dry sparkling wine generally suits appetizers and seafood, while sweeter styles work better with light desserts.",
      };
    case "dessert":
      return {
        categories: ["desserts", "blue cheese", "foie gras"],
        note: "Dessert wines are generally sweet and suit desserts or strongly flavored cheese.",
      };
    case "orange":
      return {
        categories: ["fermented or pickled dishes", "textured cheese", "oxidative flavors"],
        note: "Skin-contact orange wines generally suit textured or fermented dishes.",
      };
    default:
      return {
        categories: ["balanced dishes without very rich or spicy sauces"],
        note: "We do not yet have enough structured data for more precise pairing guidance.",
      };
  }
}

export function buildGenericPairingGuidance(input: {
  type: WineType | string | null | undefined;
  sweetness?: string | null;
  locale?: AppLocale;
}): GenericPairingGuidance {
  const type = input.type ?? undefined;
  const sweetness = input.sweetness ?? null;
  const isSweetish = sweetness === "dulce" || sweetness === "demidulce";
  const isOffDry = sweetness === "demisec";
  if (input.locale === "en") {
    return englishGuidance(type, isSweetish, isOffDry);
  }

  switch (type) {
    case "red":
      return {
        categories: [
          "carne rosie si tocanite",
          "branzeturi maturate",
          "preparate cu sos consistent",
        ],
        note: "Vinurile rosii seci se asociaza de obicei bine cu preparate consistente, grase, cu taninuri care echilibreaza carnea. Vinurile rosii dulci/demidulci sunt rare si merg mai bine cu desert sau branzeturi picante.",
      };
    case "white":
      if (isSweetish) {
        return {
          categories: ["deserturi usoare", "branzeturi picante", "foie gras"],
          note: "Un alb dulce sau demidulce merge de regula cu deserturi usoare sau branzeturi cu personalitate, nu cu preparate sarate consistente.",
        };
      }
      return {
        categories: [
          "peste si fructe de mare",
          "preparate usoare de vara",
          "branzeturi proaspete",
        ],
        note: "Vinurile albe seci sau demiseci se asociaza de regula cu preparate usoare, peste si fructe de mare, unde aciditatea vinului completeaza mancarea.",
      };
    case "rose":
      return {
        categories: [
          "salate si preparate usoare de vara",
          "gratar de pui sau peste",
          "bucataria mediteraneana",
        ],
        note: "Un roze sec functioneaza de regula ca vin versatil de vara, pentru preparate usoare spre medii, nu pentru mancare foarte grasa sau condimentata puternic.",
      };
    case "sparkling":
      return {
        categories: [
          "aperitive si gustari",
          "fructe de mare",
          isSweetish || isOffDry
            ? "deserturi usoare"
            : "preparate usoare la inceput de masa",
        ],
        note: "Un spumant sec/brut merge de regula la aperitiv si fructe de mare; variantele demiseci/dulci se asociaza mai bine cu deserturi usoare.",
      };
    case "dessert":
      return {
        categories: [
          "deserturi",
          "branzeturi cu mucegai (ex. gorgonzola, rocamadour)",
          "foie gras",
        ],
        note: "Vinurile de desert sunt de regula dulci si se servesc cu deserturi sau branzeturi puternice, nu cu preparate sarate obisnuite.",
      };
    case "orange":
      return {
        categories: [
          "preparate fermentate sau murate",
          "branzeturi cu textura",
          "bucataria cu note oxidative",
        ],
        note: "Vinurile orange (macerate pe pielite) au de regula taninuri si note oxidative care se potrivesc cu preparate cu textura sau fermentate.",
      };
    default:
      return {
        categories: ["preparate echilibrate, fara sosuri foarte grase sau foarte picante"],
        note: "Nu avem inca suficiente date structurate despre acest vin pentru o orientare de pairing mai precisa.",
      };
  }
}
