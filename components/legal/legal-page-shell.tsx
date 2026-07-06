import Link from "next/link";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buildBreadcrumbJsonLd } from "@/lib/seo";

export function LegalPageShell({
  path,
  title,
  description,
  children,
}: {
  path: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const breadcrumbs = buildBreadcrumbJsonLd([
    { name: "Acasa", path: "/" },
    { name: title, path },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} id={`breadcrumb-${path.replace(/\//g, "")}`} />
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border/60 bg-gradient-to-b from-[#faf7f5] to-background">
          <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
            <nav aria-label="Breadcrumb" className="mb-6 text-sm">
              <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
                <li>
                  <Link href="/" className="transition-colors hover:text-wine">
                    Acasa
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="font-medium text-foreground">{title}</li>
              </ol>
            </nav>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">{description}</p>
          </div>
        </div>

        <article className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
          <div className="prose prose-neutral max-w-none prose-headings:font-serif prose-headings:font-semibold prose-a:text-wine prose-a:no-underline hover:prose-a:underline">
            {children}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
