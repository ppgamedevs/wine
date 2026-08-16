/**
 * Deterministic, human Romanian rationale. No internal jargon.
 */
import type { RomanianDishProfile } from "@/lib/pairing/romanian-dishes";
import type { WinePairingProfile } from "@/lib/pairing/wine-pairing-profile";

function grapeMention(profile: WinePairingProfile): string | null {
  const first = profile.grapeNames[0];
  if (!first) return null;
  if (profile.grapeNames.length === 1) return first;
  return `${first} in amestec`;
}

export function pairingRationale(
  profile: WinePairingProfile,
  dish: RomanianDishProfile,
  exactProducer: boolean,
): string {
  const grape = grapeMention(profile);
  const style =
    profile.type === "red"
      ? "rosu"
      : profile.type === "white"
        ? "alb"
        : profile.type === "rose"
          ? "roze"
          : profile.type === "sparkling"
            ? "spumant"
            : profile.type === "orange"
              ? "orange"
              : "de desert";
  const sweet =
    profile.sweetness === "sec"
      ? "sec"
      : profile.sweetness === "demisec"
        ? "demisec"
        : profile.sweetness === "demidulce"
          ? "demidulce"
          : "dulce";

  if (exactProducer) {
    return `Producatorul mentioneaza acest tip de preparat, iar ${dish.name.toLowerCase()} ramane o alegere fireasca de verificat la masa.`;
  }

  if (dish.foodCategory === "dessert" || dish.foodCategory === "chocolate") {
    return `${dish.name} cere un vin cu dulceata, iar un ${style} ${sweet} din acest stil poate tine pasul cu desertul.`;
  }

  if (dish.protein === "duck") {
    return `Merge foarte bine langa ${dish.name.toLowerCase()}, unde un ${style} ${sweet} poate tine pasul cu preparatul bogat.`;
  }
  if (dish.protein === "rabbit") {
    return `Pentru ${dish.name.toLowerCase()}, un ${style} ${sweet} mai fin este o alegere mai fireasca decat un vin greu.`;
  }
  if (dish.family === "delta-fish" || dish.family === "trout") {
    return `${dish.name} este una dintre cele mai interesante alegeri romanesti pentru un ${style} ${sweet} din acest stil.`;
  }
  if (dish.family === "roe" || dish.family === "cheese-pie") {
    return `${dish.name} functioneaza ca un inceput romanesc clar, mai ales langa un ${style} ${sweet} cu energie.`;
  }
  if (dish.family === "smoked-pork") {
    return `Un ${style} ${sweet} mai consistent poate sta langa ${dish.name.toLowerCase()}, unde fumul si sarea cer un vin cu prezenta.`;
  }
  if (dish.family === "mountain-cheese" || dish.family === "aged-cheese") {
    return `${dish.name} aduce sare si grasime, iar un ${style} ${sweet} din acest stil le poate echilibra fara sa le acopere.`;
  }
  if (dish.family === "cabbage-roll") {
    return `${dish.name} este o masa romaneasca clasica pentru un ${style} ${sweet}, cu destula prezenta pentru varza si umplutura.`;
  }
  if (dish.foodCategory === "vegetable") {
    return `Pentru ${dish.name.toLowerCase()}, un ${style} ${sweet} este o alegere mai fireasca decat un vin greu.`;
  }
  if (grape && profile.type === "red") {
    return `${grape} este un stil de rosu care poate sta bine langa ${dish.name.toLowerCase()}.`;
  }
  if (grape && (profile.type === "white" || profile.type === "sparkling")) {
    return `Un ${style} ${sweet} din zona ${grape} se potriveste natural cu ${dish.name.toLowerCase()}.`;
  }
  return `Un ${style} ${sweet} din acest stil poate merge bine langa ${dish.name.toLowerCase()}.`;
}
