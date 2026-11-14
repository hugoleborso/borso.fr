# A member's own write keeps another member's change visible

## Goal

In pragma, a member's own write never hides a change another member made first.

## Problem

A mutation writes the cache with `setQueryData`. TanStack Query records that as
a successful fetch. It clears the `isInvalidated` flag a live-invalidation stale
message set, and it stamps a fresh `dataUpdatedAt`. The persisted query cache
then keeps the old data marked fresh, across a reload too.

Example. Marc changes a song while Hugo edits a setlist. After Hugo's write,
Hugo's screen can keep showing the song as it was before Marc's change.

Found by row 12 of
`docs/features/pragma/composition-inspirations/validation/visual-validation-2026-11-14-0026.md`
on PR #327, which fixed compositions, inspirations and sketches only.

## Behaviour

1. Every cache write a pragma mutation makes, in `onMutate`, `onSuccess` and
   the `onError` rollback, keeps an entry stale when a stale message had made
   it stale. The written data still shows at once.
2. Keeping an entry stale never sends a request by itself. The next mount or
   focus refetches it, as for any stale entry.
3. A write to a key no stale message can have reached yet may stay a plain
   `setQueryData`, with an inline disable naming why the key is new.
4. A lint rule refuses a direct `setQueryData` or `setQueriesData` under
   `apps/pragma/site/src` outside `lib/queries/cache-write.queries.ts` and test
   files.

## Acceptance

- A hook test invalidates the songs with the filters live invalidation builds,
  runs this member's song update, and finds the list and the detail still
  invalidated with the update applied. It fails on `main`.
- With two browser sessions (hugo and marc), Marc's change to a song or a
  setlist shows on Hugo's screen after Hugo's own write and a reload.

## Out of scope

The other apps. `refreshReadsDerivedFrom` from PR #327, which serves a member
write and lands with that PR.
