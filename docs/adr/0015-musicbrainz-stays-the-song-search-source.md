# ADR-0015: MusicBrainz stays the song-search source, with a shared cache and an honest failure

- **Status:** proposed
- **Date:** 2026-08-26
- **Deciders:** Hugo Borsoni
- **Tags:** audience-song-voting, pragma, data, external-dependency

## Context

Audience song voting opens `pragma` to unauthenticated visitors for the first time. A visitor may suggest a song the band does not have in its catalogue, and that suggestion is only accepted when the visitor picks a result the application found for them, so nothing arbitrary is ever displayed. The search behind that picker is therefore on the critical path of a feature that runs in bursts: the band opens a 30-second round on stage and a room of people types at the same time.

The search that exists today is `GET /api/songs/search`, which calls MusicBrainz through `apps/pragma/api/src/songs/musicbrainz.adapter.ts`. That adapter holds its cache and its last-call timestamp in module state, so a warm Lambda reuses both and a cold one starts empty, and it self-throttles to one call per second. Its stated contract is that a non-ok response yields an empty result rather than throwing. Under throttling that contract turns a 503 into "no results found", which is the failure the band would see on stage and could not diagnose.

MusicBrainz publishes a rate limit of one request per second per source IP, three hundred per second globally, and answers 503 beyond either. It documents no paid tier. It requires a meaningful `User-Agent`, which the adapter already sends. A Lambda outside a VPC egresses from AWS-managed addresses that vary per instance, so it is not established that concurrent instances share one per-IP bucket; the silent 503 is a defect regardless of which bucket is hit first.

One constraint closes a door before the trade-off starts. A suggestion that wins a round has to enter the "audience choice" setlist, and `setlist_entry.song_id` is `NOT NULL`. Aurora DSQL accepts no `ALTER COLUMN DROP NOT NULL`, so the column cannot be relaxed in place. A winning suggestion must therefore become a catalogue `song` row, and a `song` row carries `mbid`, `album`, `duration_seconds`, `isrcs` and `tags`, all of which are MusicBrainz fields.

## Decision

**Keep MusicBrainz, move its cache into the database, and let a throttled response surface as an error.** The identifier a suggestion carries has to be the identifier the catalogue already stores, because a winning suggestion becomes a catalogue song; that alone rules out a second provider whose ids do not resolve to an `mbid`. What actually breaks under burst is not the provider, it is an adapter that reports throttling as emptiness and a cache that every Lambda instance rebuilds alone. Both are ours to fix, and fixing them costs one table and one changed return type rather than a new vendor.

## Consequences

- `+` A query already typed by anyone in the room is served from the shared cache and never reaches MusicBrainz, which is the shape of the burst: a room converges on a handful of famous titles rather than fifty distinct ones.
- `+` A throttled upstream becomes a visible error on the visitor's screen and in the logs, instead of a list that is empty for a reason nobody can see.
- `+` A suggestion that wins a round promotes into a catalogue song with its `mbid` intact, so the existing MusicBrainz enrichment on `song` keeps working with no second lookup.
- `-` The cold path is still bounded by MusicBrainz's one request per second per source IP. A room typing fifty genuinely distinct titles in the same thirty seconds will queue, and the last visitor waits.
- `-` The search path now writes to DSQL, which is an optimistic-concurrency store: two Lambdas resolving the same cold query race to insert the same cache row, and the loser retries.
- `~` The cache table is per-stage like every other table, so a preview and production warm independently, and `/visual-validation` exercises a cold cache unless the run seeds it.

## Alternatives considered

### Option A — MusicBrainz with a shared cache and a surfaced failure (chosen)

- **Summary:** Keep `musicbrainz.adapter.ts` and its ranking, move the sixty-second in-memory cache into a per-stage table keyed on the normalised query, and change the non-ok branch to return a typed failure the controller maps to a status code instead of an empty list.
- **Strengths:**
  - Identifier continuity: the suggestion carries an `mbid`, which is what `song.mbid` already stores, so promotion into the catalogue needs no translation.
  - Change cost: `musicbrainz.core.ts`, `search-ranking.core.ts` and the `adapter-rate-limited-fetch` blueprint all survive untouched; only the cache's home and the failure branch move.
  - Operational surface: no new vendor, no new credential, no new manifest entry.
- **Costs:**
  - The cold path keeps MusicBrainz's one request per second per source IP as its ceiling.
  - One new table and one new write on the search path, on a store where concurrent writers to the same key conflict.
- **Rationale:** It wins because the top-weighted criterion is not "which provider has the biggest number" but whether the room's burst reaches the provider at all, and a shared cache is what decides that. It also happens to be the only option that keeps the identifier the catalogue is already built on.

### Option B — Deezer for the public search (rejected)

- **Summary:** Point the public search at Deezer's public API, which needs no key, and keep MusicBrainz for the band-side enrichment that already exists.
- **Strengths:**
  - Roughly fifty requests per five seconds, so ten times MusicBrainz's per-IP headroom, and the cold path stops being the binding constraint.
  - A commercial catalogue is closer to what a visitor types from memory than an editorial database is.
- **Costs:**
  - A Deezer id does not resolve to an `mbid`. A winning suggestion promoted into a `song` row would arrive with the MusicBrainz columns empty and no way to fill them without a second lookup against the provider this option was meant to avoid.
  - A second external system to declare in the architecture manifest, and a second adapter with its own ranking to write and cover.
- **Rejection rationale:** It loses on identifier continuity, which the `NOT NULL` on `setlist_entry.song_id` promoted from a nice-to-have to a load-bearing criterion. Shifting the weights would flip this only if suggestions never entered the catalogue, and the DSQL constraint means they must.

### Option C — Self-hosted MusicBrainz mirror (rejected)

- **Summary:** Load the published `mbdump` into a database of our own and search it locally, with no external limit at all.
- **Strengths:**
  - No rate limit, and latency under our control.
  - Same identifier space as the catalogue.
- **Costs:**
  - MusicBrainz holds 39,961,031 recordings, 5,730,341 releases, 2,968,149 artists and 2,825,244 works. Aurora DSQL modifies at most 3,000 rows per transaction, requires a separate transaction per DDL statement, and times out a connection after one hour, so the only database this repository has cannot receive the dump.
  - Hosting it elsewhere means a long-lived Postgres beside the serverless cluster, with replication to follow and monitoring to own, for a feature that runs a few minutes per concert.
  - Even loaded, it yields no search: MusicBrainz Server does not search in Postgres, so the ranking over forty million rows would be ours to write.
- **Rejection rationale:** It fails the operational-surface criterion outright and cannot be hosted on the store this repository actually has. No weighting recovers it at this scale.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Burst tolerance across one 30-second round | high | The operator named this the deciding criterion. The load is a room typing at once for thirty seconds, and a source that answers 503 makes the suggestion silently useless. |
| Identifier continuity with the catalogue | high | `setlist_entry.song_id` is `NOT NULL` and DSQL cannot relax it, so a winning suggestion becomes a `song` row, and `song` stores `mbid`, `album`, `isrcs`, `tags`. |
| Operational surface added | high | CLAUDE.md's north star reserves the operator's time for design conversations. A long-lived database to replicate and watch is a permanent chore in a one-person lab. |
| Cost of the change in this codebase | medium | `musicbrainz.adapter.ts`, `musicbrainz.core.ts` and `search-ranking.core.ts` exist, are covered, and one of them is the `adapter-rate-limited-fetch` blueprint. |
| Latency during a round | medium | The search must feel instant while a thirty-second clock is running. |

|  | A — MusicBrainz + shared cache | B — Deezer | C — Self-hosted mirror |
|---|---|---|---|
| Burst tolerance | ✓ repeats collapse into the shared cache; cold path still 1 req/s per IP | ✓ ~50 req / 5 s, no cache needed to survive | ✓ no external limit |
| Identifier continuity | ✓ `mbid`, the column `song` already stores | ✗ Deezer ids do not resolve to an `mbid` | ✓ same identifier space |
| Operational surface | ✓ no new vendor or credential | ✗ a second external system and adapter to own | ✗ a Postgres beside DSQL, plus replication and monitoring |
| Change cost | ✓ cache location and one failure branch | ✗ a second adapter, core and ranking to write and cover | ✗ ingestion, replication and a search engine to build |
| Latency in-round | ✓ cache hit is a local read | ✓ single upstream call | ✓ local, once built |

## Implementation pointers

- Spec: [`docs/features/pragma/audience-song-voting/spec/spec.md`](../features/pragma/audience-song-voting/spec/spec.md)
- Plan: `docs/features/pragma/audience-song-voting/plan/plan.md` (row "public song search")
- Commit: pending
- Files: `apps/pragma/api/src/songs/musicbrainz.adapter.ts:60`, `apps/pragma/api/src/songs/songs.controller.ts:33`, `apps/pragma/api/src/songs/songs.schema.ts`
- Related ADRs: [ADR-0012](./0012-outbound-calls-live-in-adapter-files.md), [ADR-0006](./0006-cascade-on-delete-via-json-blob-scrub.md)

## Sources

- MusicBrainz rate limiting: <https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting>
- MusicBrainz database statistics, read 2026-08-26: <https://musicbrainz.org/statistics>
- MusicBrainz database dumps: <https://musicbrainz.org/doc/MusicBrainz_Database/Download>
- Aurora DSQL PostgreSQL compatibility and transaction limits: <https://docs.aws.amazon.com/aurora-dsql/latest/userguide/working-with-postgresql-compatibility-unsupported-features.html>
