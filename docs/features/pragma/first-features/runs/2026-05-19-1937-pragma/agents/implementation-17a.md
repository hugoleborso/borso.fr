---
status: done
summary: |
  CreateSessionDialog molecule built on TanStack Form: asks for date
  (HTML5 datetime-local, default = tomorrow 20:00 local, ISO-converted
  before submit) on both branches; concerts also collect venue +
  capacity + gear, practices an optional preparedConcertId from a
  future-concert dropdown. Pure helpers (defaultDateTimeLocal,
  formatDateTimeLocal, dateTimeLocalToIso, filterFutureConcerts) live
  in create-session-dialog.utils.ts with a sibling .utils.test.ts at
  100% coverage (12 assertions). SessionsPage no longer immediate-
  mutates: clicking Create Concert / Create Practice now opens the
  dialog, and a successful create navigates to /sessions/<id>. Each
  row gains a trash affordance whose click stops bubbling and opens a
  native-<dialog> confirmation; confirming fires useDeleteSession with
  optimistic list-pruning, onError rollback from the snapshot, and
  onSettled invalidation of list + byId keys. Gates green:
  typecheck OK, biome lint OK, test:core 334/334, vite build OK,
  knip OK. Final SHA 217dbf3 (5 commits incl. this verdict) on
  branch claude/pragma-erp-specification-k41Mg.
artifacts:
  - apps/pragma/site/src/components/molecules/CreateSessionDialog.tsx
  - apps/pragma/site/src/components/molecules/create-session-dialog.utils.ts
  - apps/pragma/site/src/components/molecules/create-session-dialog.utils.test.ts
  - apps/pragma/site/src/lib/queries/sessions.ts
  - apps/pragma/site/src/routes/sessions/SessionsPage.tsx
  - apps/pragma/site/src/i18n/en.json
  - apps/pragma/site/src/i18n/fr.json
partialDeferrals: []
next:
  kind: validate
---
