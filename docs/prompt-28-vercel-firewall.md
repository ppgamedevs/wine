# Prompt 28 Vercel Firewall runbook

The repository now contains BotID checks and programmatic calls to Vercel Firewall rate limits. Firewall rules are infrastructure configuration and are intentionally not created by application code.

Configure the following rules in the Vercel project before production release. Use the exact SDK rate limit ID shown below.

## Programmatic rate limits

| SDK rate limit ID | Limit | Window | Scope |
| --- | ---: | ---: | --- |
| `vinintel-search-suggest` | 60 | 60 seconds | IP |
| `vinintel-sommelier-chat` | 30 | 1 hour | IP |
| `vinintel-analyze-wine` | 3 | 1 hour | IP |
| `vinintel-wine-vote` | 20 | 60 seconds | IP |
| `vinintel-wine-report` | 5 | 1 hour | IP |
| `vinintel-winery-analytics` | 120 | 60 seconds | IP |
| `vinintel-premium-checkout` | 5 | 15 minutes | IP |
| `vinintel-premium-email-cron` | 2 | 1 hour | Fixed job key |

Create one Vercel Firewall rate limit rule for each ID. The application uses the Vercel client IP by default. Keep the limits synchronized with `lib/security/route-policy.ts` and `lib/security/anti-scrape-audit.ts`.

## Edge rules

Add explicit path rules for these high extraction surfaces:

1. `/sitemap.xml`: allow verified search crawlers, then rate limit other clients to 20 requests per minute per IP.
2. `/vinuri`, `/vinuri/*`, `/en/wines`, and `/en/wines/*`: allow verified search crawlers, then rate limit other clients to 120 requests per 10 minutes per IP.
3. `/crame`, `/crame/*`, `/en/wineries`, and `/en/wineries/*`: allow verified search crawlers, then rate limit other clients to 120 requests per 10 minutes per IP.
4. `/api/*`: keep verified webhook and cron traffic out of generic interactive challenges. Route-specific application guards remain authoritative.

For the catalog and sitemap rules, the verified crawler allow rule must run before the rate limit rule. Do not use user-agent strings as the trust signal. Use Vercel verified bot classification.

## BotID

BotID client initialization lives in `instrumentation-client.ts`. Server checks are required on interactive and expensive routes. In local development, `BOTID_DEV_BYPASS` supports deterministic fixtures. Vercel deployments ignore that bypass.

## Release verification

1. Run `npm run security:audit`.
2. Confirm all eight SDK IDs exist in the Vercel project.
3. Confirm a normal browser can search, vote, report, start checkout, and use the sommelier.
4. Confirm an unverified automated request receives `403` on protected interactive routes.
5. Confirm a request over budget receives `429` with `Retry-After`.
6. Confirm Googlebot and Bingbot can fetch canonical HTML and the sitemap.
7. Confirm training crawlers listed in `app/robots.ts` receive a `Disallow: /` policy.
