# TypeSafe Jev integration (AI Sommelier)

Status: implemented, disabled by default (`JEV_MODE=off`). Nothing in this
integration changes public pages, canonical scores, URLs or structured data.

## What it does

1. **Sommelier intent engine.** Jev classifies a Romanian/English wine request
   into structured intent (occasion, food pairing, colour, sweetness, acidity,
   body, style, user intent, specificity, exclusions). Intent is runtime
   validated and only fills fields the deterministic parser left open.
2. **Recommendation integrity (grounding).** Deterministic rules decide whether
   VinIntel may recommend anything at all. If the user names a wine, grape,
   winery or region that is not in the catalog, or if hard constraints leave no
   candidate, the Sommelier says so and recommends nothing. A wrong bottle is
   worse than no bottle.
3. **PersonalMatch (internal, shadow).** A separate compatibility estimate that
   does not touch Value Score, Gift Score, Food Versatility or persisted
   rankings. It is logged for evaluation only.
4. **Provenance triage (read-only).** Deterministic identity checks plus an
   optional Jev semantic judgment for admin review. It can only make the
   assistant more cautious; it never verifies, merges or edits anything.

## Pipeline

```
POST /api/sommelier/chat
  → existing validation + rate limit (guardInteractiveApi)
  → deterministic parser (budget, dish, exclusions, contradictions)
  → Jev intent (shadow: diagnostics only | live: fills gaps)
  → catalog retrieval + hard-constraint filter (budget is absolute)
  → grounding gate (specific product? catalog match? candidates left?)
  → prompt with only real catalog wines
  → streamed answer + data-recommendations (possibly empty)
```

Budget parsing is deterministic and lives in `lib/sommelier-budget.ts`. Jev never
sees, computes or enforces a price.

## Files

| Area | Files |
| --- | --- |
| Config and flags | `lib/jev/config.ts`, `lib/sommelier-grounding-mode.ts` |
| Typed contracts | `lib/jev/types.ts`, `lib/jev/questions.ts` |
| Official API transport | `lib/jev/transport.ts` |
| Service (cache, metrics, logging) | `lib/jev/service.ts`, `lib/jev/cache.ts`, `lib/jev/metrics.ts`, `lib/jev/log.ts` |
| Intent mapping | `lib/jev/intent.ts` |
| Sommelier integration | `lib/sommelier-chat.ts`, `app/api/sommelier/chat/route.ts`, `lib/ai/prompts.ts` |
| Deterministic constraints | `lib/sommelier-budget.ts`, `lib/sommelier-constraints.ts` |
| Grounding | `lib/sommelier-grounding.ts` |
| PersonalMatch | `lib/recommendation/personal-match.ts` |
| Provenance triage | `lib/jev/provenance-triage.ts` |
| Evaluation | `lib/jev/evaluation.ts`, `scripts/jev-eval.ts`, `data/jev-eval/*.json` |
| Diagnostics | `app/api/admin/jev/route.ts` |
| Tests | `lib/jev/*.test.ts`, `lib/sommelier-*.test.ts`, `lib/recommendation/personal-match.test.ts` |

### Why the official HTTP endpoint instead of `@typesafe-ai/sdk`

The transport implements the documented contract from
<https://docs.typesafe.ai/api/systemone> (`POST /v1/systemone`, Bearer auth,
`{ model, state, questions }`). The SDK (v0.7.0) was inspected but could not be
installed in the development environment (`node_modules` is read-only, `npm
install` fails with `EPERM`), and it requires Node.js 22+. The project does not
declare a Node engine. Using the documented endpoint keeps one dependency tree,
one retry layer and one runtime-validation layer. If the SDK is adopted later,
only `lib/jev/transport.ts` changes; the service contract stays the same.

## Environment variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `TYPESAFE_API_KEY` | unset | Server-only key. Never `NEXT_PUBLIC_`. Missing → Jev disabled. |
| `JEV_MODE` | `off` | `off` / `shadow` / `live`. Invalid values fail safe to `off`. |
| `JEV_MODEL` | `jev-latest` | Model alias from `GET /v1/models`. |
| `JEV_TIMEOUT_MS` | `6000` | Per-attempt timeout, clamped to 1000–15000. |
| `JEV_MAX_RETRIES` | `1` | Retries after the first attempt, clamped to 0–2. |
| `JEV_MIN_CONFIDENCE` | `0.55` | Choice answers below this become `unknown`. |
| `JEV_CACHE_TTL_MS` | `300000` | TTL for in-process intent cache (0 disables). |
| `JEV_CACHE_MAX_ENTRIES` | `200` | Bounded cache size. |
| `JEV_MAX_CONCURRENT` | `3` | In-flight Jev calls per instance before fail-fast. |
| `JEV_PERSONALIZATION` | `off` | `off` / `shadow`. `live` is not supported yet. |
| `JEV_PROVENANCE_TRIAGE` | `false` | Enables read-only admin triage service. |
| `SOMMELIER_GROUNDING` | `enforce` | `enforce` / `off`; `off` restores the legacy "always try to recommend" behaviour. |
| `TYPESAFE_BASE_URL` | `https://api.typesafe.ai` | HTTPS only; useful for a proxy/test double. |

Never set `NEXT_PUBLIC_TYPESAFE_API_KEY`: if it exists, the integration refuses
to use the key and logs `typesafe_key_must_not_be_public`.

## Modes

### off (default)

- No external requests, no API key required.
- Existing ranking, prompts and scores unchanged.
- Grounding still protects recommendations (disable with `SOMMELIER_GROUNDING=off`).

### shadow

- One Jev request per unique (normalized) message, cached for `JEV_CACHE_TTL_MS`.
- Results affect nothing: the deterministic intent is authoritative.
- Diagnostics log `scope=jev` (`evaluation_succeeded`, `evaluation_failed`,
  `request_saturated`) including agreement with the deterministic parser, plus
  `scope=sommelier` `shadow_recommendation_diff` with the baseline vs.
  Jev-intent recommendation slugs (public data only).
- Compare on real traffic before enabling live.

### live

- Validated Jev intent may fill gaps: colour, sweetness, occasion and a
  representative dish, but only when the deterministic parser left them open.
- Explicit exclusions and contradictions still win; Jev cannot overwrite them.
- Any failure (timeout, auth, rate limit, invalid response) falls back to the
  deterministic pipeline without user-visible errors.

Personalised re-ranking and provenance triage need their own flags and are not
activated by `JEV_MODE=live`.

## Enabling shadow mode on Vercel

1. The key is already in the Vercel project. Confirm its name is
   `TYPESAFE_API_KEY` (Project → Settings → Environment Variables). Rename if it
   is stored under another name.
2. Add the mode for Preview and Production:

   ```sh
   vercel env add JEV_MODE preview      # value: shadow
   vercel env add JEV_MODE production   # value: shadow
   ```

3. Redeploy the target environment (env changes apply on the next deployment):

   ```sh
   vercel --prod=false   # preview deployment, or use the dashboard
   ```

4. Send a few Sommelier messages and inspect:

   - Vercel logs: filter `"scope":"jev"`; successful calls log
     `evaluation_succeeded` with latency, token usage, cache status and
     `shadowAgreement`.
   - `GET /api/admin/jev` while signed in as admin: config, grounding mode and a
     process-local metrics snapshot (requests, failures, cache hit rate, p50/p95,
     tokens, shadow agreement).

5. Verify `JEV_MODE` is `shadow`, not `live`: `GET /api/admin/jev` returns
   `config.mode`.

## Activating live mode

Only after the shadow comparison shows Jev adds signal and does not contradict
the deterministic parser on clear requests:

```sh
vercel env add JEV_MODE production   # value: live
```

Redeploy, then watch `evaluation_failed`, `fallbackRate`, `cacheHitRate` and the
number of recommendations per request. Keep `SOMMELIER_GROUNDING=enforce`.

## Rollback

- **Fastest, no build:** Vercel → Deployments → previous deployment → Instant
  Rollback. The previous deployment does not have live behaviour.
- **Config only:** set `JEV_MODE=off` (and/or `SOMMELIER_GROUNDING=off`) for the
  environment and redeploy. No schema or code change is required.
- **Outage-safe by design:** timeouts, auth errors, 429s, network errors and
  invalid responses all fall back to the deterministic pipeline; there is no
  user-visible failure path.

## Evaluation harness

```sh
# deterministic only, no key needed
npm run jev:eval

# compare with Jev in shadow mode (needs TYPESAFE_API_KEY locally)
npm run jev:eval -- --jev --limit=50

# machine-readable output
npm run jev:eval -- --jev --json

# optional cost estimate (USD per 1M tokens, from your plan)
npm run jev:eval -- --jev --input-price=1 --output-price=0
```

The harness prints deterministic accuracy, Jev accuracy, disagreement rate,
failure rate, latency p50/p95 and token usage. Accuracy is only reported for
`human_approved` labels; the shipped fixture uses `deterministic_reference`
labels and is checked by a unit test, so no human labels are invented.

To grow the set to 100–200 queries, append cases to
`data/jev-eval/sommelier-intent.fixture.json`, have a human fill `expected`
fields, and mark them `human_approved`. Unreviewed cases must stay
`unreviewed`.

## Testing

```sh
npm test            # 856 unit tests in 83 files, no paid API key required
npx tsc --noEmit
npm run lint        # 0 errors (pre-existing warnings in unrelated files)
npm run build
```

Jev responses are mocked through an injected transport in tests:
valid response, invalid shape, timeout, auth failure, 429, 5xx, network error,
missing key, shadow behaviour, live fallback, saturation and secret redaction.
No CI test calls the real API.

## Privacy and security

- The key is read server-side only, sent only in the `Authorization` header and
  never logged. `describeJevConfig` exposes only `hasApiKey`.
- Only the latest user message (truncated) is sent as `state`; no conversation
  history, no e-mail, no user id.
- Logs contain a SHA-256 fingerprint prefix, message length, locale, latency,
  token counts and status codes — never the message text.
- Responses are size-capped and validated with zod; error bodies are not echoed.
- Cache keys are hashes; entries are bounded in count and TTL.

## Known limitations

1. **Admin triage UI is not wired.** The reusable read-only service
   (`lib/jev/provenance-triage.ts`) and its tests exist; the existing
   `/admin/data-quality` page already covers deterministic conflicts. Adding a
   Jev-assisted triage panel requires a new admin workflow (select wine, fetch
   candidate source, review) and was deliberately out of scope rather than
   adding a second Truth Layer.
2. **PersonalMatch is shadow-only.** No public ranking change until an
   evaluation shows improvement on labelled data.
3. **Confidence threshold is a conservative default, not a measured optimum.**
   `JEV_MIN_CONFIDENCE=0.55` and the 0.5 ± 0.15 band for yes/no answers are
   starting points; tune with the evaluation harness.
4. **No live smoke test was run.** The Vercel key is not available locally, so
   the authenticated request path is covered by mocks only. Use
   `npm run jev:eval -- --jev --limit=3` with a pulled key to verify the real
   endpoint before switching to live.
5. **Process-local metrics.** Serverless instances do not share counters; use
   the structured logs for fleet-level numbers.
