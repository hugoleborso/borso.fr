# ADR-0043: One catalogue song per Deezer track, held by a unique index on song.deezer_track_id

- **Status:** proposed
- **Date:** 2026-10-24
- **Deciders:** Hugo Borsoni
- **Tags:** song-takes-and-push, data

## Context

The standards review of the takes branch (finding #16, [report](../features/pragma/song-takes-and-push/validation/standards-review-2026-10-24.md)) found that "one catalogue song per Deezer track" is decided from a read in `songs.service.ts`. When two audience members suggest the same unknown track at the same moment, both requests read "absent" and both import a song. The rule is keyed on an identifier an outside service assigns, which makes the fix an ADR trigger.

DSQL builds every non-primary index asynchronously (`CREATE UNIQUE INDEX ASYNC`, [knowledge entry §11](../knowledge/dsql-postgres-compat-gaps.md)). pragma's migration runner submits the statement and does not wait for the job in `sys.jobs`. A build that fails, for example on rows that already break the rule, leaves no error in the deploy, and the index does not enforce anything.

## Decision

**A unique index on `song.deezer_track_id`**, added by a new migration. The import catches the unique violation and returns the song that won the race. Before merging, the operator counts duplicate track ids in prod and merges any by hand. After deploying, the operator confirms in `sys.jobs` that the build completed.

## Consequences

- `+` The rule lives in the schema, where the table itself states it, and needs no second table.
- `+` Every write path is covered, including any future one.
- `-` The guarantee depends on a build nobody waits for. A failed build is silent, so it is only as good as the two operator checks.
- `-` Rows that already break the rule in prod block the build until a person merges them, and merging songs means moving their setlist entries, takes and mastery by hand.
- `~` The index is not enforced during its build, so a race in that window can still import twice.

## Alternatives considered

### Option A — Unique index on `song.deezer_track_id` (chosen)

- **Summary:** as in *Decision*.
- **Strengths:** the rule is declared on the table that holds it.
- **Costs:** two operator checks, and possible manual merges.
- **Rationale:** the operator chose it on 2026-10-24, preferring the rule on the song table over a table that exists only to enforce it.

### Option B — Claim table `song_track_claim (deezer_track_id PRIMARY KEY, song_id)` (rejected)

- **Summary:** a table written in the same transaction as the import, whose primary key enforces the rule synchronously.
- **Strengths:** a primary key is enforced from the first insert, with no asynchronous build and no prod cleanup.
- **Costs:** a second table to keep consistent with `song` on update and delete.
- **Rejection rationale:** it loses on where the rule lives. It would win if the operator checks proved unworkable.

### Option C — Leave the race (rejected)

- **Summary:** keep the read-then-insert.
- **Rejection rationale:** CLAUDE.md does not let a known defect stay because it predates the branch.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Rule declared where the data lives | high | The operator's stated preference. |
| Enforced from the first write | medium | DSQL's asynchronous build leaves a window and a silent failure mode. |
| Operator steps | medium | Every manual step is one that can be forgotten. |

|   | A: unique index | B: claim table | C: leave it |
|---|---|---|---|
| Rule on the table | ✓ on `song` | ✗ on a side table | ✗ none |
| Enforced from the first write | ✗ after the build | ✓ primary key | ✗ never |
| Operator steps | ✗ two checks | ✓ none | ✓ none |

## Implementation pointers

- Spec: [`docs/features/pragma/song-takes-and-push/spec/spec.md`](../features/pragma/song-takes-and-push/spec/spec.md)
- Review: [`standards-review-2026-10-24.md`](../features/pragma/song-takes-and-push/validation/standards-review-2026-10-24.md), finding #16
- Commit: stamped by `/after-task-kaizen` on merge
- Files: `apps/pragma/api/src/songs/songs.schema.ts`, `apps/pragma/api/src/songs/songs.service.ts`, `apps/pragma/api/src/database/migrations/`
- Related ADRs: ADR-0006 (no foreign keys on DSQL)
