import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { notifyWineReport } from "@/lib/notifications";
import { wineReports, wines } from "@/lib/schema";

const requestSchema = z.object({
  reason: z.string().max(500).optional(),
  submittedBy: z.string().max(120).optional(),
});

interface RouteContext {
  params: Promise<{ wineId: string }>;
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { wineId: wineIdParam } = await context.params;
    const wineId = Number(wineIdParam);

    if (!Number.isInteger(wineId) || wineId <= 0) {
      return Response.json({ error: "ID vin invalid." }, { status: 400 });
    }

    const wine = await db.query.wines.findFirst({
      where: eq(wines.id, wineId),
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

    const body = await req.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: "Date invalide." }, { status: 400 });
    }

    const submittedBy = parsed.data.submittedBy ?? "anonymous";

    const [insertedReport] = await db
      .insert(wineReports)
      .values({
        wineId: wine.id,
        reason: parsed.data.reason,
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
