---
status: done
summary: |
  Round 17b — all four entry-level setlist mutations now run optimistically.

  Migrated (per-mutation commit):
  - `useUpdateSetlistEntry` — patch-merge into the matching cached entry.
  - `useDeleteSetlistEntry` — filter the entry out of the cache.
  - `useReorderSetlist` — reorder the cached array by `entryIds`, rewriting `position`.
  - `useAppendSetlistEntry` — append a placeholder entry seeded with a caller-minted `optimisticId`
    (the editor passes `crypto.randomUUID()`); `onSettled` invalidates so the real server-issued id replaces it.

  Each mutation follows: `cancelQueries` → typed `getQueryData<EntriesCache>` snapshot →
  `setQueryData<EntriesCache>` with the pure transform → return `{ previous }` → `onError`
  rollback → `onSettled` invalidate.

  Pure transforms live in `setlists.utils.ts`; 9 sibling unit tests at 100% branch/statement
  coverage cover patch / remove / reorder (including missing-id and sparse-list edge cases)
  / append (default + explicit optional fields).

  Cache-key typing: helpers are generic over `MinimalSetlistEntry`; the queries file pins
  the concrete shape via `setQueryData<EntriesCache>` and `getQueryData<EntriesCache>` —
  no `as Foo`, no `as unknown as Foo`, no banned assertions. Hono `hc` types still drive
  mutation variables.

  Pre-push gates green: pragma `typecheck`, `biome lint` (222 files), `test:core` (35
  files / 333 tests), repo-wide `knip` (configuration hints only).

  Renderhook-level mutation tests were NOT added: the pure-transform suite owns the
  branching logic at 100%, the mutation wiring is a thin type-checked translation, and
  adding `@testing-library/react` for a single hook smoke test felt like overkill — the
  existing `file-drop.test.tsx` pattern (manual `createRoot` + `act`) is awkward to
  apply to mutation lifecycles. Flagged for visual-validation to confirm the UX claim
  (no flash on slider / drag / typing / delete / add) against a running app.

  Final SHA: 0f48635 (post-rebase onto remote tip 25a5f80, which carried another agent's
  sessions create + delete work). 5 feature commits + 1 verdict commit.
artifacts:
  - apps/pragma/site/src/lib/queries/setlists.ts
  - apps/pragma/site/src/lib/queries/setlists.utils.ts
  - apps/pragma/site/src/lib/queries/setlists.utils.test.ts
  - apps/pragma/site/src/routes/setlists/SetlistEditor.tsx
partialDeferrals: []
next:
  kind: validate
---
