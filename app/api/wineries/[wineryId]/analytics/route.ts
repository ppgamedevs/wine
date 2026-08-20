import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { wineries, wineryEvents, wines } from "@/lib/schema";
import { trackWineryAnalyticsEvent } from "@/lib/winery-analytics";
import { guardInteractiveApi } from "@/lib/security/api-guard";
import { readBoundedJson } from "@/lib/security/request-body";
import { RATE_LIMIT_POLICIES } from "@/lib/security/route-policy";

const metadataValueSchema = z.union([
  z.string().max(200),
  z.number().finite(),
  z.boolean(),
]);

const requestSchema = z.object({
  eventType: z.enum([
    "page_view",
    "profile_click",
    "wine_click",
    "purchase_click",
    "event_click",
    "lead_submit",
    "visit_click",
    "banner_click",
  ]),
  wineSlug: z.string().min(1).max(160).optional(),
  wineryEventSlug: z.string().min(1).max(160).optional(),
  path: z.string().max(300).optional(),
  referrer: z.string().max(500).optional(),
  metadata: z
    .record(z.string().max(60), metadataValueSchema)
    .refine((value) => Object.keys(value).length <= 10)
    .optional(),
});

interface RouteContext {
  params: Promise<{ wineryId: string }>;
}

function winerySlugCondition(slug: string) {
  return eq(wineries.slug, slug);
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const denied = await guardInteractiveApi(req, {
      checkLevel: "basic",
      rateLimit: RATE_LIMIT_POLICIES.wineryAnalytics,
    });
    if (denied) return denied;

    const { wineryId: wineryReference } = await context.params;

    const winery = await db.query.wineries.findFirst({
      where: winerySlugCondition(wineryReference),
      columns: { id: true },
    });

    if (!winery) {
      return Response.json({ error: "Crama negasita." }, { status: 404 });
    }

    const parsedBody = await readBoundedJson(req, requestSchema, 4_096);
    if (!parsedBody.ok) return parsedBody.response;
    const data = parsedBody.data;

    const wine =
      data.wineSlug != null
        ? await db.query.wines.findFirst({
            where: eq(wines.slug, data.wineSlug),
            columns: { id: true, wineryId: true },
          })
        : null;
    const wineId = wine?.wineryId === winery.id ? wine.id : undefined;
    const wineryEvent =
      data.wineryEventSlug != null
        ? await db.query.wineryEvents.findFirst({
            where: and(
              eq(wineryEvents.wineryId, winery.id),
              eq(wineryEvents.slug, data.wineryEventSlug),
            ),
            columns: { id: true, wineryId: true },
          })
        : null;
    const wineryEventId =
      wineryEvent?.wineryId === winery.id ? wineryEvent.id : undefined;

    const userAgent = req.headers.get("user-agent") ?? undefined;
    const referrer =
      data.referrer ?? req.headers.get("referer") ?? undefined;

    const result = await trackWineryAnalyticsEvent(
      {
        wineryId: winery.id,
        eventType: data.eventType,
        wineId,
        wineryEventId,
        path: data.path,
        referrer,
        userAgent,
        metadata: data.metadata,
      },
      req,
    );

    if (!result.ok) {
      if (result.reason === "analytics_disabled") {
        return Response.json({ error: "Analytics dezactivat." }, { status: 403 });
      }
      return Response.json({ error: "Nu am putut inregistra evenimentul." }, { status: 400 });
    }

    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("[winery-analytics]", error);
    return Response.json(
      { error: "Eroare la inregistrarea evenimentului." },
      { status: 500 },
    );
  }
}
