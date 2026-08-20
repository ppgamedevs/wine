import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  streamText,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { getChatSommelierModel } from "@/lib/ai/model";
import {
  buildChatSommelierSystemPrompt,
  extractUserTexts,
  retrieveWinesForChat,
  serializeWineForChat,
} from "@/lib/sommelier-chat";
import { extractRecommendedSlugs } from "@/lib/sommelier-chat-utils";
import { isAppLocale } from "@/i18n/locale";
import { guardInteractiveApi } from "@/lib/security/api-guard";
import { readBoundedJson } from "@/lib/security/request-body";
import { RATE_LIMIT_POLICIES } from "@/lib/security/route-policy";

export const maxDuration = 60;

const requestSchema = z.object({
  messages: z
    .array(
      z.custom<UIMessage>(
        (value) =>
          typeof value === "object" &&
          value !== null &&
          "role" in value &&
          "parts" in value,
      ),
    )
    .min(1)
    .max(20),
  locale: z.string().optional(),
});

function getLatestUserText(messages: UIMessage[]): string {
  const texts = extractUserTexts(messages);
  return texts.at(-1) ?? "";
}

export async function POST(req: Request) {
  try {
    const denied = await guardInteractiveApi(req, {
      checkLevel: "deepAnalysis",
      rateLimit: RATE_LIMIT_POLICIES.sommelierChat,
    });
    if (denied) return denied;

    const parsedBody = await readBoundedJson(req, requestSchema, 24_000);
    if (!parsedBody.ok) return parsedBody.response;

    const body = parsedBody.data;
    const messages = body.messages;
    const locale = isAppLocale(body.locale) ? body.locale : "ro";

    const latestUserText = getLatestUserText(messages);
    if (!latestUserText.trim()) {
      return Response.json(
        { error: locale === "en" ? "Message is empty." : "Mesaj gol." },
        { status: 400 },
      );
    }

    const conversationTexts = extractUserTexts(messages);
    const totalUserCharacters = conversationTexts.reduce(
      (total, text) => total + text.length,
      0,
    );
    if (latestUserText.length > 2_000 || totalUserCharacters > 12_000) {
      return Response.json(
        {
          error:
            locale === "en"
              ? "The conversation is too long. Start a new request."
              : "Conversatia este prea lunga. Incepe o cerere noua.",
        },
        {
          status: 413,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }

    const { input, wines } = await retrieveWinesForChat(
      latestUserText,
      conversationTexts,
      6,
      locale,
    );

    const system = buildChatSommelierSystemPrompt(wines, input, locale);
    const candidateSlugs = wines.map((wine) => wine.slug);

    const stream = createUIMessageStream({
      originalMessages: messages,
      execute: async ({ writer }) => {
        const modelMessages = await convertToModelMessages(messages);

        const result = streamText({
          model: getChatSommelierModel(),
          system,
          messages: modelMessages,
          temperature: 0.45,
          maxOutputTokens: 900,
          abortSignal: AbortSignal.timeout(45_000),
        });

        writer.merge(result.toUIMessageStream());

        const fullText = await result.text;
        const slugs = extractRecommendedSlugs(fullText, candidateSlugs);
        const wineBySlug = new Map(wines.map((wine) => [wine.slug, wine]));
        const recommendations = slugs
          .map((slug) => wineBySlug.get(slug))
          .filter((wine) => wine != null)
          .map((wine) => serializeWineForChat(wine))
          .slice(0, 3);

        if (recommendations.length > 0) {
          writer.write({
            type: "data-recommendations",
            id: generateId(),
            data: recommendations,
          });
        }
      },
      onError: () =>
        locale === "en"
          ? "The Sommelier could not answer. Please try again."
          : "Somelierul nu a putut raspunde. Incearca din nou.",
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("POST /api/sommelier/chat failed", error);
    return Response.json(
      { error: "Somelierul nu a putut raspunde. Incearca din nou." },
      {
        status: 500,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
