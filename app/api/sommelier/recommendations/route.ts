import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { wines } from "@/lib/schema";
import { catalogWineCondition } from "@/lib/wine-catalog";
import { serializeWineForChat } from "@/lib/sommelier-chat";
import { extractRecommendedSlugs } from "@/lib/sommelier-chat-utils";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: string };
    const text = body.text?.trim() ?? "";
    if (!text) {
      return Response.json({ recommendations: [] });
    }

    const slugRows = await db
      .select({ slug: wines.slug })
      .from(wines)
      .where(catalogWineCondition());

    const candidateSlugs = slugRows.map((row) => row.slug);
    const slugs = extractRecommendedSlugs(text, candidateSlugs);
    if (slugs.length === 0) {
      return Response.json({ recommendations: [] });
    }

    const rows = await db.query.wines.findMany({
      where: inArray(wines.slug, slugs),
      with: { winery: true, region: true },
    });

    const bySlug = new Map(rows.map((wine) => [wine.slug, wine]));
    const recommendations = slugs
      .map((slug) => bySlug.get(slug))
      .filter((wine) => wine != null)
      .map((wine) => serializeWineForChat(wine));

    return Response.json({ recommendations });
  } catch (error) {
    console.error("POST /api/sommelier/recommendations failed", error);
    return Response.json({ recommendations: [] }, { status: 500 });
  }
}
