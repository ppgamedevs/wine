import { notFound, redirect } from "next/navigation";
import { getWineryBySlug } from "@/lib/queries";

interface LegacyWineryPageProps {
  params: Promise<{ slug: string }>;
}

/** Romanian URL alias: /crame/[slug] -> /wineries/[slug] */
export default async function LegacyWineryRedirect({
  params,
}: LegacyWineryPageProps) {
  const { slug } = await params;
  const winery = await getWineryBySlug(slug);
  if (!winery) notFound();
  redirect(`/wineries/${slug}`);
}
