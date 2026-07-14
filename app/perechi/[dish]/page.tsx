import { permanentRedirect } from "next/navigation";

interface LegacyPairingRedirectProps {
  params: Promise<{ dish: string }>;
}

/** Legacy URL: /perechi/[dish] -> /vin-pentru/[dish] (permanent, consolidates link equity). */
export default async function LegacyPairingRedirect({
  params,
}: LegacyPairingRedirectProps) {
  const { dish } = await params;
  permanentRedirect(`/vin-pentru/${dish}`);
}
