import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  streamText,
  type UIMessage,
} from "ai";
import { getChatSommelierModel } from "@/lib/ai/model";
import {
  buildChatSommelierSystemPrompt,
  extractUserTexts,
  retrieveWinesForChat,
  serializeWineForChat,
} from "@/lib/sommelier-chat";
import { extractRecommendedSlugs } from "@/lib/sommelier-chat-utils";
import { isAppLocale } from "@/i18n/locale";

export const maxDuration = 60;

function getLatestUserText(messages: UIMessage[]): string {
  const texts = extractUserTexts(messages);
  return texts.at(-1) ?? "";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      messages?: UIMessage[];
      locale?: string;
    };
    const messages = body.messages ?? [];
    const locale = isAppLocale(body.locale) ? body.locale : "ro";

    if (messages.length === 0) {
      return Response.json(
        { error: locale === "en" ? "Message is missing." : "Mesaj lipsa." },
        { status: 400 },
      );
    }

    const latestUserText = getLatestUserText(messages);
    if (!latestUserText.trim()) {
      return Response.json(
        { error: locale === "en" ? "Message is empty." : "Mesaj gol." },
        { status: 400 },
      );
    }

    const conversationTexts = extractUserTexts(messages);
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
    const message =
      error instanceof Error ? error.message : "Eroare interna somelier chat.";
    return Response.json({ error: message }, { status: 500 });
  }
}
