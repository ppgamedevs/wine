import { NextResponse } from "next/server";
import { envOrUndefined } from "@/lib/env";
import { runPremiumSubscriptionEmailJob } from "@/lib/premium-subscription-emails";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const cronSecret = envOrUndefined("CRON_SECRET");
  const authHeader = req.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runPremiumSubscriptionEmailJob();
  return NextResponse.json({ ok: true, ...result });
}
