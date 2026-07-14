import { notFound, permanentRedirect } from "next/navigation";
import { getWineryBySlug } from "@/lib/queries";

interface LegacyWineryPageProps {
  params: Promise<{ slug: string }>;
}

/** Romanian URL alias: /crame/[slug] -> /wineries/[slug] (permanent, consolidates link equity). */
export default async function LegacyWineryRedirect({
  params,
}: LegacyWineryPageProps) {
  const { slug } = await params;
  const winery = await getWineryBySlug(slug);
  if (!winery) notFound();
  permanentRedirect(`/wineries/${slug}`);
}
