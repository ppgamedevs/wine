import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import type { AppLocale } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { isEnglishIndexingEnabled } from "@/lib/i18n/indexing";
import { classifySearchQuery, searchPageHref } from "@/lib/search-intent";
import {
  encodeSommelierPromptCookie,
  SOMMELIER_PROMPT_COOKIE,
  SOMMELIER_PROMPT_MAX_AGE,
  sommelierPageHref,
} from "@/lib/sommelier-handoff";

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

function searchPathLocale(pathname: string): AppLocale | null {
  if (pathname === "/cauta" || pathname === "/ro/cauta") return "ro";
  if (pathname === "/en/search") return "en";
  return null;
}

function catalogSearchIntentRedirect(
  request: NextRequest,
): NextResponse | null {
  const locale = searchPathLocale(request.nextUrl.pathname);
  if (!locale) return null;

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const notice = request.nextUrl.searchParams.get("notice")?.trim() ?? "";

  if (notice === "link") {
    if (!query) return null;
    return NextResponse.redirect(
      new URL(searchPageHref(locale, "link"), request.url),
      307,
    );
  }

  if (query.length < 2) return null;

  const intent = classifySearchQuery(query, locale);
  if (intent === "link") {
    return NextResponse.redirect(
      new URL(searchPageHref(locale, "link"), request.url),
      307,
    );
  }

  if (intent !== "sommelier") return null;

  const response = NextResponse.redirect(
    new URL(sommelierPageHref(locale), request.url),
    307,
  );
  response.cookies.set({
    name: SOMMELIER_PROMPT_COOKIE,
    value: encodeSommelierPromptCookie(query),
    path: "/",
    maxAge: SOMMELIER_PROMPT_MAX_AGE,
    sameSite: "lax",
  });
  return response;
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

  const searchIntentRedirect = catalogSearchIntentRedirect(request);
  if (searchIntentRedirect) return searchIntentRedirect;

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
