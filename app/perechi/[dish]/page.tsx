import { redirect } from "next/navigation";

interface LegacyPairingRedirectProps {
  params: Promise<{ dish: string }>;
}

/** Legacy URL: /perechi/[dish] -> /vin-pentru/[dish] */
export default async function LegacyPairingRedirect({
  params,
}: LegacyPairingRedirectProps) {
  const { dish } = await params;
  redirect(`/vin-pentru/${dish}`);
}
