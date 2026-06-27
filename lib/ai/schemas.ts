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
