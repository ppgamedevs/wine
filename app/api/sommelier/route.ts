import { generateObject } from "ai";
import { z } from "zod";
import { getSommelierModel } from "@/lib/ai/model";
import {
  buildSommelierUserPrompt,
  SOMMELIER_SYSTEM_PROMPT,
  SOMMELIER_SYSTEM_PROMPT_EN,
} from "@/lib/ai/prompts";
import { sommelierResponseSchema } from "@/lib/ai/schemas";
import { hybridRetrieve } from "@/lib/sommelier-rag";
import {
  buildWineContextForLLM,
  getOccasion,
  type ColorPreference,
  type OccasionId,
  type SommelierInput,
  type SweetnessPreference,
} from "@/lib/sommelier";

export const maxDuration = 60;

const requestSchema = z.object({
  budgetMin: z.number().min(0),
  budgetMax: z.number().min(20),
  occasion: z.string(),
  color: z.enum(["any", "red", "white", "rose", "sparkling"]),
  sweetness: z.enum(["any", "sec", "demisec", "demidulce", "dulce"]),
  preferredWinerySlugs: z.array(z.string()).default([]),
  locale: z.enum(["ro", "en"]).default("ro"),
});

function getModel() {
  return getSommelierModel();
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const localeResult = z
      .object({ locale: z.enum(["ro", "en"]).optional() })
      .safeParse(body);
    const requestLocale = localeResult.success
      ? (localeResult.data.locale ?? "ro")
      : "ro";
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error:
            requestLocale === "en"
              ? "Invalid data. Check the form."
              : "Date invalide. Verifica formularul.",
        },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const locale = data.locale;
    const occasionId = getOccasion(data.occasion as OccasionId).id;

    const input: SommelierInput = {
      budgetMin: Math.min(data.budgetMin, data.budgetMax),
      budgetMax: data.budgetMax,
      budgetSpecified: true,
      occasion: occasionId,
      color: data.color as ColorPreference,
      sweetness: data.sweetness as SweetnessPreference,
      preferredWinerySlugs: data.preferredWinerySlugs,
      absurdRequest: false,
    };

    const candidates = await hybridRetrieve(input, 8);

    if (candidates.length === 0) {
      return Response.json(
        {
          summary:
            locale === "en"
              ? "We found no wines within that budget. Increase the budget or relax the filters."
              : "Nu am gasit vinuri in bugetul ales. Incearca sa cresti bugetul sau relaxeaza filtrele.",
          recommendations: [],
        },
        { status: 200 },
      );
    }

    const wineContext = buildWineContextForLLM(candidates);
    const prompt = buildSommelierUserPrompt(
      {
        budgetMin: input.budgetMin,
        budgetMax: input.budgetMax,
        occasion: getOccasion(input.occasion).label,
        color: input.color,
        sweetness: input.sweetness,
        preferredWinerySlugs: input.preferredWinerySlugs,
      },
      wineContext,
      locale,
    );

    const result = await generateObject({
      model: getModel(),
      schema: sommelierResponseSchema,
      system:
        locale === "en"
          ? SOMMELIER_SYSTEM_PROMPT_EN
          : SOMMELIER_SYSTEM_PROMPT,
      prompt,
      temperature: 0.4,
    });

    // Nu inventam vinuri: orice wineSlug care nu exista in candidatii
    // recuperati pentru aceasta cerere (indiferent de motiv - halucinatie,
    // format gresit) este eliminat aici, inainte de a raspunde. Asta se
    // aplica indiferent daca endpoint-ul e apelat din UI sau direct.
    const candidateSlugs = new Set(candidates.map((wine) => wine.slug));
    const validatedRecommendations = result.object.recommendations.filter(
      (rec) => candidateSlugs.has(rec.wineSlug),
    );

    return Response.json({
      summary: result.object.summary,
      recommendations: validatedRecommendations,
    });
  } catch (error) {
    console.error("POST /api/sommelier failed", error);
    const message =
      error instanceof Error ? error.message : "Eroare interna somelier AI.";
    return Response.json({ error: message }, { status: 500 });
  }
}
