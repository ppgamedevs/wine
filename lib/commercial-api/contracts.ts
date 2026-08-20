export type Brand<Value, Name extends string> = Value & {
  readonly __brand: Name;
};

export type IsoDateTime = Brand<string, "IsoDateTime">;
export type ApiClientId = Brand<string, "ApiClientId">;
export type ApiKeyId = Brand<string, "ApiKeyId">;
export type ApiPlanId = "sandbox" | "growth" | "business";
export type OpaqueCursor = Brand<string, "OpaqueCursor">;
export type MeterEventId = Brand<string, "MeterEventId">;

export type CommercialApiScope =
  | "wines:read"
  | "wineries:read"
  | "pairings:read"
  | "rankings:read";

export type ApiClientStatus = "active" | "suspended" | "closed";
export type ApiKeyStatus = "active" | "rotating" | "revoked" | "expired";
export type ApiKeyEnvironment = "test" | "live";

export const API_KEY_HASHING_POLICY = {
  algorithm: "hmac-sha256",
  version: 1,
  randomSecretBytes: 32,
  lookupPrefixCharacters: 16,
  requiresServerPepper: true,
  storesPlaintextSecret: false,
} as const;

export interface CommercialApiClient {
  id: ApiClientId;
  displayName: string;
  status: ApiClientStatus;
  planId: ApiPlanId;
  allowedScopes: readonly CommercialApiScope[];
  contactReference: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CommercialApiKeyRecord {
  id: ApiKeyId;
  clientId: ApiClientId;
  environment: ApiKeyEnvironment;
  keyPrefix: string;
  secretHash: string;
  hashAlgorithm: typeof API_KEY_HASHING_POLICY.algorithm;
  hashVersion: typeof API_KEY_HASHING_POLICY.version;
  scopes: readonly CommercialApiScope[];
  status: ApiKeyStatus;
  createdAt: IsoDateTime;
  expiresAt: IsoDateTime | null;
  lastUsedAt: IsoDateTime | null;
  rotatedFromKeyId: ApiKeyId | null;
  rotationGraceEndsAt: IsoDateTime | null;
  revokedAt: IsoDateTime | null;
  revocationReason: string | null;
}

export interface PresentedApiKey {
  environment: ApiKeyEnvironment;
  keyPrefix: string;
  plaintextSecret: string;
}

export type ApiKeyVerificationFailure =
  | "malformed"
  | "unknown_prefix"
  | "hash_mismatch"
  | "client_inactive"
  | "key_inactive"
  | "key_expired"
  | "scope_denied";

export type ApiKeyVerificationResult =
  | {
      ok: true;
      client: CommercialApiClient;
      key: CommercialApiKeyRecord;
      grantedScope: CommercialApiScope;
    }
  | {
      ok: false;
      reason: ApiKeyVerificationFailure;
    };

export interface ApiKeyRotationRequest {
  clientId: ApiClientId;
  currentKeyId: ApiKeyId;
  requestedScopes: readonly CommercialApiScope[];
  gracePeriodSeconds: number;
}

export interface ApiKeyRotationResult {
  previousKeyId: ApiKeyId;
  replacementKeyId: ApiKeyId;
  replacementPlaintextOnce: string;
  graceEndsAt: IsoDateTime;
}

export interface ApiKeyRevocationRequest {
  clientId: ApiClientId;
  keyId: ApiKeyId;
  reason: string;
  revokedAt: IsoDateTime;
}

export interface CommercialApiPlan {
  id: ApiPlanId;
  includedScopes: readonly CommercialApiScope[];
  requestsPerMinute: number;
  monthlyRequestUnits: number;
  maxPageSize: number;
  burstMultiplier: number;
}

export const COMMERCIAL_API_PLANS = {
  sandbox: {
    id: "sandbox",
    includedScopes: ["wines:read", "wineries:read"],
    requestsPerMinute: 10,
    monthlyRequestUnits: 1_000,
    maxPageSize: 20,
    burstMultiplier: 1,
  },
  growth: {
    id: "growth",
    includedScopes: [
      "wines:read",
      "wineries:read",
      "pairings:read",
      "rankings:read",
    ],
    requestsPerMinute: 120,
    monthlyRequestUnits: 100_000,
    maxPageSize: 50,
    burstMultiplier: 2,
  },
  business: {
    id: "business",
    includedScopes: [
      "wines:read",
      "wineries:read",
      "pairings:read",
      "rankings:read",
    ],
    requestsPerMinute: 600,
    monthlyRequestUnits: 1_000_000,
    maxPageSize: 100,
    burstMultiplier: 2,
  },
} as const satisfies Record<ApiPlanId, CommercialApiPlan>;

export interface QuotaWindow {
  clientId: ApiClientId;
  planId: ApiPlanId;
  windowStartedAt: IsoDateTime;
  windowEndsAt: IsoDateTime;
  usedRequestUnits: number;
  includedRequestUnits: number;
}

export type MeterOutcome =
  | "success"
  | "client_error"
  | "rate_limited"
  | "server_error";

export interface CommercialApiMeterEvent {
  id: MeterEventId;
  idempotencyKey: string;
  clientId: ApiClientId;
  apiKeyId: ApiKeyId;
  apiVersion: "v1";
  operationId: string;
  scope: CommercialApiScope;
  requestUnits: number;
  responseItemCount: number;
  outcome: MeterOutcome;
  occurredAt: IsoDateTime;
}

export interface CursorClaimsV1 {
  version: 1;
  resource: "wines" | "wineries" | "pairings" | "rankings";
  sortField: string;
  sortValue: string;
  tieBreakerId: string;
  filterFingerprint: string;
}

export interface CursorPageRequest {
  cursor?: OpaqueCursor;
  limit?: number;
}

export interface CursorPageMeta {
  apiVersion: "v1";
  limit: number;
  nextCursor: OpaqueCursor | null;
  hasMore: boolean;
}

export interface CursorPage<Data> {
  data: readonly Data[];
  page: CursorPageMeta;
}

export interface CommercialApiErrorV1 {
  apiVersion: "v1";
  error: {
    code:
      | "invalid_request"
      | "invalid_cursor"
      | "authentication_failed"
      | "scope_denied"
      | "quota_exceeded"
      | "rate_limited"
      | "not_found"
      | "internal_error";
    message: string;
    requestId: string;
    retryAfterSeconds?: number;
  };
}

export interface WineSummaryDtoV1 {
  apiVersion: "v1";
  id: string;
  slug: string;
  name: string;
  winery: {
    id: string;
    slug: string;
    name: string;
  };
  region: {
    slug: string;
    name: string;
  } | null;
  type: string;
  sweetness: string | null;
  vintage: number | null;
  grapeVarieties: readonly string[];
  priceRon: number | null;
  valueScore: number | null;
  publicUrl: string;
  updatedAt: IsoDateTime;
}

export interface WinerySummaryDtoV1 {
  apiVersion: "v1";
  id: string;
  slug: string;
  name: string;
  region: {
    slug: string;
    name: string;
  } | null;
  publicUrl: string;
  updatedAt: IsoDateTime;
}

export interface PairingDtoV1 {
  apiVersion: "v1";
  wineId: string;
  dishSlug: string;
  dishName: string;
  matchBand: "strong" | "good" | "possible";
  rationale: string;
}

export interface RankingEntryDtoV1 {
  apiVersion: "v1";
  rankingSlug: string;
  position: number;
  wine: WineSummaryDtoV1;
}
