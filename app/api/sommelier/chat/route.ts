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

export const maxDuration = 60;

function getLatestUserText(messages: UIMessage[]): string {
  const texts = extractUserTexts(messages);
  return texts.at(-1) ?? "";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: UIMessage[] };
    const messages = body.messages ?? [];

    if (messages.length === 0) {
      return Response.json({ error: "Mesaj lipsa." }, { status: 400 });
    }

    const latestUserText = getLatestUserText(messages);
    if (!latestUserText.trim()) {
      return Response.json({ error: "Mesaj gol." }, { status: 400 });
    }

    const conversationTexts = extractUserTexts(messages);
    const { input, wines } = await retrieveWinesForChat(
      latestUserText,
      conversationTexts,
      6,
    );

    const system = buildChatSommelierSystemPrompt(wines, input);
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
          .map((wine) => serializeWineForChat(wine));

        if (recommendations.length > 0) {
          writer.write({
            type: "data-recommendations",
            id: generateId(),
            data: recommendations,
          });
        }
      },
      onError: () => "Somelierul nu a putut raspunde. Incearca din nou.",
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("POST /api/sommelier/chat failed", error);
    const message =
      error instanceof Error ? error.message : "Eroare interna somelier chat.";
    return Response.json({ error: message }, { status: 500 });
  }
}
