import { z } from "zod";
import { getMaxValidWineVintage } from "@/lib/wine-vintage";

/** Vintage viitor peste acest prag e aproape sigur o eroare de extractie. */
const MAX_VALID_VINTAGE = getMaxValidWineVintage();

export const expertRecommendationSchema = z.object({
  wineSlug: z.string().describe("Slug-ul vinului din baza de date"),
  rank: z.number().int().min(1).max(8),
  matchScore: z.number().int().min(40).max(99),
  whyThisWine: z
    .string()
    .describe("De ce acest vin se potriveste cererii userului, legat de preferinte"),
  thingsYouShouldKnow: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("Lucruri pe care oamenii nu le stiu dar ar trebui"),
  pairingScience: z
    .string()
    .describe("Stiinta pairing-ului cu mancare romaneasca"),
  servingAndStorage: z
    .string()
    .describe("Sfaturi de servire, temperatura, decantare, pastrare"),
});

export const sommelierResponseSchema = z.object({
  summary: z
    .string()
    .describe("Rezumat scurt al recomandarilor, 1-2 propozitii"),
  recommendations: z.array(expertRecommendationSchema).min(1).max(5),
});

export type SommelierResponse = z.infer<typeof sommelierResponseSchema>;
export type ExpertRecommendationOutput = z.infer<
  typeof expertRecommendationSchema
>;

const editorialPairingSchema = z.object({
  dish: z.string().describe("Preparat romanesc concret"),
  note: z.string().describe("De ce merge pairing-ul"),
  score: z
    .number()
    .int()
    .min(60)
    .max(100)
    .optional()
    .describe("Cat de bine se potriveste, 60-100"),
});

const editorialDessertPairingSchema = z.object({
  dish: z
    .string()
    .describe(
      "Desert romanesc concret: cozonac, pasca, gogosi, placinta cu mere, sarmale cu nuci etc.",
    ),
  note: z
    .string()
    .describe(
      "Explicatie scurta: de ce aromele vinului echilibreaza dulceata desertului",
    ),
  score: z
    .number()
    .int()
    .min(60)
    .max(100)
    .optional()
    .describe("Cat de bine se potriveste, 60-100"),
});

export const wineEditorialSchema = z.object({
  descriptionEditorial: z
    .string()
    .default("")
    .describe(
      "Descriere onesta. Poate fi goala daca evidenta e insuficienta. Nu inventa note de degustare.",
    ),
  valueExplanation: z
    .string()
    .default("")
    .describe(
      "2-3 propozitii despre pret, sau gol daca nu exista pret/context suficient.",
    ),
  thingsYouShouldKnow: z
    .array(z.string())
    .max(4)
    .default([])
    .describe("Insight-uri doar din evidenta. Array gol daca nu exista fapte suficiente."),
  tasteProfile: z
    .string()
    .default("")
    .describe(
      "Profil gustativ doar din note de degustare/producator. Gol daca nu exista evidenta.",
    ),
  foodPairingNotes: z
    .array(editorialPairingSchema)
    .max(5)
    .default([])
    .describe(
      "0-5 pairing-uri. Array gol daca nu exista pairing evaluat sau evidenta de degustare.",
    ),
  dessertPairings: z
    .array(editorialDessertPairingSchema)
    .max(4)
    .default([])
    .describe(
      "Pairing-uri cu deserturi romanesti; array gol daca nu exista baza factuale.",
    ),
  recommendedOccasions: z
    .array(z.string())
    .max(4)
    .default([])
    .describe("Ocazii locale. Array gol daca nu exista baza suficienta."),
  valueScore: z.number().int().min(1).max(100),
  giftScore: z.number().int().min(1).max(100),
  foodMatchScore: z.number().int().min(1).max(100),
});

export type WineEditorialOutput = z.infer<typeof wineEditorialSchema>;

export const wineEditorialContentSchema = wineEditorialSchema.omit({
  valueScore: true,
  giftScore: true,
  foodMatchScore: true,
});

export type WineEditorialContentOutput = z.infer<
  typeof wineEditorialContentSchema
>;

export const wineDessertPairingsOnlySchema = z.object({
  dessertPairings: z
    .array(editorialDessertPairingSchema)
    .max(4)
    .describe(
      "Pairing-uri cu deserturi romanesti; array gol daca vinul sec taninos nu se potriveste",
    ),
});

export type WineDessertPairingsOnlyOutput = z.infer<
  typeof wineDessertPairingsOnlySchema
>;

export const wineApprovalEmailSummarySchema = z.object({
  summary: z
    .string()
    .describe(
      "Analiza scurta in 2-4 propozitii, ton prietenos si util, fara diacritice",
    ),
});

export type WineApprovalEmailSummary = z.infer<
  typeof wineApprovalEmailSummarySchema
>;

export const wineMedalLevelSchema = z.enum([
  "gold",
  "silver",
  "bronze",
  "double_gold",
  "best_in_class",
  "other",
]);

export const wineMedalImportanceSchema = z.enum(["high", "medium", "low"]);

export const wineMedalSchema = z.object({
  year: z
    .number()
    .int()
    .min(1900)
    .max(MAX_VALID_VINTAGE)
    .nullable()
    .describe("Anul editiei; null daca nu apare in pagina"),
  competition: z
    .string()
    .min(2)
    .describe("Numele complet al competitiei, ex. Decanter World Wine Awards"),
  medal: z
    .string()
    .min(1)
    .describe('Tip medalie: "Gold", "Silver", "Bronze" sau alt text din pagina'),
  importance: wineMedalImportanceSchema.describe(
    "high = Decanter, Balkans International, Vinarum, IWSC etc.; medium = national/regional; low = local",
  ),
  country: z
    .string()
    .optional()
    .describe("Tara gazda, optional, daca apare in pagina"),
});

export type WineMedalOutput = z.infer<typeof wineMedalSchema>;

export const wineMedalsOnlySchema = z.object({
  medals: z
    .array(wineMedalSchema)
    .default([])
    .describe("Toate medalii mentionate in text; array gol daca nu apar"),
});

export type WineMedalsOnlyOutput = z.infer<typeof wineMedalsOnlySchema>;

const linkPairingSchema = z.union([
  z.string(),
  z.array(
    z.object({
      dish: z.string(),
      note: z.string(),
      score: z.number().int().min(60).max(100).optional(),
    }),
  ),
]);

export const wineLinkAnalysisSchema = z.object({
  isRomanianWine: z.boolean(),
  reasonIfNotRomanian: z.string().optional(),
  name: z.string().min(2),
  producer: z.string().min(2),
  vintage: z.number().int().min(1900).max(MAX_VALID_VINTAGE).nullable(),
  price: z.number().positive().nullable(),
  category: z.string().optional(),
  grapeVarieties: z.array(z.string()).default([]),
  region: z.string().min(2),
  sweetness: z
    .enum(["sec", "demisec", "demidulce", "dulce"])
    .nullable()
    .optional()
    .describe("Dulceata daca apare explicit in pagina sau in numele produsului"),
  alcohol: z
    .number()
    .min(8)
    .max(18)
    .nullable()
    .optional()
    .describe("Concentratie alcoolica in % vol, doar daca apare in pagina"),
  sugar: z
    .number()
    .nonnegative()
    .nullable()
    .optional()
    .describe("Zahar rezidual g/L, doar daca apare in pagina"),
  acidity: z
    .number()
    .nonnegative()
    .nullable()
    .optional()
    .describe("Aciditate g/L, doar daca apare in pagina"),
  sourceUrl: z.string().url(),
  descriptionEditorial: z.string().min(40),
  valueScore: z.number().min(1).max(10),
  giftScore: z.number().min(1).max(10).optional(),
  foodMatchScore: z.number().min(1).max(10).optional(),
  valueExplanation: z.string().min(20),
  thingsYouShouldKnow: z.array(z.string()).min(2).max(4),
  tasteProfile: z.string().min(10),
  foodPairingNotes: linkPairingSchema.optional(),
  medals: z
    .array(wineMedalSchema)
    .default([])
    .describe(
      "Toate medalii mentionate explicit in pagina; array gol [] daca nu apar",
    ),
});

export type WineLinkAnalysis = z.infer<typeof wineLinkAnalysisSchema>;
