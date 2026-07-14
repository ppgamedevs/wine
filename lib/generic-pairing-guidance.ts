import type { WineType } from "@/types";

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

export function buildGenericPairingGuidance(input: {
  type: WineType | string | null | undefined;
  sweetness?: string | null;
}): GenericPairingGuidance {
  const type = input.type ?? undefined;
  const sweetness = input.sweetness ?? null;
  const isSweetish = sweetness === "dulce" || sweetness === "demidulce";
  const isOffDry = sweetness === "demisec";

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
