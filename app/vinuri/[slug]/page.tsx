import { notFound, redirect } from "next/navigation";
import { getWineBySlug } from "@/lib/queries";

interface LegacyWinePageProps {
  params: Promise<{ slug: string }>;
}

/** Romanian URL alias: /vinuri/[slug] -> /wines/[slug] */
export default async function LegacyWineRedirect({
  params,
}: LegacyWinePageProps) {
  const { slug } = await params;
  const wine = await getWineBySlug(slug);
  if (!wine) notFound();
  redirect(`/wines/${slug}`);
}
