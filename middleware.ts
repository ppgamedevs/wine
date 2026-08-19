import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { isEnglishIndexingEnabled } from "@/lib/i18n/indexing";

const handleI18nRouting = createMiddleware(routing);

const PRIVATE_WINERY_PATHS = [
  /^\/wineries\/premium(?:\/|$)/,
  /^\/wineries\/[^/]+\/dashboard(?:\/|$)/,
] as const;

function getRomanianAliasDestination(pathname: string): string | null {
  if (/^\/jurnal-vin\/?$/.test(pathname)) return "/journal";

  const aliases = [
    { pattern: /^\/vinuri\/([^/]+)\/?$/, target: "/wines" },
    { pattern: /^\/crame\/([^/]+)\/?$/, target: "/wineries" },
    { pattern: /^\/perechi\/([^/]+)\/?$/, target: "/vin-pentru" },
  ] as const;

  for (const alias of aliases) {
    const match = pathname.match(alias.pattern);
    if (match?.[1]) return `${alias.target}/${match[1]}`;
  }

  return null;
}

export default function middleware(request: NextRequest) {
  const aliasDestination = getRomanianAliasDestination(
    request.nextUrl.pathname,
  );
  if (aliasDestination) {
    const destination = request.nextUrl.clone();
    destination.pathname = aliasDestination;
    return NextResponse.redirect(destination, 308);
  }

  if (
    PRIVATE_WINERY_PATHS.some((pattern) =>
      pattern.test(request.nextUrl.pathname),
    )
  ) {
    return NextResponse.next();
  }

  const response = handleI18nRouting(request);
  if (
    !isEnglishIndexingEnabled() &&
    (request.nextUrl.pathname === "/en" ||
      request.nextUrl.pathname.startsWith("/en/"))
  ) {
    response.headers.set("X-Robots-Tag", "noindex, follow");
  }
  return response;
}

export const config = {
  matcher: "/((?!api|admin|embed|_next|_vercel|.*\\..*).*)",
};
