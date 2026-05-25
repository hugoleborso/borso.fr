---
status: partial
summary: |
  Round 13 — migrate pragma's FE to the four new conventions (Hono RPC,
  TanStack Query, TanStack Form, mobile-first responsive). Shipped the
  full Query migration end-to-end; partial on Form and table.

  Counts shipped:
  - routes migrated to useQuery/useMutation: 10/10 (Login, Catalog,
    SongDetailPage, SongEditPage, SongScenePage, SessionsPage,
    SessionDetailPage, SetlistsPage, SetlistEditor, BarsPage,
    InstrumentsPage, MembersPage; plus RequireSession + useNavBadges
    + SongSearch + FileDrop + UploadedChartPreview + MasteryMatrix).
  - forms migrated to TanStack Form: 3/7+ (Login, InstrumentsPage,
    MembersPage). SongEditPage, BarForm, ConcertEditForm,
    SetlistEntryRow inline fields remain on useState — see partial.
  - tables migrated to TanStack Table: 0/2 (MasteryMatrix, BarsList) —
    deferred. The @tanstack/react-table dependency was removed from
    package.json to keep knip clean; re-adding it is a one-line
    follow-up.

  api-client.ts deletion confirmed (0 apiRequest occurrences post-
  migration; 0 useEffect+fetch occurrences post-migration). Query
  keys structure follows the brief's typed-tuple convention
  (`{ all, list, byId, search }` per feature). Optimistic operations
  named: MasteryMatrix cell save / clear (wheel ±1 + right-click),
  via queryClient.setQueryData(masteryKeys.defaults()) + rollback in
  onError. All other writes are pessimistic (invalidate on success).

  Responsive coverage: every page got px-4 sm:px-9 + a text-[40px]
  sm:text-[56px] H1 scale-down + wherever a fixed-width layout
  threatened a 375-px viewport. Spot-checked Login, Catalog,
  SongDetailPage, SessionsPage, SessionDetailPage, SetlistEditor (the
  side-gutter warning marker is replaced by an inline pill on mobile
  via lg:hidden / hidden lg:block), BarsPage (kanban switches to
  overflow-x-auto + 2-col-at-md + 5-col-at-lg), InstrumentsPage,
  MembersPage. Not exhaustively re-screenshotted at 375px —
  visual-validation pass deferred to /visual-validation.

  Tests: 311 core + 60 back-e2e = 371 passing. Typecheck, biome lint,
  knip, build all green.

  Final SHA: 16700aef5f10a8cb01f9bfce4e995d971bbaa847
  Round-13 commit count: 11
  Files touched (round-13): 11 API controllers chained, 8 query
  modules added, 12 routes migrated, 4 molecules migrated, 2 organisms
  migrated, useMediaQuery + test added, api-client.ts deleted.
  Tests added: 4 (useMediaQuery).

  partialDeferral 1 — TanStack Form on the heavier forms: SongEditPage
  (chordpro + chart-kind + tonality + links + N field types — a full
  TanStack Form conversion needs an array-of-fields treatment for
  `links` plus the SongSearch picker integration that mutates two
  fields at once), BarForm + ConcertEditForm (driven by parent state
  + child render-props, refactor needs lift-up reconsideration),
  SetlistEntryRow (deeply nested in the editor — same parent-state
  pattern). These keep useState today; the data path is already on
  Query mutations, so the only remaining shift is the field state
  layer.

  partialDeferral 2 — TanStack Table on MasteryMatrix + BarsList:
  the matrix's cell affordances (click-edit, wheel ±1, right-click
  clear) are tightly coupled to the cell's input element + the
  optimistic cache patching. Folding a useReactTable instance on top
  is mechanical but visible churn that didn't fit the round's
  budget. BarsList similarly works fine as a sorted ul today; sort-
  by-column-header would be the next visible win.

  partialDeferral 3 — Comprehensive 375-px responsive audit:
  the container width fixes landed across every page, but I did not
  run a screenshot pass per route. The visual-validator (separate
  skill) is the gate that resolves this.
artifacts:
  - apps/pragma/api/src/app.ts
  - apps/pragma/api/src/**/*.controller.ts (11 controllers chained)
  - apps/pragma/site/src/lib/api.ts
  - apps/pragma/site/src/lib/query-client.ts
  - apps/pragma/site/src/lib/queries/{auth,bars,instruments,mastery,members,sessions,setlists,songs,transitions,uploads}.ts
  - apps/pragma/site/src/components/molecules/useMediaQuery.ts
  - apps/pragma/site/src/components/molecules/use-media-query.test.tsx
  - apps/pragma/site/src/main.tsx
  - apps/pragma/site/src/routes/Login.tsx
  - apps/pragma/site/src/routes/{catalog,sessions,setlists,bars,instruments,members}/*.tsx
  - apps/pragma/site/src/components/organisms/{MasteryMatrix,RequireSession,AppShell,useNavBadges}.ts(x)
  - apps/pragma/site/src/components/molecules/{SongSearch,FileDrop,UploadedChartPreview}.tsx
  - apps/pragma/api/src/songs/songs.repository.ts (SongRow tightened)
  - apps/pragma/api/src/bars/bars.repository.ts (BarStatus tightened)
  - apps/pragma/api/src/setlists/setlists.repository.ts (LineupOverride tightened)
  - apps/pragma/site/src/lib/api-client.ts (DELETED)
partialDeferrals:
  - TanStack Form on SongEditPage, BarForm, ConcertEditForm,
    SetlistEntryRow inline fields — useState remains; data path is
    already on Query mutations.
  - TanStack Table on MasteryMatrix + BarsList — useReactTable not
    yet wired; @tanstack/react-table dep removed from package.json
    to keep knip green.
  - Full screenshot-based 375-px responsive audit — container fixes
    landed but per-route visual diff deferred to /visual-validation.
next:
  kind: validate
---
