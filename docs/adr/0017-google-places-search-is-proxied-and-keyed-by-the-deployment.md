# ADR-0017: The Google Places search is proxied through the API, keyed by the deployment

- **Status:** proposed
- **Date:** 2026-09-15
- **Deciders:** Hugo Borsoni
- **Tags:** bar-owner, bars, backend, deps

## Context

Adding a bar means typing its name, its city and its phone number off whatever the
member found on their phone. The band already looks these venues up on Google Maps, so
the record they are copying exists; only the copying is manual.

Google's Places API (New) answers a text search with exactly the fields a bar row
carries: a display name, a formatted address, address components a city is read out of,
and a national phone number. It needs an API key, it bills per request, and a key that
reaches the browser is a key anyone can spend.

Two things had to be decided: where the call is made from, and where the key lives.

## Decision

The search is a route on this application's own API, `GET /api/bars/search`, behind the
same member session as every other bars route. One adapter file,
`bar-search.adapter.ts`, makes the outbound call, per ADR-0012. The browser never sees
the key and never talks to Google.

The key is read from the API Lambda's `GOOGLE_PLACES_API_KEY` environment variable, which
the CDK stack sets at synth time from the deploy environment's variable of the same name,
and omits entirely when that variable is unset. A deployment with no key answers a named
`not-configured` outcome, which the route turns into a 503 and the page turns into one
sentence saying the search is not configured. Nothing throws, and a preview stack without
a key runs every other bars feature normally.

## Consequences

- `+` The key is never in the bundle, never in git, and never in a request the browser makes.
- `+` A preview or a fresh clone runs the bars page with the search visibly disabled rather
  than broken, so the feature needs no key to develop against.
- `+` The vendor's response shape is confined to one `.core.ts` parser, so a field mask
  change is a test failure in one file.
- `-` The key is a plain Lambda environment variable, so it appears in the deployed
  CloudFormation template and in the function's configuration, readable by anyone with
  console access to the account. It is not encrypted at rest beyond Lambda's own
  environment encryption.
- `-` Every search is billed, and nothing here caps spend. The restriction that matters is
  set on the key itself in the Google console: Places API only, and a quota.
- `~` The search is debounced at 600 ms in the page rather than rate-limited on the server,
  so a member holding a key down costs requests. MusicBrainz needed a server-side
  rate limiter because its terms demand one; Google's does not, it just charges.

## Alternatives considered

### Option A — API-proxied search, key in the Lambda environment (chosen)

- **Summary:** The browser calls this application, this application calls Google.
- **Strengths:** One place holds the key, the session gate already applies, and the
  vendor shape stops at the adapter.
- **Costs:** The key sits in the function's configuration in plaintext; a deploy is needed
  to rotate it.
- **Rationale:** wins on key exposure, which carries the highest weight, at a cost that a
  key restricted in the Google console absorbs.

### Option B — The browser calls Places directly with a referrer-restricted key (rejected)

- **Summary:** Ship the key to the site, restrict it to the application's origins.
- **Strengths:** No route to write, no Lambda hop, and the search stays fast.
- **Costs:** The key is in the bundle. HTTP referrer restrictions are a browser-supplied
  header, so they deter casual reuse and stop nothing else. Spend is then bounded only by
  the quota.
- **Rejection rationale:** loses on key exposure. A key anyone can extract from a bundle is
  a key whose only defence is a quota.

### Option C — A Secrets Manager secret the Lambda reads at runtime (rejected for now)

- **Summary:** Keep the key in Secrets Manager, pass the ARN, fetch and cache it in the
  adapter.
- **Strengths:** No plaintext in the template, rotation without a deploy, and an audit trail
  on every read.
- **Costs:** A new runtime dependency on `@aws-sdk/client-secrets-manager`, a per-secret
  monthly charge, a cold-start fetch on the path of a search, and the stack's own test
  asserting this application creates no Secrets Manager secret would need rewording.
- **Rejection rationale:** loses on cost for what it buys here. The threat it closes is
  console access to the account, which for a one-person lab is the same person who holds
  the key. Worth revisiting the day a second person has console access.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Key exposure | high | A leaked key is billed to this account until it is noticed and rotated. |
| Works with no key | high | Previews and fresh clones must run the bars page without a secret. |
| Operational cost | medium | A one-person lab pays for every moving part it adds, in money and in attention. |
| Rotation effort | low | The key changes rarely, and a deploy is already one command. |

|  | Option A | Option B | Option C |
|---|---|---|---|
| Key exposure | ~ plaintext in the account | ✗ in every bundle | ✓ encrypted, audited |
| Works with no key | ✓ named not-configured outcome | ✗ the site ships a broken widget | ✓ same |
| Operational cost | ✓ one variable | ✓ none | ✗ a dependency, a charge, a cold-start fetch |
| Rotation effort | ~ needs a deploy | ~ needs a deploy | ✓ no deploy |

## Implementation pointers

- Spec: [`docs/features/pragma/bar-owner/spec/spec.md`](../features/pragma/bar-owner/spec/spec.md)
- Plan: [`docs/features/pragma/bar-owner/plan/plan.md`](../features/pragma/bar-owner/plan/plan.md)
- Commit: pending
- Files: `apps/pragma/api/src/bars/bar-search.adapter.ts`,
  `apps/pragma/api/src/bars/bar-search.core.ts`,
  `apps/pragma/cdk/lib/stack.ts`,
  `apps/pragma/site/src/components/organisms/BarPlaceSearch.tsx`
- Related ADRs: follows ADR-0012 for the adapter boundary.
