/**
 * Local-only demo data for screenshots and UI review.
 * It must never run against Vercel/Turso or production.
 */
import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { regions, vintageEvidence, wineries, wines } from "@/lib/schema";

function assertLocal() {
  if (process.env.VERCEL === "1") {
    throw new Error("Vintage demo refuses to run in a Vercel/production environment.");
  }
  const url = process.env.TURSO_DATABASE_URL ?? "";
  if (!url.startsWith("file:")) {
    throw new Error("Vintage demo requires an explicit local file database.");
  }
}

async function main() {
  if (!process.argv.includes("--confirm-local")) {
    throw new Error("Pass --confirm-local to seed the local demo database.");
  }
  assertLocal();

  let region = (await db.select().from(regions).where(eq(regions.slug, "murfatlar-demo")).limit(1))[0];
  if (!region) {
    [region] = await db
      .insert(regions)
      .values({ slug: "murfatlar-demo", name: "Murfatlar", country: "Romania" })
      .returning();
  }
  let winery = (await db.select().from(wineries).where(eq(wineries.slug, "murfatlar-demo")).limit(1))[0];
  if (!winery) {
    [winery] = await db
      .insert(wineries)
      .values({ slug: "murfatlar-demo", name: "Murfatlar", regionId: region!.id, status: "verified" })
      .returning();
  }

  const releases = [];
  for (const vintage of [2021, 2025]) {
    const slug = `zestrea-muscat-ottonel-demisec-${vintage}-demo`;
    const name = `Zestrea Muscat Ottonel Demisec ${vintage} 0.75L`;
    let row = (await db.select().from(wines).where(eq(wines.slug, slug)).limit(1))[0];
    if (!row) {
      [row] = await db
        .insert(wines)
        .values({
          slug,
          name,
          wineryId: winery!.id,
          regionId: region!.id,
          type: "white",
          sweetness: "demisec",
          vintage,
          grapeVarieties: [{ name: "Muscat Ottonel" }],
          status: "verified",
        })
        .returning();
    }
    releases.push(row!);
  }

  const sources = [
    {
      publisher: "Demo dataset — methodology fixture",
      sourceTitle: "Demo harvest report",
      sourceUrl: "https://example.org/demo-vintage/harvest-2021",
      excerpt: "Iarnă cu rezerve de apă, înflorire uniformă și recoltă fără presiune majoră de boală.",
      evidenceType: "official_report" as const,
      impact: "positive" as const,
      eventDate: "2021-09-10",
      confidence: 0.86,
      independent: true,
    },
    {
      publisher: "Demo dataset — methodology fixture",
      sourceTitle: "Independent demo assessment",
      sourceUrl: "https://example.org/demo-vintage/critic-2021",
      excerpt: "Aciditate vie și maturitate fenolică bună pentru Muscat Ottonel.",
      evidenceType: "critic_review" as const,
      impact: "positive" as const,
      eventDate: "2021-09-20",
      confidence: 0.82,
      independent: true,
    },
    {
      publisher: "Demo dataset — methodology fixture",
      sourceTitle: "Demo producer note",
      sourceUrl: "https://example.org/demo-vintage/producer-2021",
      excerpt: "Producătorul recomandă consumul în 2–5 ani.",
      evidenceType: "maturity_guidance" as const,
      impact: "neutral" as const,
      eventDate: null,
      confidence: 0.8,
      independent: false,
      maturity: "can_age" as const,
    },
    {
      publisher: "Demo dataset — methodology fixture",
      sourceTitle: "Demo heat report 2025",
      sourceUrl: "https://example.org/demo-vintage/heat-2025",
      excerpt: "Val de căldură în august și recolte mai timpurii.",
      evidenceType: "heat" as const,
      impact: "negative" as const,
      eventDate: "2025-08-12",
      confidence: 0.78,
      independent: true,
    },
    {
      publisher: "Demo dataset — methodology fixture",
      sourceTitle: "Demo harvest report 2025",
      sourceUrl: "https://example.org/demo-vintage/harvest-2025",
      excerpt: "Recoltă grăbită, cu aciditate mai scăzută și selecție atentă la cules.",
      evidenceType: "harvest_timing_weather" as const,
      impact: "mixed" as const,
      eventDate: "2025-09-05",
      confidence: 0.76,
      independent: true,
    },
  ];

  for (const [index, release] of releases.entries()) {
    const selected = index === 0 ? sources.slice(0, 3) : sources.slice(3);
    for (const source of selected) {
      await db
        .insert(vintageEvidence)
        .values({
          scope: "region",
          region: "Murfatlar",
          appellation: null,
          grape: "Muscat Ottonel",
          wineryId: winery!.id,
          wineId: release.id,
          familyKey: null,
          vintage: release.vintage,
          evidenceType: source.evidenceType,
          impact: source.impact,
          sourceUrl: source.sourceUrl,
          sourceTitle: source.sourceTitle,
          publisher: source.publisher,
          publishedAt: "2026-01-15",
          eventDate: source.eventDate,
          excerpt: source.excerpt,
          confidence: source.confidence,
          producerClaim: !source.independent,
          independent: source.independent,
          regionalException: false,
          maturity: "maturity" in source ? source.maturity : null,
        })
        .onConflictDoNothing();
    }
  }

  console.log("Seeded local vintage demo:", releases.map((release) => release.slug));
}

main().catch((error) => {
  console.error("[vintage-demo]", error);
  process.exit(1);
});
