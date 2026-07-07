import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { wineries } from "@/lib/schema";
import { trackWineryAnalyticsEvent } from "@/lib/winery-analytics";

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
  wineId: z.number().int().positive().optional(),
  wineryEventId: z.number().int().positive().optional(),
  path: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

interface RouteContext {
  params: Promise<{ wineryId: string }>;
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { wineryId: wineryIdParam } = await context.params;
    const wineryId = Number(wineryIdParam);

    if (!Number.isInteger(wineryId) || wineryId <= 0) {
      return Response.json({ error: "ID crama invalid." }, { status: 400 });
    }

    const winery = await db.query.wineries.findFirst({
      where: eq(wineries.id, wineryId),
      columns: { id: true },
    });

    if (!winery) {
      return Response.json({ error: "Crama negasita." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: "Date invalide." }, { status: 400 });
    }

    const userAgent = req.headers.get("user-agent") ?? undefined;
    const referrer =
      parsed.data.referrer ?? req.headers.get("referer") ?? undefined;

    const result = await trackWineryAnalyticsEvent(
      {
        wineryId,
        eventType: parsed.data.eventType,
        wineId: parsed.data.wineId,
        wineryEventId: parsed.data.wineryEventId,
        path: parsed.data.path,
        referrer,
        userAgent,
        metadata: parsed.data.metadata,
      },
      req,
    );

    if (!result.ok) {
      if (result.reason === "analytics_disabled") {
        return Response.json({ error: "Analytics dezactivat." }, { status: 403 });
      }
      return Response.json({ error: "Nu am putut inregistra evenimentul." }, { status: 400 });
    }

    return Response.json({ ok: true, id: result.id });
  } catch (error) {
    console.error("[winery-analytics]", error);
    return Response.json(
      { error: "Eroare la inregistrarea evenimentului." },
      { status: 500 },
    );
  }
}
