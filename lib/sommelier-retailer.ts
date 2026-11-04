export type RetailerId = "mega-image" | "unknown";

export interface RetailerRequest {
  detected: boolean;
  id: RetailerId;
  label: string | null;
  /** No licensed live inventory/pricing feed is configured in this release. */
  availabilityStatus: "unverified" | "verified";
  reason: string | null;
}

const RETAILERS: Array<{
  id: Exclude<RetailerId, "unknown">;
  label: string;
  aliases: RegExp[];
}> = [
  {
    id: "mega-image",
    label: "Mega Image",
    aliases: [
      /\bmega\s*image\b/i,
      /\bmega\s*image\s*romania\b/i,
      /\bmega\b/i,
      /\bmega-image\b/i,
    ],
  },
];

export function detectRetailer(raw: string): RetailerRequest {
  const normalized = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const retailer of RETAILERS) {
    if (!retailer.aliases.some((alias) => alias.test(normalized))) continue;
    return {
      detected: true,
      id: retailer.id,
      label: retailer.label,
      availabilityStatus: "unverified",
      reason: "no_licensed_live_store_feed",
    };
  }
  return {
    detected: false,
    id: "unknown",
    label: null,
    availabilityStatus: "unverified",
    reason: null,
  };
}

export function describeRetailerForPrompt(
  retailer: RetailerRequest,
  locale: "ro" | "en" = "ro",
): string[] {
  if (!retailer.detected || !retailer.label) return [];
  return locale === "ro"
    ? [
        `Retailer cerut: ${retailer.label}.`,
        "VinIntel nu are în această versiune un feed licențiat de stoc și prețuri live pentru Mega Image. Nu afirma că un vin este în stoc la Mega Image, nu inventa prețuri de raft și nu prezenta catalogul VinIntel ca dovadă de disponibilitate în magazin.",
        "Poți explica scurt această limitare și poți oferi criterii de stil, respectând bugetul cerut. Nu transforma lipsa datelor despre retailer în afirmația că nu există vinuri bune pe piață.",
      ]
    : [
        `Requested retailer: ${retailer.label}.`,
        "VinIntel has no licensed live stock or shelf-price feed for this retailer in this release. Do not claim that a wine is in stock there, do not invent shelf prices, and do not present the VinIntel catalog as proof of store availability.",
        "Briefly explain that limitation and offer style criteria within the requested budget. Never turn missing retailer data into a claim that no good wines exist on the market.",
      ];
}
