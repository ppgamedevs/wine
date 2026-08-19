import { z } from "zod";
import { analyzeWineSubmissionFromUrl } from "@/lib/analyze-wine-service";
import { isWineUrl } from "@/lib/wine-url";
import { localizeWineSubmissionMessage } from "@/lib/wine-submission-messages";
import { localizedHref } from "@/i18n/paths";

export const maxDuration = 120;

const requestSchema = z.object({
  url: z.string().min(8),
  email: z.string().trim().email().optional(),
  locale: z.enum(["ro", "en"]).default("ro"),
});

export async function POST(req: Request) {
  let responseLocale: "ro" | "en" = "ro";
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    const requestedLocale =
      typeof body === "object" &&
      body !== null &&
      "locale" in body &&
      body.locale === "en"
        ? "en"
        : "ro";
    responseLocale = requestedLocale;

    if (!parsed.success) {
      const urlIssue = parsed.error.flatten().fieldErrors.url?.[0];
      const emailIssue = parsed.error.flatten().fieldErrors.email?.[0];
      return Response.json(
        {
          error:
            urlIssue ??
            emailIssue ??
            requestedLocale === "en"
              ? "Invalid URL. Enter the full wine product page URL."
              : "Link invalid. Introdu un URL complet catre pagina vinului.",
        },
        { status: 400 },
      );
    }

    if (!isWineUrl(parsed.data.url)) {
      return Response.json(
        {
          error:
            parsed.data.locale === "en"
              ? "Invalid URL. Example: https://www.avincis.ro/..."
              : "Link invalid. Exemplu: https://www.avincis.ro/...",
        },
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
          message: localizeWineSubmissionMessage(
            result.message,
            parsed.data.locale,
            result.status,
          ),
          meta: result.meta,
        },
        { status: 422 },
      );
    }

    return Response.json({
      ...result,
      message: localizeWineSubmissionMessage(
        result.message,
        parsed.data.locale,
        result.status,
      ),
      redirectUrl:
        result.slug && parsed.data.locale === "en"
          ? localizedHref("en", "wine", { slug: result.slug })
          : result.redirectUrl,
    });
  } catch (error) {
    console.error("[analyze-wine]", error);
    const message =
      responseLocale === "en"
        ? "The analysis failed. Please try again."
        : error instanceof Error
        ? error.message
        : "Analiza a esuat. Incearca din nou.";
    return Response.json({ error: message }, { status: 500 });
  }
}
