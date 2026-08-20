import type {
  ApiClientId,
  ApiKeyId,
  ApiKeyRevocationRequest,
  ApiPlanId,
  CommercialApiClient,
  CommercialApiKeyRecord,
  CommercialApiMeterEvent,
  IsoDateTime,
  MeterEventId,
  QuotaWindow,
} from "./contracts";

export const COMMERCIAL_API_STORAGE_BOUNDARY = {
  kind: "separate-auxiliary-storage",
  namespace: "commercial_api",
  primaryCatalogWritesAllowed: false,
  primaryCatalogForeignKeysRequired: false,
  containsPlaintextApiKeys: false,
} as const;

export interface CreateApiClientInput {
  displayName: string;
  planId: ApiPlanId;
  contactReference: string;
}

export interface StoreApiKeyInput {
  record: CommercialApiKeyRecord;
}

export interface CommercialApiControlStore {
  createClient(input: CreateApiClientInput): Promise<CommercialApiClient>;
  getClient(clientId: ApiClientId): Promise<CommercialApiClient | null>;
  updateClientPlan(
    clientId: ApiClientId,
    planId: ApiPlanId,
    updatedAt: IsoDateTime,
  ): Promise<CommercialApiClient>;
  suspendClient(
    clientId: ApiClientId,
    updatedAt: IsoDateTime,
  ): Promise<CommercialApiClient>;
  storeKey(input: StoreApiKeyInput): Promise<void>;
  getKeyByPrefix(keyPrefix: string): Promise<CommercialApiKeyRecord | null>;
  listClientKeys(clientId: ApiClientId): Promise<readonly CommercialApiKeyRecord[]>;
  markKeyUsed(keyId: ApiKeyId, usedAt: IsoDateTime): Promise<void>;
  revokeKey(input: ApiKeyRevocationRequest): Promise<CommercialApiKeyRecord>;
}

export interface AppendMeterEventResult {
  inserted: boolean;
  eventId: MeterEventId;
}

export interface CommercialApiMeterStore {
  appendEvent(
    event: CommercialApiMeterEvent,
  ): Promise<AppendMeterEventResult>;
  getQuotaWindow(
    clientId: ApiClientId,
    at: IsoDateTime,
  ): Promise<QuotaWindow>;
  reserveRequestUnits(
    clientId: ApiClientId,
    units: number,
    at: IsoDateTime,
  ): Promise<QuotaWindow>;
}

export interface CommercialApiAuxiliaryStorage {
  control: CommercialApiControlStore;
  meter: CommercialApiMeterStore;
}
