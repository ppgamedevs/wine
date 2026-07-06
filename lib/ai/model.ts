import { groq } from "@ai-sdk/groq";
import { xai } from "@ai-sdk/xai";

const SOMMELIER_MODEL = "grok-4.20-non-reasoning";
const CHAT_SOMMELIER_MODEL = "llama-3.3-70b-versatile";

export function getSommelierModel() {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "XAI_API_KEY lipseste sau este gol. Adauga cheia in Vercel (Production + Development) si ruleaza: vercel env pull .env.local --environment=production",
    );
  }
  return xai(SOMMELIER_MODEL);
}

/** Fast Groq model for interactive sommelier chat. Falls back to XAI if GROQ_API_KEY is missing. */
export function getChatSommelierModel() {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    return groq(CHAT_SOMMELIER_MODEL);
  }
  return getSommelierModel();
}

export { SOMMELIER_MODEL, CHAT_SOMMELIER_MODEL };
