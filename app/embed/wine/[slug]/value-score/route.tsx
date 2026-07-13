import { getWineBySlug } from "@/lib/queries";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

interface ValueScoreRouteProps {
  params: Promise<{ slug: string }>;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(_request: Request, { params }: ValueScoreRouteProps) {
  const { slug } = await params;
  const wine = await getWineBySlug(slug);

  if (!wine || wine.valueScore == null) {
    return new Response("Not found", { status: 404 });
  }

  const wineUrl = absoluteUrl(`/wines/${wine.slug}`);
  const label = escapeXml(wine.name);
  const score = wine.valueScore;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="280" height="72" viewBox="0 0 280 72" role="img" aria-label="${label} Value Score ${score} pe VinIntel">
  <a href="${wineUrl}" target="_blank" rel="noopener noreferrer">
    <rect width="280" height="72" rx="12" fill="#1c1917"/>
    <text x="16" y="30" fill="#F7E9D7" font-family="Georgia, serif" font-size="14" font-weight="700">${label}</text>
    <text x="16" y="54" fill="#F7E9D7" font-family="system-ui, sans-serif" font-size="13">Value Score ${score}/100 · VinIntel</text>
  </a>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
