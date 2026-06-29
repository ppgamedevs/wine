import { z } from "zod";
import { analyzeAndSaveWineFromUrl } from "@/lib/analyze-wine-service";
import { isWineUrl, normalizeSourceUrl } from "@/lib/wine-url";

export const maxDuration = 60;

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
      normalizeSourceUrl(parsed.data.url),
      parsed.data.submittedBy ?? "anonymous",
    );

    if (result.status === "rejected") {
      return Response.json(
        { status: "rejected", message: result.message },
        { status: 422 },
      );
    }

    return Response.json({
      status: result.status,
      slug: result.slug,
      wineId: result.wineId,
      redirectUrl: result.slug ? `/wines/${result.slug}` : undefined,
    });
  } catch (error) {
    console.error("[analyze-wine]", error);
    const message =
      error instanceof Error
        ? error.message
        : "Analiza a esuat. Incearca din nou.";
    return Response.json({ error: message }, { status: 500 });
  }
}
