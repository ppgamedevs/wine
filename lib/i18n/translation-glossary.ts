export const TRANSLATION_GLOSSARY = {
  "cramă": "winery",
  "vin roșu": "red wine",
  "vin alb": "white wine",
  "vin roze": "rosé wine",
  "vin spumant": "sparkling wine",
  sec: "dry",
  demisec: "medium-dry",
  demidulce: "medium-sweet",
  dulce: "sweet",
  "preț estimativ": "estimated price",
  "preț verificat": "verified price",
  "date limitate": "limited data",
  "fișa vinului": "wine details",
  "merită banii?": "is it worth the money?",
  "ce poți cumpăra în loc": "what to buy instead",
} as const;

export function translationGlossaryPrompt(): string {
  return Object.entries(TRANSLATION_GLOSSARY)
    .map(([romanian, english]) => `${romanian} => ${english}`)
    .join("\n");
}

