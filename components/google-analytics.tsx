import { GoogleAnalytics as NextGoogleAnalytics } from "@next/third-parties/google";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return <NextGoogleAnalytics gaId={GA_MEASUREMENT_ID} />;
}
