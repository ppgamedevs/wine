import { notFound, permanentRedirect } from "next/navigation";
import { getWineBySlug } from "@/lib/queries";

interface LegacyWinePageProps {
  params: Promise<{ slug: string }>;
}

/** Romanian URL alias: /vinuri/[slug] -> /wines/[slug] (permanent, consolidates link equity). */
export default async function LegacyWineRedirect({
  params,
}: LegacyWinePageProps) {
  const { slug } = await params;
  const wine = await getWineBySlug(slug);
  if (!wine) notFound();
  permanentRedirect(`/wines/${slug}`);
}
