import { createHash } from "node:crypto";

/** Stable claim identity. Does not include observedAt. */
export function claimIdentityHash(parts: Array<string | number | null | undefined>): string {
  return createHash("sha256")
    .update(parts.map((part) => String(part ?? "")).join("|"))
    .digest("hex");
}
