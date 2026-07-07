import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  type WineryAnalyticsEventType,
  type WineryAnalyticsMetadata,
  wineryAnalytics,
  wineries,
} from "@/lib/schema";
import { canTrackWineryAnalytics } from "@/lib/winery-premium";
import { getClientIp } from "@/lib/wine-vote-service";

const analyticsEventSchema = z.enum([
  "page_view",
  "profile_click",
  "wine_click",
  "purchase_click",
  "event_click",
  "lead_submit",
  "visit_click",
  "banner_click",
]);

const trackInputSchema = z.object({
  wineryId: z.number().int().positive(),
  eventType: analyticsEventSchema,
  wineId: z.number().int().positive().optional(),
  wineryEventId: z.number().int().positive().optional(),
  path: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
  userAgent: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export type TrackWineryAnalyticsInput = z.infer<typeof trackInputSchema>;

export async function trackWineryAnalyticsEvent(
  input: TrackWineryAnalyticsInput,
  req?: Request,
): Promise<{ ok: true; id: number } | { ok: false; reason: string }> {
  const parsed = trackInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_payload" };
  }

  const winery = await db.query.wineries.findFirst({
    where: eq(wineries.id, parsed.data.wineryId),
    columns: {
      id: true,
      isPremium: true,
      analyticsEnabled: true,
    },
  });

  if (!winery) {
    return { ok: false, reason: "winery_not_found" };
  }

  if (!canTrackWineryAnalytics(winery)) {
    return { ok: false, reason: "analytics_disabled" };
  }

  const ipAddress = req ? getClientIp(req) : undefined;

  const [row] = await db
    .insert(wineryAnalytics)
    .values({
      wineryId: parsed.data.wineryId,
      eventType: parsed.data.eventType as WineryAnalyticsEventType,
      wineId: parsed.data.wineId ?? null,
      wineryEventId: parsed.data.wineryEventId ?? null,
      path: parsed.data.path ?? null,
      referrer: parsed.data.referrer ?? null,
      userAgent: parsed.data.userAgent ?? null,
      ipAddress: ipAddress ?? null,
      metadata: (parsed.data.metadata ?? null) as WineryAnalyticsMetadata | null,
    })
    .returning({ id: wineryAnalytics.id });

  return { ok: true, id: row.id };
}
