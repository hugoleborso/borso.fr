---
status: done
summary: |
  Round 14 — close the two partialDeferrals left open by round 13.

  Forms migrated to TanStack Form (4/4 deferred):
  - SongEditPage (title, artist, status, links array, chart variant
    with chordpro/pdf/image branches, tonality overrides, base
    energy, SongSearch picker that mutates two fields at once,
    chordpro→tonality auto-derive preserved via form.getFieldValue
    + form.setFieldValue).
  - BarForm (name, status, city, capacity, contactName/Email/Phone,
    notes — own useForm, parent supplies initial + onSubmit
    callback, keyed on initial.id).
  - ConcertEditForm (venue, capacity, gear, friends-count-per-member
    nested Record field — keyed on session.id).
  - SetlistEntryRow (per-row useForm instance, N independent forms
    inside the editor; keyOverride, capo, notes, energy; live-edit
    semantics preserved via field.handleChange → props.onUpdate).

  Tables migrated to TanStack Table (2/2 deferred):
  - MasteryMatrix — column defs: member row-header, N instrument
    columns (cell renderer carries wheel ±1 / right-click clear /
    click-edit), trailing row-average. Footer row (column averages)
    stays as a static <tr> — it summarises columns, not data rows.
  - BarsList — new organism extracted from BarsPage. useReactTable
    + getSortedRowModel; header cells clickable with chev sort
    indicator. Columns: name (sortable, selects on click), status
    chip, stale badge, city, capacity (md+), delete action.

  @tanstack/react-table re-added to apps/pragma/package.json
  (v8.21.3). The round-13 anti-pattern (removing the dep to silence
  knip while deferring the migrations) is undone.

  Tests: 311 core + 60 back-e2e = 371 passing (unchanged count vs
  round 13 — the migrations preserve existing contracts, and the
  organisms didn't have dedicated tests before). No new test files
  added; the existing back-e2e + cdk tests still cover the data
  paths the forms talk to.

  Pre-flight gates:
  - typecheck: green (`tsc -p tsconfig.cdk.json --noEmit && tsc --noEmit`)
  - lint: green (biome lint, 214 files, no fixes applied)
  - knip: green (only configuration hints, no errors)
  - test:core: 311 passed
  - test (back-e2e): 60 passed
  - build: green (Vite, 626 kB gzip 183 kB — same chunk-size warning
    as round 13)

  Final SHA after the verdict commit will be appended on commit.
  Round-14 commit count: 8 (7 feature/chore + this verdict).

  Files touched (round 14):
  - apps/pragma/package.json + pnpm-lock.yaml (dep re-add)
  - apps/pragma/site/src/routes/bars/BarForm.tsx (TanStack Form)
  - apps/pragma/site/src/routes/bars/BarsPage.tsx (consume new
    BarForm contract + BarsList organism)
  - apps/pragma/site/src/routes/sessions/ConcertEditForm.tsx
    (TanStack Form)
  - apps/pragma/site/src/routes/sessions/SessionDetailPage.tsx
    (consume new ConcertEditForm contract; removed N parent
    useStates + the useEffect that mirrored query data into them)
  - apps/pragma/site/src/routes/setlists/SetlistEntryRow.tsx
    (per-row TanStack Form)
  - apps/pragma/site/src/routes/catalog/SongEditPage.tsx
    (TanStack Form on the heaviest form — split into a thin outer
    component that resolves defaultValues from the query and an
    inner SongEditPageForm that owns the useForm instance, keyed
    on song id for clean reset)
  - apps/pragma/site/src/components/organisms/MasteryMatrix.tsx
    (TanStack Table)
  - apps/pragma/site/src/components/organisms/BarsList.tsx
    (new organism, TanStack Table)

artifacts:
  - apps/pragma/package.json
  - apps/pragma/site/src/routes/catalog/SongEditPage.tsx
  - apps/pragma/site/src/routes/bars/BarForm.tsx
  - apps/pragma/site/src/routes/bars/BarsPage.tsx
  - apps/pragma/site/src/routes/sessions/ConcertEditForm.tsx
  - apps/pragma/site/src/routes/sessions/SessionDetailPage.tsx
  - apps/pragma/site/src/routes/setlists/SetlistEntryRow.tsx
  - apps/pragma/site/src/components/organisms/MasteryMatrix.tsx
  - apps/pragma/site/src/components/organisms/BarsList.tsx
partialDeferrals: []
next:
  kind: validate
---
