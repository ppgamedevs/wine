import { getWineryBySlug } from "@/lib/queries";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

interface BadgeRouteProps {
  params: Promise<{ slug: string }>;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(_request: Request, { params }: BadgeRouteProps) {
  const { slug } = await params;
  const winery = await getWineryBySlug(slug);

  if (!winery) {
    return new Response("Not found", { status: 404 });
  }

  const profileUrl = absoluteUrl(`/wineries/${winery.slug}`);
  const label = escapeXml(winery.name);
  const verified = winery.verified ? "Profil verificat" : "Profil VinIntel";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80" viewBox="0 0 320 80" role="img" aria-label="${label} - ${verified} pe VinIntel">
  <a href="${profileUrl}" target="_blank" rel="noopener noreferrer">
    <rect width="320" height="80" rx="12" fill="#7C2D12"/>
    <text x="16" y="32" fill="#F7E9D7" font-family="Georgia, serif" font-size="16" font-weight="700">${label}</text>
    <text x="16" y="56" fill="#F7E9D7" font-family="system-ui, sans-serif" font-size="13" opacity="0.92">${verified} pe VinIntel</text>
  </a>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
