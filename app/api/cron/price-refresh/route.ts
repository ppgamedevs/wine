import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { envOrUndefined } from "@/lib/env";
import {
  DbPriceRefreshStore,
  dbPriceRefreshFetcher,
} from "@/lib/price-refresh-store";
import { runPriceRefreshBatch } from "@/lib/price-refresh";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_SIZE = 14;

function secretsMatch(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export async function GET(req: Request) {
  const cronSecret = envOrUndefined("CRON_SECRET");
  if (!cronSecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !secretsMatch(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runPriceRefreshBatch({
    store: new DbPriceRefreshStore(),
    fetcher: dbPriceRefreshFetcher,
    lockToken: `cron:${randomUUID()}`,
    limit: BATCH_SIZE,
    requestDelayMs: 800,
  });

  return NextResponse.json(
    { ok: result.status === "success", ...result },
    {
      status: result.status === "success" ? 200 : 503,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
