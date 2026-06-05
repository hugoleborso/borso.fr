---
status: done
summary: |
  Wired optimistic updates on every cache-touching mutation outside the
  17a/17b scope (sessions.ts + setlists.ts).

  - songs.ts: useCreateSong (prepend temp id), useUpdateSong (patch list
    + byId via mergeSongUpdate handling links comment-default), useDeleteSong
    (filter out + restore). NEW_SONG_DEFAULTS named const captures the
    fields the create input omits.
  - bars.ts: useCreateBar (insert sorted by name), useUpdateBar (patch by id;
    kanban status change applies instantly), useDeleteBar.
  - instruments.ts: full CRUD, list insert/patch/filter on instrumentKeys.list().
  - members.ts: full CRUD on memberKeys.list(); useAssignMemberInstruments
    rebuilds the per-member roster by looking up full instrument rows from
    the instruments.list cache (returns null entries skipped via flatMap).
  - mastery.ts: useSaveMasteryDefault upserts a default cell via the
    upsertDefault helper (same memberId+instrumentId replaces in place,
    otherwise appended); useDeleteMasteryDefault filters by composite key.
  - transitions.ts: useSaveTransitionComment replaces the byPair cache with
    the new comment including updatedAt: new Date().toISOString(); rollback
    restores the previous value (null or the prior comment object).

  Explicit skips, documented in each file's intent: auth.ts (login mutation
  doesn't touch a list cache - caller redirects on success), uploads.ts
  (presigned URL responses are one-shot, not cached).

  Cache typing strategy: every list/byId snapshot uses the BE-derived
  response type via `InferResponseType<typeof api.api.X.$get>`, so the
  optimistic shape stays locked to the controller's JSON contract; the
  setQueryData updater narrows undefined via `if (old === undefined)
  return old;` and never reaches for `as any`. Links comment field
  defaulted to '' inside normaliseLinks; transition-comment updatedAt
  defaulted to ISO timestamp inside the optimistic insert. URLs in the
  test fetch stub are resolved against http://localhost.test before
  passing to the Request constructor (jsdom rejects relative URLs).

  Tests: 5 new files, 21 mutation tests; each file covers the
  apply-before-resolve path AND the rollback-on-500 path for every
  cache-touching mutation. Shared scaffolding in test-helpers.tsx
  (createIsolatedQueryClient, mountWithClient with QueryClientProvider,
  stubFetch with absolute-URL resolution, deferred, flushMicrotasks).
  test:core: 364 / 364 passing, biome lint clean, typecheck clean,
  build OK. Pushed to claude/pragma-erp-specification-k41Mg after
  rebasing onto 17a + 17b. Final SHA: 30bf8a3. 9 commits.
artifacts:
  - apps/pragma/site/src/lib/queries/songs.ts
  - apps/pragma/site/src/lib/queries/bars.ts
  - apps/pragma/site/src/lib/queries/instruments.ts
  - apps/pragma/site/src/lib/queries/members.ts
  - apps/pragma/site/src/lib/queries/mastery.ts
  - apps/pragma/site/src/lib/queries/transitions.ts
  - apps/pragma/site/src/lib/queries/test-helpers.tsx
  - apps/pragma/site/src/lib/queries/songs.queries.test.tsx
  - apps/pragma/site/src/lib/queries/bars.queries.test.tsx
  - apps/pragma/site/src/lib/queries/instruments.queries.test.tsx
  - apps/pragma/site/src/lib/queries/members.queries.test.tsx
  - apps/pragma/site/src/lib/queries/mastery.queries.test.tsx
  - apps/pragma/site/src/lib/queries/transitions.queries.test.tsx
partialDeferrals: []
next:
  kind: validate
---
