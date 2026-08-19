import type { AppLocale } from "@/i18n/locale";

export interface LocalizedRouteParams {
  home: undefined;
  wines: undefined;
  wine: { slug: string };
  wineries: undefined;
  winery: { slug: string };
  topWines: undefined;
  topWine: { slug: string };
  journal: undefined;
  journalArticle: { slug: string };
  region: { slug: string };
  grapeVariety: { slug: string };
  wineFor: { dish: string };
  study: { slug: string };
  search: undefined;
  aiSommelier: undefined;
  howScoresWork: undefined;
  addWine: undefined;
  claimWinery: undefined;
  privacyPolicy: undefined;
  cookiePolicy: undefined;
}

export type LocalizedRoute = keyof LocalizedRouteParams;

type RouteArguments<Route extends LocalizedRoute> =
  LocalizedRouteParams[Route] extends undefined
    ? []
    : [params: LocalizedRouteParams[Route]];

export interface ResolvedLocalizedPath<Route extends LocalizedRoute = LocalizedRoute> {
  locale: AppLocale;
  route: Route;
  params: LocalizedRouteParams[Route];
}

export interface AlternateLocaleResolverHooks {
  topWineSlug?: (
    slug: string,
    fromLocale: AppLocale,
    toLocale: AppLocale,
  ) => string | undefined;
  journalArticleSlug?: (
    slug: string,
    fromLocale: AppLocale,
    toLocale: AppLocale,
  ) => string | undefined;
}

const STATIC_PATHS: Record<
  Exclude<
    LocalizedRoute,
    | "wine"
    | "winery"
    | "topWine"
    | "journalArticle"
    | "region"
    | "grapeVariety"
    | "wineFor"
    | "study"
  >,
  Record<AppLocale, string>
> = {
  home: { ro: "/", en: "/" },
  wines: { ro: "/vinuri", en: "/wines" },
  wineries: { ro: "/crame", en: "/wineries" },
  topWines: { ro: "/topuri", en: "/top-wines" },
  journal: { ro: "/journal", en: "/journal" },
  search: { ro: "/cauta", en: "/search" },
  aiSommelier: { ro: "/ai-sommelier", en: "/ai-sommelier" },
  howScoresWork: {
    ro: "/cum-functioneaza-scorurile",
    en: "/how-scores-work",
  },
  addWine: { ro: "/adauga-vin", en: "/add-wine" },
  claimWinery: {
    ro: "/claim-your-winery",
    en: "/claim-your-winery",
  },
  privacyPolicy: {
    ro: "/politica-confidentialitate",
    en: "/privacy-policy",
  },
  cookiePolicy: { ro: "/politica-cookies", en: "/cookie-policy" },
};

function localePrefix(locale: AppLocale): string {
  return locale === "en" ? "/en" : "";
}

function localizedPath(locale: AppLocale, pathname: string): string {
  if (pathname === "/") {
    return locale === "en" ? "/en" : "/";
  }

  return `${localePrefix(locale)}${pathname}`;
}

function segment(value: string): string {
  return encodeURIComponent(value);
}

export function localizedHref<Route extends LocalizedRoute>(
  locale: AppLocale,
  route: Route,
  ...args: RouteArguments<Route>
): string {
  const params = args[0] as LocalizedRouteParams[Route] | undefined;

  switch (route) {
    case "wine":
      return localizedPath(
        locale,
        `/wines/${segment((params as LocalizedRouteParams["wine"]).slug)}`,
      );
    case "winery":
      return localizedPath(
        locale,
        `/wineries/${segment((params as LocalizedRouteParams["winery"]).slug)}`,
      );
    case "topWine":
      return localizedPath(
        locale,
        `${locale === "ro" ? "/topuri" : "/top-wines"}/${segment(
          (params as LocalizedRouteParams["topWine"]).slug,
        )}`,
      );
    case "journalArticle":
      return localizedPath(
        locale,
        `/journal/${segment(
          (params as LocalizedRouteParams["journalArticle"]).slug,
        )}`,
      );
    case "region":
      return localizedPath(
        locale,
        `${locale === "ro" ? "/regiuni" : "/regions"}/${segment(
          (params as LocalizedRouteParams["region"]).slug,
        )}`,
      );
    case "grapeVariety":
      return localizedPath(
        locale,
        `${locale === "ro" ? "/soiuri" : "/grape-varieties"}/${segment(
          (params as LocalizedRouteParams["grapeVariety"]).slug,
        )}`,
      );
    case "wineFor":
      return localizedPath(
        locale,
        `${locale === "ro" ? "/vin-pentru" : "/wine-for"}/${segment(
          (params as LocalizedRouteParams["wineFor"]).dish,
        )}`,
      );
    case "study":
      return localizedPath(
        locale,
        `${locale === "ro" ? "/studii" : "/studies"}/${segment(
          (params as LocalizedRouteParams["study"]).slug,
        )}`,
      );
    default:
      return localizedPath(
        locale,
        STATIC_PATHS[
          route as keyof typeof STATIC_PATHS
        ][locale],
      );
  }
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function splitLocale(pathname: string): {
  locale: AppLocale;
  pathname: string;
} {
  const normalized =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  if (normalized === "/en") {
    return { locale: "en", pathname: "/" };
  }
  if (normalized.startsWith("/en/")) {
    return { locale: "en", pathname: normalized.slice(3) };
  }

  return { locale: "ro", pathname: normalized || "/" };
}

export function resolveLocalizedPath(
  externalPathname: string,
): ResolvedLocalizedPath | null {
  const { locale, pathname } = splitLocale(externalPathname);

  for (const [route, paths] of Object.entries(STATIC_PATHS) as Array<
    [keyof typeof STATIC_PATHS, Record<AppLocale, string>]
  >) {
    if (paths[locale] === pathname) {
      return { locale, route, params: undefined } as ResolvedLocalizedPath;
    }
  }

  const dynamicRoutes: Array<{
    route:
      | "wine"
      | "winery"
      | "topWine"
      | "journalArticle"
      | "region"
      | "grapeVariety"
      | "wineFor"
      | "study";
    prefix: Record<AppLocale, string>;
    param: "slug" | "dish";
  }> = [
    { route: "wine", prefix: { ro: "/wines", en: "/wines" }, param: "slug" },
    {
      route: "winery",
      prefix: { ro: "/wineries", en: "/wineries" },
      param: "slug",
    },
    {
      route: "topWine",
      prefix: { ro: "/topuri", en: "/top-wines" },
      param: "slug",
    },
    {
      route: "journalArticle",
      prefix: { ro: "/journal", en: "/journal" },
      param: "slug",
    },
    {
      route: "region",
      prefix: { ro: "/regiuni", en: "/regions" },
      param: "slug",
    },
    {
      route: "grapeVariety",
      prefix: { ro: "/soiuri", en: "/grape-varieties" },
      param: "slug",
    },
    {
      route: "wineFor",
      prefix: { ro: "/vin-pentru", en: "/wine-for" },
      param: "dish",
    },
    {
      route: "study",
      prefix: { ro: "/studii", en: "/studies" },
      param: "slug",
    },
  ];

  for (const definition of dynamicRoutes) {
    const prefix = `${definition.prefix[locale]}/`;
    if (!pathname.startsWith(prefix)) continue;

    const value = pathname.slice(prefix.length);
    if (!value || value.includes("/")) continue;

    return {
      locale,
      route: definition.route,
      params: { [definition.param]: decodeSegment(value) },
    } as ResolvedLocalizedPath;
  }

  // Resolve the four Romanian aliases to their canonical route identity.
  if (locale === "ro") {
    const aliasRoutes = [
      { prefix: "/vinuri/", route: "wine", param: "slug" },
      { prefix: "/crame/", route: "winery", param: "slug" },
      { prefix: "/perechi/", route: "wineFor", param: "dish" },
    ] as const;

    for (const alias of aliasRoutes) {
      if (!pathname.startsWith(alias.prefix)) continue;
      const value = pathname.slice(alias.prefix.length);
      if (!value || value.includes("/")) continue;
      return {
        locale,
        route: alias.route,
        params: { [alias.param]: decodeSegment(value) },
      } as ResolvedLocalizedPath;
    }

    if (pathname === "/jurnal-vin") {
      return { locale, route: "journal", params: undefined };
    }
  }

  return null;
}

export function alternateLocaleHref(
  externalPathname: string,
  targetLocale: AppLocale,
  hooks: AlternateLocaleResolverHooks = {},
): string | null {
  const resolved = resolveLocalizedPath(externalPathname);
  if (!resolved) return null;

  if (resolved.route === "topWine") {
    const params = resolved.params as LocalizedRouteParams["topWine"];
    const slug =
      hooks.topWineSlug?.(params.slug, resolved.locale, targetLocale) ??
      params.slug;
    return localizedHref(targetLocale, "topWine", { slug });
  }

  if (resolved.route === "journalArticle") {
    const params = resolved.params as LocalizedRouteParams["journalArticle"];
    const slug =
      hooks.journalArticleSlug?.(
        params.slug,
        resolved.locale,
        targetLocale,
      ) ?? params.slug;
    return localizedHref(targetLocale, "journalArticle", { slug });
  }

  const params = resolved.params;
  return (
    localizedHref as (
      locale: AppLocale,
      route: LocalizedRoute,
      params?: LocalizedRouteParams[LocalizedRoute],
    ) => string
  )(targetLocale, resolved.route, params);
}
