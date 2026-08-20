import "server-only";

import { botDeniedResponse, verifyInteractiveRequest } from "@/lib/security/bot-id";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import type { RateLimitPolicy } from "@/lib/security/route-policy";

export async function guardInteractiveApi(
  request: Request,
  options: {
    checkLevel: "basic" | "deepAnalysis";
    rateLimit: RateLimitPolicy;
    rateLimitKey?: string;
  },
): Promise<Response | null> {
  const limited = await enforceRateLimit(options.rateLimit, request, {
    key: options.rateLimitKey,
  });
  if (limited) return limited;

  const bot = await verifyInteractiveRequest(options.checkLevel, request);
  if (!bot.allowed) {
    console.warn("[security] automated request denied", {
      pathname: new URL(request.url).pathname,
      verified: bot.isVerifiedBot,
    });
    return botDeniedResponse();
  }

  return null;
}
