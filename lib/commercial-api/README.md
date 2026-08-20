# Future commercial API architecture

Status: contracts only. This directory does not create routes, database tables, migrations, credentials, or network behavior.

## Boundary

The future commercial API is a separate authenticated product surface. Existing public site routes remain site routes and must not become undocumented catalog export endpoints.

The proposed route namespace is `/api/v1`. No route in that namespace should be added until authentication, quotas, metering, and auxiliary storage are available together.

## Request flow

1. Parse the API key format and extract its environment and lookup prefix.
2. Load one candidate key record from auxiliary storage by prefix.
3. Hash the presented secret with HMAC SHA-256, the configured server pepper, and the recorded hash version.
4. Compare hashes in constant time.
5. Reject inactive clients and revoked, expired, or out of grace keys.
6. Require the operation scope on both the client and key.
7. Apply the plan rate limit and reserve monthly request units atomically.
8. Validate filters, page size, and the signed opaque cursor.
9. read only the bounded DTO projection from the primary catalog.
10. Append one idempotent meter event to auxiliary storage.
11. Return a versioned DTO and cursor metadata.

Authentication failures should use one generic external response. Detailed reasons belong only in restricted operational logs.

## Clients and keys

Keys should contain at least 32 random secret bytes and use a recognizable prefix such as `vi_live_` or `vi_test_`. Only a short lookup prefix and a keyed HMAC SHA-256 digest are stored. Plaintext is displayed once at creation and rotation, then discarded.

The HMAC pepper is deployment secret material and must not live in the database. `hashVersion` permits a later pepper or algorithm migration without accepting plaintext storage.

Rotation creates a replacement key and marks the previous key as `rotating` for a short grace window. After the window, the previous key becomes revoked. Emergency revocation has no grace period. Client suspension invalidates every key for that client.

Key prefixes are identifiers, not credentials. Prefix lookup must still be followed by constant-time hash verification.

## Scopes and plans

The first version defines four read scopes:

- `wines:read`
- `wineries:read`
- `pairings:read`
- `rankings:read`

Scopes are additive and deny by default. A key can use only the intersection of its own scopes, the client scopes, and the plan scopes.

Plans set requests per minute, monthly request units, maximum page size, and burst policy. Limits in `COMMERCIAL_API_PLANS` are contract defaults, not billing promises. Product and legal review must approve them before launch.

## Quotas and metering

Rate limits protect short windows. Monthly request units enforce plan allowance. Both are keyed by client, not only by key, so creating or rotating keys cannot bypass a quota.

Unit reservation must be atomic. Meter events use an idempotency key so retries do not double charge. Each event records API version, operation, scope, outcome, request units, response item count, client, key, and timestamp.

Authentication failures should not create billable units. Valid requests rejected by rate or monthly quota may create zero-unit operational events.

## Pagination

All collection operations use cursor pagination. Offset pagination is not part of the contract.

The opaque cursor encodes version, resource, stable sort value, tie breaker ID, and a fingerprint of normalized filters. It should be authenticated with a server secret before use. A cursor from another resource or filter set is invalid.

Each operation clamps the requested limit to the plan maximum. Responses return `nextCursor` and `hasMore`. No operation offers an unbounded mode, full export switch, wildcard expansion, or user-selected raw fields.

## Versioned DTOs

Version 1 DTOs are explicit projections. They do not spread database rows and do not include source documents, raw scraped text, embeddings, prompts, internal evidence, contact data, Stripe identifiers, IP data, or internal notes.

Breaking field or meaning changes require a new API version. Additive optional fields may be introduced in the current version only after payload and privacy review.

## Separate auxiliary storage

Client records, key hashes, revocation state, quota counters, idempotency records, and meter events belong in separate auxiliary storage under the `commercial_api` namespace.

The primary catalog remains the source for public wine, winery, pairing, and ranking projections. Commercial API control data must not add columns to catalog tables. Metering writes must never update catalog records.

The storage interfaces in `storage.ts` are ports only. A future implementation may use a separate Turso database or another transactional service. Selection and migration work are intentionally outside this static design.

## Launch prerequisites

- Implement auxiliary storage and retention rules.
- Implement key generation, HMAC hashing, constant-time verification, rotation, and revocation.
- Implement atomic quota reservation and idempotent metering.
- Define operation-specific unit costs and bounded queries.
- Add security, privacy, abuse, and billing reviews.
- Add route tests for authentication, scope denial, cursor tampering, quota races, and DTO field allowlists.
- Add `/api/v1` routes only after every prerequisite is deployable together.
