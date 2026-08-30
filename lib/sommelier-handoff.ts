import { sommelierPageHref } from "@/lib/search-intent";

export const SOMMELIER_PROMPT_COOKIE = "vinintel_sommelier_q";
export const SOMMELIER_PROMPT_STORAGE = "vinintel:sommelier-prompt";
export const SOMMELIER_PROMPT_MAX_AGE = 120;
const SOMMELIER_PROMPT_MAX_CHARS = 1500;

export { sommelierPageHref };

export function encodeSommelierPromptCookie(prompt: string): string {
  return prompt.trim().slice(0, SOMMELIER_PROMPT_MAX_CHARS);
}

export function decodeSommelierPromptCookie(value: string | undefined): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

export function storeSommelierPrompt(prompt: string): void {
  const trimmed = prompt.trim();
  if (!trimmed || typeof window === "undefined") return;
  window.sessionStorage.setItem(SOMMELIER_PROMPT_STORAGE, trimmed);
}

export function takeStoredSommelierPrompt(): string {
  if (typeof window === "undefined") return "";

  const stored = window.sessionStorage.getItem(SOMMELIER_PROMPT_STORAGE)?.trim() ?? "";
  if (stored) {
    window.sessionStorage.removeItem(SOMMELIER_PROMPT_STORAGE);
  }

  const cookieMatch = document.cookie.match(
    new RegExp(`(?:^|; )${SOMMELIER_PROMPT_COOKIE}=([^;]*)`),
  );
  const fromCookie = decodeSommelierPromptCookie(cookieMatch?.[1]);
  if (cookieMatch) {
    document.cookie = `${SOMMELIER_PROMPT_COOKIE}=; Max-Age=0; Path=/`;
  }

  return stored || fromCookie;
}

let consumedHandoff = false;

export function consumeSommelierHandoff(serverPrompt = ""): string {
  if (consumedHandoff) return "";
  const prompt = takeStoredSommelierPrompt() || serverPrompt.trim();
  if (prompt) consumedHandoff = true;
  return prompt;
}
