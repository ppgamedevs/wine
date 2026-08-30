import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { SUPPORTED_LOCALES, isAppLocale } from "@/i18n/locale";
import { DocumentLocale } from "@/components/document-locale";
import type { Metadata } from "next";
import { localizedRobots } from "@/lib/i18n/indexing";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Pick<LocaleLayoutProps, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return { robots: { index: false, follow: false } };
  return { robots: localizedRobots(locale) };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();

  setRequestLocale(locale);

  const messages = await getMessages({ locale });
  const clientMessages = {
    Navigation: messages.Navigation,
    Route: messages.Route,
    Error: messages.Error,
    Search: messages.Search,
  };

  return (
    <NextIntlClientProvider locale={locale} messages={clientMessages}>
      <DocumentLocale locale={locale} />
      {children}
    </NextIntlClientProvider>
  );
}
