# ADR-0017: Nominatim answers the bar search, proxied through the API

- **Status:** proposed
- **Date:** 2026-09-15
- **Deciders:** Hugo Borsoni
- **Tags:** bar-owner, bars, backend, deps

## Context

Adding a bar means retyping what the member is already reading on a map: the name, the
city, the phone number. Any place-search service closes that gap; the question is which
one, and what it costs to keep it running.

Google's Places API was the first answer, and it is a good one on data quality. It is also
gated on a Cloud billing account. Since March 2025 Google gives free calls per SKU per
month rather than a credit — 10 000 for Essentials, 5 000 for Pro, 1 000 for Enterprise —
and the SKU is decided by the fields the request asks for, so asking for a phone number
moves a search into the 1 000-call tier. None of that matters if the account cannot exist:
this repository's owner does not want a billing account attached to the project, and a
service that refuses to start without one is not a free tier, it is a trial.

OpenStreetMap's Nominatim needs no key and no account. Its
[usage policy](https://operations.osmfoundation.org/policies/nominatim/) is the price
instead: an absolute maximum of one request per second, a User-Agent that identifies the
application, results cached on the caller's side, and visible attribution.

## Decision

The search calls Nominatim, from this application's own API at `GET /api/bars/search`,
behind the same member session as every other bars route. One adapter file,
`bar-search.adapter.ts`, makes the outbound call, per ADR-0012.

Every clause of the usage policy is carried in code rather than in a comment: the adapter
spaces calls at one per second through the same module-held timestamp the MusicBrainz
adapter uses, caches each answer for an hour, and sends a User-Agent naming the
application and its address. The search card renders the attribution as a link to the
OpenStreetMap copyright page.

## Consequences

- `+` No key, no billing account, no secret to store, rotate or leak. The feature works in
  every preview and on a fresh clone with nothing to configure.
- `+` The one-per-second spacing and the cache live on the server, where they hold across
  members, rather than in a debounce the browser could skip.
- `-` The data is thinner than Google's. A bar's phone number is present only where a
  contributor tagged it, and coverage is better in cities than in villages. The member
  types what is missing, which is what they did before this feature existed.
- `-` The service is run by the OpenStreetMap Foundation for openstreetmap.org, and outside
  use is tolerated on spare capacity. A slow or refused answer is a normal outcome, not an
  incident, and the page says the search did not answer rather than breaking.
- `~` Attribution is now a requirement rather than a courtesy: removing that line from the
  search card breaches the policy. Nothing in this repository can check that, so it is
  written here.

## Alternatives considered

### Option A — Nominatim, proxied and rate-limited in the adapter (chosen)

- **Summary:** OpenStreetMap's own search, through our API.
- **Strengths:** No account of any kind. The rate limit and cache the policy demands are
  code, and the shape already exists in this repository for MusicBrainz.
- **Costs:** Thinner data, a best-effort service, and an attribution line that must stay.
- **Rationale:** wins on the criterion that turned out to dominate — works without a
  billing account — at a data cost the member absorbs by typing one field.

### Option B — Google Places API (rejected)

- **Summary:** Text Search (New), keyed by the deployment.
- **Strengths:** The best data of the three, with phone numbers present almost everywhere,
  and a generous free allowance once the account exists.
- **Costs:** A Cloud billing account with a payment method, which the owner does not want.
  A key to store, restrict and rotate, in plaintext in the function's configuration. Spend
  bounded only by a quota set in a console this repository cannot see.
- **Rejection rationale:** loses on the account requirement, which no amount of data
  quality offsets here.

### Option C — Foursquare, Mapbox Search Box, or another commercial place API (rejected)

- **Summary:** Swap one vendor for another with a friendlier free tier.
- **Strengths:** Likely better data than OpenStreetMap, possibly without a payment method.
- **Costs:** Still a key, still an account, still a vendor whose terms can change under a
  project nobody is watching daily.
- **Rejection rationale:** loses on the same criterion as Option B for anything needing a
  card, and on simplicity otherwise. Worth revisiting only if Nominatim's data proves too
  thin in practice.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Works without a billing account | high | The owner's stated constraint; a service needing a card is unusable here whatever else it offers. |
| Nothing to configure per deployment | high | Previews and fresh clones must run the feature with no secret and no setup. |
| Data quality | medium | A missing phone number costs one typed field; a missing bar costs the whole feature. |
| Terms the repository can honour in code | medium | A rate limit and a cache are code; a clause nobody implements is a breach waiting. |

|  | Option A | Option B | Option C |
|---|---|---|---|
| Works without a billing account | ✓ no account at all | ✗ card required | ~ varies by vendor |
| Nothing to configure per deployment | ✓ nothing | ✗ a key per stage | ✗ a key per stage |
| Data quality | ~ thinner, city-biased | ✓ best | ✓ good |
| Terms the repository can honour in code | ✓ rate limit, cache, agent, attribution | ✓ a key restriction, set elsewhere | ~ unread |

## Implementation pointers

- Spec: [`docs/features/pragma/bar-owner/spec/spec.md`](../features/pragma/bar-owner/spec/spec.md)
- Plan: [`docs/features/pragma/bar-owner/plan/plan.md`](../features/pragma/bar-owner/plan/plan.md)
- Commit: pending
- Files: `apps/pragma/api/src/bars/bar-search.adapter.ts`,
  `apps/pragma/api/src/bars/bar-search.core.ts`,
  `apps/pragma/site/src/components/organisms/BarPlaceSearch.tsx`
- Related ADRs: follows ADR-0012 for the adapter boundary.
