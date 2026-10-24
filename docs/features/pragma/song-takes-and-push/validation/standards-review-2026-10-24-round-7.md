# Standards review — claude/pragma-takes-and-push against origin/main

Verdict: PASS
Ledger: 3843abb31417
Reviewed: 3 file(s). Sealed: 3. Findings: 0.

Round 7 re-reviews the three files `scripts/standards/seal.ts verify` reported as edited since their last review. All three are touched by `b39ea501` only. Round 6 read them in full under the same ledger hash, so this round reads `b39ea501`'s diff and the regions it touches.

## Findings

None.

Both round-6 findings are closed:

- `apps/pragma/api/src/takes/takes.repository.ts:112` is now `export async function getWrittenTakeWithin(`. It returns `TakeView` and throws when the take is absent, which is what the verb table says a `get…` does. Its caller `takes.service.ts:17,92` and the Take section of `VOCABULARY.md:1036` use the new name.
- `apps/pragma/api/src/takes/takes.repository.ts:160` is now `async function getWrittenCommentWithin(`. It has the same shape, and its two callers at lines 183 and 198 use the new name.

`grep -rn findWritten apps/ docs/standards` returns nothing, so no reference to the old names is left.

## Sealed

- apps/pragma/api/src/takes/takes.repository.ts — both renames match the verb table. The other `find…` functions in the touched region (`findTake`, `findClaimedTakeWithin`) still return `… | null`.
- apps/pragma/api/src/takes/takes.service.ts — the import and the call site at line 92 are the only change. Nothing else in the file changed since round 6.
- apps/pragma/VOCABULARY.md — line 1036 names the renamed function. The Improvement entry's "Not to be confused with" (lines 341–342) now names the song's `structureNotes`, `gimmickNotes` and `notes` fields, which exist at `api/src/songs/songs.schema.ts:39-41`. This answers round 6's advisory note about the bolded **song note**, which had no section of its own.

## Unclear

None.

## Outside the checklist

- The question about outcome-returning `get…` service functions, raised in round 6, still applies. `b39ea501` did not touch it.

`seal.ts verify` after sealing: 115 changed file(s) carry a current seal.
