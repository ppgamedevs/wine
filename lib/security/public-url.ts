import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isSafePublicWineUrl, normalizeSourceUrl } from "@/lib/wine-url";

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (isIP(normalized) === 4) {
    const [first = -1, second = -1] = normalized.split(".").map(Number);
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 198 && (second === 18 || second === 19)) ||
      first >= 224
    );
  }

  if (isIP(normalized) === 6) {
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb") ||
      normalized.startsWith("::ffff:127.") ||
      normalized.startsWith("::ffff:10.") ||
      normalized.startsWith("::ffff:192.168.")
    );
  }

  return true;
}

export async function isResolvablePublicWineUrl(input: string): Promise<boolean> {
  if (!isSafePublicWineUrl(input)) return false;

  try {
    const url = new URL(normalizeSourceUrl(input));
    const addresses = await lookup(url.hostname, {
      all: true,
      verbatim: true,
    });
    return (
      addresses.length > 0 &&
      addresses.every(({ address }) => !isPrivateAddress(address))
    );
  } catch {
    return false;
  }
}
