import { z } from "zod";
import { analyzeWineSubmissionFromUrl } from "@/lib/analyze-wine-service";
import { localizeWineSubmissionMessage } from "@/lib/wine-submission-messages";
import { localizedHref } from "@/i18n/paths";
import { guardInteractiveApi } from "@/lib/security/api-guard";
import { isResolvablePublicWineUrl } from "@/lib/security/public-url";
import { readBoundedJson } from "@/lib/security/request-body";
import { RATE_LIMIT_POLICIES } from "@/lib/security/route-policy";

export const maxDuration = 120;

const requestSchema = z.object({
  url: z.string().min(8).max(2_048),
  email: z.string().trim().email().max(254).optional(),
  locale: z.enum(["ro", "en"]).default("ro"),
});

export async function POST(req: Request) {
  let responseLocale: "ro" | "en" = "ro";
  try {
    const denied = await guardInteractiveApi(req, {
      checkLevel: "deepAnalysis",
      rateLimit: RATE_LIMIT_POLICIES.analyzeWine,
    });
    if (denied) return denied;

    const parsedBody = await readBoundedJson(req, requestSchema, 4_096);
    if (!parsedBody.ok) return parsedBody.response;
    const data = parsedBody.data;
    responseLocale = data.locale;

    if (!(await isResolvablePublicWineUrl(data.url))) {
      return Response.json(
        {
          error:
            data.locale === "en"
              ? "Invalid URL. Example: https://www.avincis.ro/..."
              : "Link invalid. Exemplu: https://www.avincis.ro/...",
        },
        { status: 400 },
      );
    }

    const result = await analyzeWineSubmissionFromUrl(
      data.url,
      data.email,
    );

    if (result.status === "rejected") {
      return Response.json(
        {
          status: "rejected",
          message: localizeWineSubmissionMessage(
            result.message,
            data.locale,
            result.status,
          ),
        },
        { status: 422 },
      );
    }

    return Response.json({
      status: result.status,
      slug: result.slug,
      message: localizeWineSubmissionMessage(
        result.message,
        data.locale,
        result.status,
      ),
      redirectUrl:
        result.slug && data.locale === "en"
          ? localizedHref("en", "wine", { slug: result.slug })
          : result.redirectUrl,
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("[analyze-wine]", error);
    const message =
      responseLocale === "en"
        ? "The analysis failed. Please try again."
        : "Analiza a esuat. Incearca din nou.";
    return Response.json({ error: message }, { status: 500 });
  }
}
