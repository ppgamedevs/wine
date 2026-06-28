import { z } from "zod";

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

export const wineEditorialSchema = z.object({
  descriptionEditorial: z
    .string()
    .describe("80-120 cuvinte: ce fel de vin este, ce ofera, pentru cine"),
  valueExplanation: z
    .string()
    .describe("2-3 propozitii: merita banii la pretul actual sau nu"),
  thingsYouShouldKnow: z
    .array(z.string())
    .min(3)
    .max(4)
    .describe("Insight-uri utile pe care majoritatea nu le stiu"),
  tasteProfile: z
    .string()
    .describe("Stil gustativ scurt: fructat, structurat, mineral etc."),
  foodPairingNotes: z
    .array(editorialPairingSchema)
    .min(2)
    .max(5)
    .describe("Pairing-uri cu mancare romaneasca"),
  recommendedOccasions: z
    .array(z.string())
    .min(2)
    .max(4)
    .describe("Ocazii locale relevante"),
  valueScore: z.number().int().min(1).max(100),
  giftScore: z.number().int().min(1).max(100),
  foodMatchScore: z.number().int().min(1).max(100),
});

export type WineEditorialOutput = z.infer<typeof wineEditorialSchema>;
