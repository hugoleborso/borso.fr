# Standards review — claude/setlist-creation-bug-025jld against origin/main

Verdict: PASS
Ledger: c9cc14decde4
Reviewed: 29 file(s). Sealed: 29. Findings: 0.

Merge base: `15824a34dd15f3be11bc9d652689c45cd9d00c0f`. Fourth pass on this branch.
Twenty-five of the twenty-nine reviewable files already carried a seal against
this ledger from the 18:40 and 19:05 passes, and their content has not moved
since. The four this pass had to clear are the four `seal.ts verify` reported
unsealed; every one of them was read in full off disk this session, as were the
files a judgement on them depends on — `setlists.schema.ts`,
`setlists.core.ts`, `setlists.queries.ts` and `VOCABULARY.md`.

All three findings of the 19:25 review are fixed, and each was re-read as fixed
rather than taken on the commit message's word.

## Findings

None.

## Sealed

- `apps/pragma/api/src/sessions/sessions.repository.ts` — the seal the 19:25 pass
  withheld, and the reason it was withheld is gone. `VOCABULARY.md:208` now reads
  "Deleting a session detaches the setlists it carried and keeps them
  (`deleteSessionWithCascade`)", which is what lines 118-122 do: the
  `session_setlist` rows and the session row, and nothing else. The delete wraps
  both tables in one `database.transaction`, opened in the repository, which is
  where [`11. Database`](../11-database.md) puts it — the `reviewer` bullet says
  "owned by the service", and the prose two paragraphs above it says the opposite
  and gives the reason (only a `*.repository.ts` may import the client). This is
  the `members.repository.ts` shape the standard prints, `selectDeletionOutcome`
  included, so the count-to-outcome mapping is not the repository projecting.
- `apps/pragma/api/src/setlists/setlists.repository.ts` — `countEntriesBySetlist`
  is gone. `listEntryOwners` (line 247) returns the rows the query produced and
  derives nothing, and the zero-filling now happens where the service assembles
  the read model. Every multi-table write is one transaction: `insertSetlist`
  (setlist plus link, lines 148-159), `deleteSetlistWithEntries` (entries, links,
  setlist, lines 200-213). `attachAtEnd`'s `max(position)` read and its insert
  share the executor they are handed, so the position cannot be chosen against a
  snapshot another writer has already moved past. `SetlistRow` derives from
  `$inferSelect` and `LineupOverride` from `z.infer`.
- `apps/pragma/api/src/setlists/setlists.service.ts` — `getAllSetlists` and
  `getSetlistsOfSession` call `tallySongsPerSetlist` themselves now, so the pure
  function runs at the layer that owns the read model. `createSetlist`'s one
  refusal is `session-not-found` and it is decided before anything is written.
  `findSetlist` returns `null` rather than throwing, which is the verb's promise.
  The JSDoc on `createSetlist` earns its place: the one-tap product reason and the
  no-foreign-key constraint are both things the body cannot say.
- `apps/pragma/site/src/lib/queries/setlists.utils.ts` — the header's scope claim
  is true now. Lines 5-8 name the two halves and say which one snapshots, and I
  checked that against `setlists.queries.ts`: all five setlist writes reconcile in
  `onSuccess` from their own response, none of them holds an `onMutate` and none
  refetches, which is the 06 bullet about DSQL's per-connection read-after-write.
  `selectSetlistsNotOnSession` is named in the header as the filter it is, and its
  verb matches what it returns — the subset a rule chose.

## Unclear

None.

## Outside the checklist

- Every service in `apps/pragma/api/src` names a collection read `get…` —
  `getSongs`, `getSessions`, `getMasteryDefaults`, and here `getAllSetlists`,
  `getSetlistsOfSession`, `getEntries` — where the verb table in
  [`01. Naming`](../01-naming.md) reserves `get…` for "the thing, and throws when
  it is absent" and gives `list…` for "an array, possibly empty". No `get…` in the
  files sealed here lies about absence, since a list is never absent, so no bullet
  is failed and no seal turns on it. But the application has answered this question
  one way and the standard another, across eighteen functions on `main` — including
  `getSongById` and `getSessionById`, which return `null`. That is the shape
  `convention-drift.md` exists to surface, and it is a decision for the standard or
  the application's vocabulary rather than for this branch.
- `deleteSessionWithCascade` needs its module header to say which tables the
  cascade reaches, because the name does not. A name like
  `deleteSessionAndDetachSetlists` would carry it without the sentence. The header
  as written also gives the domain reason the setlists survive, which no name
  could, so it is not a comment that only restates — advisory, and it changed
  nothing here.
