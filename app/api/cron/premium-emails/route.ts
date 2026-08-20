import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { envOrUndefined } from "@/lib/env";
import { runPremiumSubscriptionEmailJob } from "@/lib/premium-subscription-emails";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { RATE_LIMIT_POLICIES } from "@/lib/security/route-policy";

export const runtime = "nodejs";

function secretsMatch(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export async function GET(req: Request) {
  const cronSecret = envOrUndefined("CRON_SECRET");
  const authHeader = req.headers.get("authorization");

  if (!cronSecret) {
    console.error("[premium-emails-cron] CRON_SECRET is not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  if (!authHeader || !secretsMatch(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit(
    RATE_LIMIT_POLICIES.premiumEmailCron,
    req,
    { key: "premium-email-cron" },
  );
  if (limited) return limited;

  const result = await runPremiumSubscriptionEmailJob();
  return NextResponse.json({ ok: true, ...result });
}
