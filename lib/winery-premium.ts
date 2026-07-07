import type { Winery } from "@/types";

export function isWineryPremium(
  winery: Pick<Winery, "isPremium">,
): boolean {
  return winery.isPremium;
}

export function canTrackWineryAnalytics(
  winery: Pick<Winery, "isPremium" | "analyticsEnabled">,
): boolean {
  return winery.isPremium && winery.analyticsEnabled;
}

export function canCaptureWineryLeads(
  winery: Pick<Winery, "isPremium" | "leadCaptureEnabled">,
): boolean {
  return winery.isPremium && winery.leadCaptureEnabled;
}

export function isWineryFeatured(
  winery: Pick<Winery, "isPremium" | "featuredPlacement">,
): boolean {
  return winery.isPremium && winery.featuredPlacement;
}

/** Editorial story: premium customStory overrides catalog/DB description. */
export function resolveWineryStory(winery: {
  isPremium: boolean;
  customStory: string | null;
  description: string | null;
  catalogStory?: string | null;
}): string[] {
  if (winery.isPremium && winery.customStory?.trim()) {
    return winery.customStory
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  if (winery.catalogStory?.trim()) {
    return winery.catalogStory
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  if (winery.description?.trim()) {
    return [winery.description.trim()];
  }

  return [];
}

export function resolveWineryBannerUrl(winery: {
  isPremium: boolean;
  customBannerUrl: string | null;
}): string | null {
  if (winery.isPremium && winery.customBannerUrl?.trim()) {
    return winery.customBannerUrl.trim();
  }
  return null;
}
