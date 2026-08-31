# ADR-0015: Deezer answers the search, MusicBrainz resolves the pick

- **Status:** proposed
- **Date:** 2026-08-26
- **Deciders:** Hugo Borsoni
- **Tags:** audience-song-voting, pragma, data, external-dependency

> The file name predates the amendment below and no longer states the decision.
> It is kept because `docs/**/validation/**` is append-only: a dated report from
> 26 August links to this path, and correcting that link would edit a record of
> what a validator saw on a day that has passed. The title above is authoritative.

## Context

Audience song voting opens `pragma` to unauthenticated visitors for the first time. A visitor may suggest a song the band does not have, and that suggestion is only accepted when the visitor picks a result the application found for them, so nothing arbitrary is ever displayed. The search behind that picker is therefore on the critical path of a feature that runs in bursts: the band opens a thirty-second round on stage and a room of people types at the same time.

Two moments have to be told apart, and the first draft of this record failed to. **Search** runs on every keystroke, for everyone in the room, inside a thirty-second window. **Resolution** runs once, on the one result a visitor picked, and only when a suggestion is accepted. They have completely different load shapes, and nothing forces one provider to serve both.

The search that exists today calls MusicBrainz through `apps/pragma/api/src/songs/musicbrainz.adapter.ts`. That adapter holds its cache and its last-call timestamp in module state, so a warm Lambda reuses both and a cold one starts empty, and it self-throttles to one call per second. Its stated contract is that a non-ok response yields an empty result rather than throwing — so under throttling it reports "no results found", which is the failure the band would see on stage and could not diagnose.

MusicBrainz publishes a rate limit of one request per second per source IP, three hundred per second globally, and answers 503 beyond either. It documents no paid tier. Deezer's public API needs no key; its own developer FAQ confirms a query quota exists but does not publish the figure, and the commonly cited number, roughly fifty requests per five seconds, comes from community sources rather than from Deezer.

What MusicBrainz data actually buys this application was measured rather than assumed. `mbid`, `album`, `duration_seconds`, `isrcs` and `tags` are rendered read-only by `SongMusicBrainzPanel.tsx` and nothing computes on them. Exactly one behaviour reads the `mbid`: the audience-suggestion dedupe in `audience.service.ts`, which this same change introduced.

## Decision

**Deezer answers the search; MusicBrainz resolves the picked result, through its ISRC.** Every keystroke goes to the provider with the larger quota and no key, and the one call per accepted suggestion goes to the provider whose identifier the catalogue already stores. The two providers never compete, because they serve two different moments, and the ISRC is what joins them: Deezer returns one on every track, and MusicBrainz resolves an ISRC to a recording by exact match rather than by search.

## Consequences

- `+` The hot path leaves the tightest documented limit in the picture. MusicBrainz's one request per second per source IP no longer bounds a room typing at once, because a room typing does not reach MusicBrainz at all.
- `+` A suggestion still carries an `mbid` when it enters the catalogue, so the dedupe and the metadata panel keep working unchanged.
- `+` Resolving through the ISRC cannot pick the wrong version. A cover, a live take and a remaster each carry their own ISRC, which a title-and-artist search would have had to guess between.
- `+` A query already typed by anyone in the room is served from the shared cache and never leaves the building, which is the shape of the burst: a room converges on a handful of famous titles.
- `-` A second external system to declare in the architecture manifest, with its own adapter and its own ranking to write and cover.
- `-` Resolution can fail, in two ways rather than one: Deezer may return no ISRC for a track, or MusicBrainz may know no recording for the ISRC it returned. Either way the song enters the catalogue with a null `mbid` and the dedupe falls back to normalised title and artist, so two spellings can produce two rows. Exact-match resolution makes this rarer than a title search would, and it never makes it wrong.
- `-` Deezer's quota is not published by Deezer. We are building on a community figure, and only its order of magnitude is load-bearing.
- `~` The search path writes to DSQL, which resolves conflicts at commit under optimistic concurrency: two Lambdas resolving the same cold query race to insert the same cache row and the loser retries. The cache table is per-stage, so a preview and production warm independently.

## Alternatives considered

### Option A — Deezer searches, MusicBrainz resolves (chosen)

- **Summary:** The public search calls Deezer, which needs no key and returns an ISRC on every track. When a visitor picks a result, one MusicBrainz ISRC lookup resolves it to an `mbid` and the accompanying metadata, and the song enters the catalogue with both. The shared cache sits in front of the search, as it would for any provider. Deezer returns several track ids for one recording — a first release and its reissues share an ISRC — so the results are collapsed on the ISRC before the room ever sees them, or the same song would appear twice and split its own vote.
- **Strengths:**
  - Burst tolerance: the per-keystroke path uses the larger quota, and the one-per-second limit applies only to a call that happens once per accepted suggestion.
  - Identifier continuity is satisfied anyway, because resolution is deferred rather than skipped.
  - A commercial catalogue is closer to what a visitor types from memory than an editorial database is.
- **Costs:**
  - A second external dependency, its adapter, its ranking and their tests.
  - A resolution step that can fail, and a dedupe that has to degrade rather than refuse.
- **Rationale:** It wins the top-weighted criterion outright and loses none of the others, once resolution is recognised as a separate moment from search.

### Option B — MusicBrainz for both, with a shared cache and a surfaced failure (rejected)

- **Summary:** Keep `musicbrainz.adapter.ts` for search as well as resolution, move its cache into a per-stage table, and make a non-ok response return a typed failure instead of an empty list.
- **Strengths:**
  - One vendor, no new manifest entry, no second adapter.
  - The existing ranking and its `adapter-rate-limited-fetch` blueprint survive untouched.
- **Costs:**
  - The cold search path stays bounded by one request per second per source IP, which is the exact window the feature runs in.
  - Cache warmth is the only thing standing between a room and a throttle, so the first person to type an unusual title queues behind everyone else.
- **Rejection rationale:** This was the first draft's choice, and it lost on re-examination. See the revision below: the criterion that carried it does not survive contact with deferred resolution.

### Option C — Self-hosted MusicBrainz mirror (rejected)

- **Summary:** Load the published `mbdump` into a database of our own and search it locally, with no external limit at all.
- **Strengths:**
  - No rate limit, latency under our control, same identifier space.
- **Costs:**
  - MusicBrainz holds 39,961,031 recordings, 5,730,341 releases, 2,968,149 artists and 2,825,244 works. Aurora DSQL modifies at most 3,000 rows per transaction, requires a separate transaction per DDL statement, and times out a connection after one hour, so the only database this repository has cannot receive the dump.
  - Hosting it elsewhere means a long-lived Postgres beside the serverless cluster, with replication to follow and monitoring to own, for a feature that runs a few minutes per concert.
  - Even loaded, it yields no search: MusicBrainz Server does not search in Postgres, so the ranking over forty million rows would be ours to write.
- **Rejection rationale:** It fails the operational-surface criterion outright and cannot be hosted on the store this repository actually has. No weighting recovers it at this scale.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Burst tolerance across one 30-second round | high | The operator named this the deciding criterion. The load is a room typing at once for thirty seconds, and a source that answers 503 makes the suggestion silently useless. |
| Operational surface added | high | CLAUDE.md's north star reserves the operator's time for design conversations. A long-lived database to replicate and watch is a permanent chore in a one-person lab. |
| Identifier continuity with the catalogue | low | Deferred resolution satisfies it under every option, so it no longer separates them. The first draft weighted this high and was wrong to; see the revision. |
| Cost of the change in this codebase | medium | `musicbrainz.adapter.ts`, `musicbrainz.core.ts` and `search-ranking.core.ts` exist and are covered, and one of them is the `adapter-rate-limited-fetch` blueprint. |
| Latency during a round | medium | The search must feel instant while a thirty-second clock is running. |

|  | A — Deezer + MusicBrainz resolve | B — MusicBrainz for both | C — Self-hosted mirror |
|---|---|---|---|
| Burst tolerance | ✓ the per-keystroke path uses the larger quota | ✗ cold path bounded at 1 req/s per IP, inside the exact window | ✓ no external limit |
| Operational surface | ✓ one more keyless API, no infrastructure | ✓ no new vendor at all | ✗ a Postgres beside DSQL, plus replication and monitoring |
| Identifier continuity | ✓ resolved on the pick | ✓ native | ✓ native |
| Change cost | ✗ a second adapter, core and ranking to write and cover | ✓ cache location and one failure branch | ✗ ingestion, replication and a search engine to build |
| Latency in-round | ✓ cache hit is a local read | ✓ cache hit is a local read | ✓ local, once built |

## Implementation pointers

- Spec: [`docs/features/pragma/audience-song-voting/spec/spec.md`](../features/pragma/audience-song-voting/spec/spec.md)
- Plan: `docs/features/pragma/audience-song-voting/plan/plan.md` (row "public song search")
- Commit: pending
- Files: `apps/pragma/api/src/songs/musicbrainz.adapter.ts`, `apps/pragma/api/src/audience/audience.service.ts`, `apps/pragma/api/src/songs/songs.controller.ts`
- Related ADRs: [ADR-0012](./0012-outbound-calls-live-in-adapter-files.md), [ADR-0006](./0006-cascade-on-delete-via-json-blob-scrub.md)

## Revisions

### Revision 2026-08-31 — the join is the ISRC, not the title

What changed: how resolution works, not which provider does what.

The 27 August revision said the picked result would be resolved to an `mbid`
by searching MusicBrainz on title and artist. Probing the two APIs before
writing the adapter showed a better join: Deezer returns an `isrc` on every
track, and MusicBrainz resolves an ISRC to a recording by exact match through
`/ws/2/isrc/`. A fuzzy search that had to tell a cover from a live take from a
remaster becomes a lookup that cannot pick the wrong one.

The same probe surfaced a defect the title-based design would have hidden: one
query returned two Deezer track ids carrying the same ISRC, because a reissue is
a separate track there. Left alone, the room would see one song twice and split
its own vote between the two rows.

Implication for the original decision: unchanged in substance, sharper in
mechanism.

### Revision 2026-08-27 — the deciding criterion was self-justified

What changed: the chosen option. The first draft picked Option B, MusicBrainz for both moments, and this record now picks Option A.

Why: the draft weighted *identifier continuity* **high** and rejected Deezer on it, reasoning that a Deezer id does not resolve to an `mbid`. Two things were wrong with that. First, the only behaviour in this application that reads an `mbid` is the audience-suggestion dedupe, which the very same change introduced — the criterion was carried by a rule written to justify it, and everything else MusicBrainz supplies is rendered read-only and computed on nowhere. Second, and decisive, the argument assumed search and resolution had to share a provider. They do not: resolving the `mbid` once, on the result the visitor picked, keeps continuity intact while taking the per-keystroke path off the tightest documented limit in the picture.

The operator raised both points. The record is amended in place rather than superseded because it never reached `main` and was never accepted, so there is no ratified decision to supersede.

Implication for the original decision: replaced. The rubric above carries the corrected weights.

## Sources

- MusicBrainz rate limiting: <https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting>
- MusicBrainz database statistics, read 2026-08-26: <https://musicbrainz.org/statistics>
- Deezer developer FAQ, read 2026-08-27 — confirms a query quota exists, does not publish the figure: <https://support.deezer.com/hc/en-gb/articles/360011538897-Deezer-FAQs-For-Developers>
- Aurora DSQL PostgreSQL compatibility and transaction limits: <https://docs.aws.amazon.com/aurora-dsql/latest/userguide/working-with-postgresql-compatibility-unsupported-features.html>
