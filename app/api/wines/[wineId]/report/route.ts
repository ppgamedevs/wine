import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { notifyWineReport } from "@/lib/notifications";
import { wineReports, wines } from "@/lib/schema";
import { guardInteractiveApi } from "@/lib/security/api-guard";
import { readBoundedJson } from "@/lib/security/request-body";
import { RATE_LIMIT_POLICIES } from "@/lib/security/route-policy";

const requestSchema = z.object({
  reason: z.string().max(500).optional(),
  submittedBy: z.string().max(120).optional(),
});

interface RouteContext {
  params: Promise<{ wineId: string }>;
}

function wineSlugCondition(slug: string) {
  return eq(wines.slug, slug);
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const denied = await guardInteractiveApi(req, {
      checkLevel: "basic",
      rateLimit: RATE_LIMIT_POLICIES.wineReport,
    });
    if (denied) return denied;

    const { wineId: wineReference } = await context.params;

    const wine = await db.query.wines.findFirst({
      where: wineSlugCondition(wineReference),
      columns: { id: true, name: true, slug: true, reportCount: true },
      with: {
        winery: {
          columns: { name: true },
        },
      },
    });

    if (!wine) {
      return Response.json({ error: "Vin negasit." }, { status: 404 });
    }

    const parsedBody = await readBoundedJson(req, requestSchema, 2_048);
    if (!parsedBody.ok) return parsedBody.response;

    const submittedBy = parsedBody.data.submittedBy ?? "anonymous";

    const [insertedReport] = await db
      .insert(wineReports)
      .values({
        wineId: wine.id,
        reason: parsedBody.data.reason,
        submittedBy,
      })
      .returning({
        id: wineReports.id,
        reason: wineReports.reason,
        submittedBy: wineReports.submittedBy,
        createdAt: wineReports.createdAt,
      });

    const [updated] = await db
      .update(wines)
      .set({ reportCount: wine.reportCount + 1 })
      .where(eq(wines.id, wine.id))
      .returning({ reportCount: wines.reportCount });

    const reportCount = updated?.reportCount ?? wine.reportCount + 1;

    void notifyWineReport(
      {
        id: wine.id,
        name: wine.name,
        slug: wine.slug,
        reportCount,
        producer: wine.winery?.name ?? null,
      },
      {
        id: insertedReport.id,
        reason: insertedReport.reason,
        submittedBy: insertedReport.submittedBy ?? submittedBy,
        createdAt: insertedReport.createdAt,
      },
    ).catch((error) => {
      console.error("[WINE REPORT] notification failed", error);
    });

    return Response.json({
      ok: true,
      reportCount,
    });
  } catch (error) {
    console.error("[wine-report]", error);
    return Response.json(
      { error: "Nu am putut trimite raportul." },
      { status: 500 },
    );
  }
}
