import { z } from "zod";
import { analyzeAndSaveWineFromUrl } from "@/lib/analyze-wine-service";
import { isWineUrl } from "@/lib/wine-url";

export const maxDuration = 120;

const requestSchema = z.object({
  url: z.string().min(8),
  submittedBy: z.string().min(1).max(120).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Link invalid. Introdu un URL complet catre pagina vinului." },
        { status: 400 },
      );
    }

    if (!isWineUrl(parsed.data.url)) {
      return Response.json(
        { error: "Link invalid. Exemplu: https://www.avincis.ro/..." },
        { status: 400 },
      );
    }

    const result = await analyzeAndSaveWineFromUrl(
      parsed.data.url,
      parsed.data.submittedBy ?? "anonymous",
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
