import { xai } from "@ai-sdk/xai";

const SOMMELIER_MODEL = "grok-4.20-non-reasoning";

export function getSommelierModel() {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "XAI_API_KEY lipseste sau este gol. Adauga cheia in Vercel (Production + Development) si ruleaza: vercel env pull .env.local --environment=production",
    );
  }
  return xai(SOMMELIER_MODEL);
}

export { SOMMELIER_MODEL };
