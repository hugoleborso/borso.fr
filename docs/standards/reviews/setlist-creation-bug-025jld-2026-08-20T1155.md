# Standards review — `claude/setlist-creation-bug-025jld` against `origin/main`

**Verdict: FINDINGS (1), fixed and re-sealed.**

Run after merging `origin/main` (which carried PR #64's setlist-card work and
PR #69's architecture maps) into the branch. `seal.ts verify` reported five
files unsealed — the five the merge resolution touched — and those five were
the review's scope. The other twenty-seven reviewable files in the diff already
carried a seal against the same ledger hash.

## Finding

`apps/pragma/site/src/lib/queries/setlist-entries.queries.ts` carried nine
comment lines opening *"Deliberately no `onSettled` refetch"* — the
"this intentionally omits Y" shape that
[`01. Naming`](../01-naming.md)'s reviewer bullet refuses. It was also
redundant: the file header states the same constraint positively
(*"Only the append refetches"*) and links the dantotsu that carries the depth.

Removed. The header keeps the reason; nothing else changed.

## Cleared

- `SetlistEntryDetailsFields.tsx` — fields go through `form.Field` rather than a
  `useState` chain; `CAPO_MIN`/`CAPO_MAX`/`NOTES_MAX`/`NOTES_ROWS` named rather
  than bare; i18n keys name screen and element.
- `SetlistEditor.tsx` — organism owning its queries, every mutation carrying
  `onError`, reconciliation driven by the response rather than a blind refetch,
  and no `useEffect`.
- `SetlistEntriesList.tsx` — one line changed against main, the import path.
- `SetlistEntryRow.tsx` — one line changed against main, the import path.
  `min-h-11` touch targets and `sm:` variants throughout.
- `setlist-entries.queries.ts` — `SetlistEntryPatch` derived from the Hono
  client rather than hand-written; append is the only write that refetches.

## A note on how this review ran

The first pass could not seal. The branch was checked out from under the
reviewing agent while it read, so `seal.ts record` — which hashes the file on
disk and stamps the on-disk ledger's hash — would have recorded another
branch's content under another branch's ledger. The agent refused, which is the
correct behaviour, and said so. The seals above were taken afterwards, on this
branch, with the ledger regenerated first.

That is the shared-index hazard CLAUDE.md's *Sizing a task* section names, and
it applies to a single session switching branches, not only to parallel agents.
