import {
  generateTopListStaticParams,
} from "@/app/topuri/[slug]/page";
import { isAppLocale } from "@/i18n/locale";

export { default, generateMetadata } from "@/app/topuri/[slug]/page";
export const revalidate = 3600;
export const dynamicParams = false;

interface LocaleTopListParams {
  params: { locale: string; slug: string };
}

export async function generateStaticParams({
  params,
}: LocaleTopListParams): Promise<Array<{ slug: string }>> {
  const { locale } = params;
  if (!isAppLocale(locale)) return [];
  return generateTopListStaticParams(locale);
}
