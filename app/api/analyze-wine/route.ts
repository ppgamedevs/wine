import { z } from "zod";
import { analyzeWineSubmissionFromUrl } from "@/lib/analyze-wine-service";
import { isWineUrl } from "@/lib/wine-url";

export const maxDuration = 120;

const requestSchema = z.object({
  url: z.string().min(8),
  email: z.string().trim().email("Introdu o adresa de email valida."),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      const emailIssue = parsed.error.flatten().fieldErrors.email?.[0];
      return Response.json(
        {
          error:
            emailIssue ??
            "Link invalid. Introdu un URL complet catre pagina vinului.",
        },
        { status: 400 },
      );
    }

    if (!isWineUrl(parsed.data.url)) {
      return Response.json(
        { error: "Link invalid. Exemplu: https://www.avincis.ro/..." },
        { status: 400 },
      );
    }

    const result = await analyzeWineSubmissionFromUrl(
      parsed.data.url,
      parsed.data.email,
    );

    if (result.status === "rejected") {
      return Response.json(
        {
          status: "rejected",
          message: result.message,
          meta: result.meta,
        },
        { status: 422 },
      );
    }

    return Response.json(result);
  } catch (error) {
    console.error("[analyze-wine]", error);
    const message =
      error instanceof Error
        ? error.message
        : "Analiza a esuat. Incearca din nou.";
    return Response.json({ error: message }, { status: 500 });
  }
}
