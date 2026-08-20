import "server-only";

import { checkBotId } from "botid/server";
import { headers } from "next/headers";

type BotIdDevelopmentBypass = "HUMAN" | "BAD-BOT" | "GOOD-BOT" | "ALLOWED";

export interface BotVerification {
  allowed: boolean;
  isBot: boolean;
  isVerifiedBot: boolean;
}

function developmentBypass(): BotIdDevelopmentBypass {
  const configured = process.env.BOTID_DEV_BYPASS;
  if (
    configured === "BAD-BOT" ||
    configured === "GOOD-BOT" ||
    configured === "ALLOWED"
  ) {
    return configured;
  }
  return "HUMAN";
}

export async function verifyInteractiveRequest(
  checkLevel: "basic" | "deepAnalysis",
  request?: Request,
): Promise<BotVerification> {
  const host = request
    ? new URL(request.url).hostname
    : (await headers()).get("host")?.split(":")[0];
  const isLocalRequest =
    host === "localhost" || host === "127.0.0.1" || host === "::1";
  const isDevelopment =
    process.env.NODE_ENV !== "production" ||
    !process.env.VERCEL_ENV ||
    isLocalRequest;
  const result = await checkBotId({
    developmentOptions: {
      isDevelopment,
      bypass: isDevelopment ? developmentBypass() : undefined,
    },
    advancedOptions: { checkLevel },
  });

  return {
    allowed: !result.isBot,
    isBot: result.isBot,
    isVerifiedBot: result.isVerifiedBot,
  };
}

export function botDeniedResponse(): Response {
  return Response.json(
    {
      error: {
        code: "automated_request_denied",
        message: "Automated requests are not allowed for this operation.",
      },
    },
    {
      status: 403,
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
