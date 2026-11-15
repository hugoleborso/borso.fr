# Invariants — pragma, `site/src/lib/queries`

The rules the terms of [the vocabulary](../../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Query read roots

- A **stale message** invalidates every query key root whose read roots,
  expanded through the **derived read roots**, include a **written root**.
  `all` invalidates every query.
- Every API root a write can announce is read by some query.

Held by: `site/src/lib/queries/query-key-roots.test.ts` › lists under each key root every API root its query module reads
Held by: `site/src/lib/queries/query-key-roots.test.ts` › reads every root the API can announce from some query, or names it as read by none

## Offline reading

- Reads the songs list and the sessions list, seeds each song's detail from
  the songs list, then reads the next session, its setlists and their entries.
- The next session is the one home shows (`selectNextSession`), so a session
  that started earlier today still counts.
- Starts only from a probe answer already in the cache, and never probes.

Held by: `site/src/lib/queries/offline-reading.queries.test.ts` › preloads a session that started earlier today, as home shows it
Held by: `site/src/lib/queries/offline-reading.queries.test.ts` › never probes the session itself, so a start with no probe answer sends nothing
