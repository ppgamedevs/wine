/**
 * Deterministic, human Romanian rationale. No internal jargon.
 */
import type { RomanianDishProfile } from "@/lib/pairing/romanian-dishes";
import type { WinePairingProfile } from "@/lib/pairing/wine-pairing-profile";
import type { AppLocale } from "@/i18n/locale";

function grapeMention(profile: WinePairingProfile): string | null {
  const first = profile.grapeNames[0];
  if (!first) return null;
  if (profile.grapeNames.length === 1) return first;
  return `${first} in amestec`;
}

function styleLabel(profile: WinePairingProfile): string {
  if (profile.type === "red") return "rosu";
  if (profile.type === "white") return "alb";
  if (profile.type === "rose") return "roze";
  if (profile.type === "sparkling") return "spumant";
  if (profile.type === "orange") return "orange";
  return "de desert";
}

function sweetLabel(profile: WinePairingProfile): string {
  if (profile.sweetness === "sec") return "sec";
  if (profile.sweetness === "demisec") return "demisec";
  if (profile.sweetness === "demidulce") return "demidulce";
  return "dulce";
}

function englishStyleLabel(profile: WinePairingProfile): string {
  if (profile.type === "red") return "red wine";
  if (profile.type === "white") return "white wine";
  if (profile.type === "rose") return "rosé wine";
  if (profile.type === "sparkling") return "sparkling wine";
  if (profile.type === "orange") return "orange wine";
  return "dessert wine";
}

function englishSweetLabel(profile: WinePairingProfile): string {
  if (profile.sweetness === "sec") return "dry";
  if (profile.sweetness === "demisec") return "medium-dry";
  if (profile.sweetness === "demidulce") return "medium-sweet";
  return "sweet";
}

function englishPairingRationale(
  profile: WinePairingProfile,
  dish: RomanianDishProfile,
  exactProducer: boolean,
): string {
  const wine = `${englishSweetLabel(profile)} ${englishStyleLabel(profile)}`;
  if (exactProducer) {
    return `${dish.name} is also recommended by the producer and works well with a ${wine} in this style.`;
  }
  if (dish.foodCategory === "dessert" || dish.foodCategory === "chocolate") {
    return `${dish.name} needs enough sweetness, and this ${wine} can match the dessert.`;
  }
  if (dish.family === "sour-soup") {
    return `${dish.name} has a tangy profile, so a fresher ${wine} is more natural than a heavy wine.`;
  }
  if (dish.family === "smoked-pork") {
    return `${dish.name} brings smoke and salt, and this ${wine} has enough presence for it.`;
  }
  if (dish.family === "mountain-cheese" || dish.family === "aged-cheese") {
    return `${dish.name} brings salt and richness that this ${wine} can balance without masking.`;
  }
  if (dish.family === "cabbage-roll" || dish.family === "vine-leaf-roll") {
    return `${dish.name} is a classic Romanian match for this ${wine}, with enough structure for the filling.`;
  }
  if (dish.foodCategory === "vegetable") {
    return `For ${dish.name}, this ${wine} is a more natural choice than a heavy wine.`;
  }
  return `${dish.name} is a very good match for this ${wine}.`;
}

export function pairingRationale(
  profile: WinePairingProfile,
  dish: RomanianDishProfile,
  exactProducer: boolean,
  locale: AppLocale = "ro",
): string {
  if (locale === "en") {
    return englishPairingRationale(profile, dish, exactProducer);
  }
  const grape = grapeMention(profile);
  const style = styleLabel(profile);
  const sweet = sweetLabel(profile);
  const dishName = dish.name;

  if (exactProducer) {
    return `${dishName} este recomandat de producator si se potriveste foarte bine cu un ${style} ${sweet} din acest stil.`;
  }

  if (dish.foodCategory === "dessert" || dish.foodCategory === "chocolate") {
    return `${dishName} cere un vin cu dulceata, iar un ${style} ${sweet} poate tine pasul cu desertul.`;
  }

  if (dish.family === "sour-soup") {
    return `${dishName} are aciditate de ciorba, iar un ${style} ${sweet} mai proaspat este o alegere mai fireasca decat un vin greu.`;
  }

  if (dish.protein === "duck") {
    return `Merge foarte bine langa ${dishName.toLowerCase()}, unde un ${style} ${sweet} poate tine pasul cu preparatul bogat.`;
  }
  if (dish.protein === "rabbit") {
    return `Pentru ${dishName.toLowerCase()}, un ${style} ${sweet} mai fin este o alegere mai fireasca decat un vin greu.`;
  }
  if (dish.family === "delta-fish" || dish.family === "trout" || dish.family === "pikeperch") {
    return `${dishName} este o alegere foarte buna pentru un ${style} ${sweet} din acest stil.`;
  }
  if (dish.family === "roe" || dish.family === "roe-carp" || dish.family === "roe-pike" || dish.family === "cheese-pie") {
    return `${dishName} se potriveste foarte bine ca inceput de masa langa un ${style} ${sweet}.`;
  }
  if (dish.family === "smoked-pork") {
    return `Un ${style} ${sweet} mai consistent poate sta langa ${dishName.toLowerCase()}, unde fumul si sarea cer un vin cu prezenta.`;
  }
  if (dish.family === "mountain-cheese" || dish.family === "aged-cheese") {
    return `${dishName} aduce sare si grasime, iar un ${style} ${sweet} din acest stil le poate echilibra fara sa le acopere.`;
  }
  if (dish.family === "cabbage-roll" || dish.family === "vine-leaf-roll") {
    return `${dishName} este o masa romaneasca clasica pentru un ${style} ${sweet}, cu destula prezenta pentru umplutura.`;
  }
  if (dish.foodCategory === "vegetable") {
    return `Pentru ${dishName.toLowerCase()}, un ${style} ${sweet} este o alegere mai fireasca decat un vin greu.`;
  }
  if (grape && profile.type === "red") {
    return `${grape} se potriveste foarte bine cu ${dishName.toLowerCase()}.`;
  }
  if (grape && (profile.type === "white" || profile.type === "sparkling")) {
    return `Un ${style} ${sweet} din ${grape} merge foarte bine langa ${dishName.toLowerCase()}.`;
  }
  return `Un ${style} ${sweet} din acest stil este o alegere foarte buna pentru ${dishName.toLowerCase()}.`;
}
