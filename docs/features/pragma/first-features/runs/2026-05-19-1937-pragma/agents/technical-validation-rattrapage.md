---
status: FAIL
summary: |
  Rattrapage technical-validation across rounds 7→17c on rebased branch
  `claude/pragma-erp-specification-k41Mg` @ HEAD `3e163e2`.

  Body of work is otherwise clean — every "claim ≠ reality" suspicion
  the brief flagged held up:

  - Backend per-domain triad: PASS — all 10 bounded contexts under
    `apps/pragma/api/src/` ship the layered triad. No horizontal
    aggregators. Drizzle imports outside repository/schema: 0.
  - Optimistic onMutate audit (the brief's #1 concern, given round 13's
    history): PASS per-file across bars, instruments, mastery, members,
    sessions, setlists, songs, transitions. Every cache-touching
    mutation wires `onMutate`/`onError` rollback/`onSettled`
    invalidate. Three documented skips (`useLogin`,
    `useSignChartUpload`, `useCreateSetlist`) have no cache or carry
    a JSDoc reason.
  - i18n type augmentation: PASS — `react-i18next.d.ts` augments
    `'i18next'` (not `'react-i18next'`); `CustomTypeOptions.resources.translation = typeof en`.
  - Round-10 SPA fallback CF function: PASS — `SPA_APPS = ['last-loop-lepin', 'pragma']`
    at `infra/cdk/src/internal/cf-host-routing-function.code.js:61`;
    asset-vs-route disambiguation via `lastDotSpa < lastSlashSpa`.
  - Round-8 `asyncifyIndex`: PASS — composed in `splitStatements` with
    `makeIdempotent` + `stripUsingClause`; ≥4 case shapes covered.
  - Round-7 jsonb → text: PASS — 0 `jsonb(` hits in `apps/pragma/api/src/`.

  But: `pnpm exec biome check` (the actual pre-commit gate — lint +
  formatter + organizeImports) fails with 125 diagnostics across 16
  files. Earlier per-round verdicts ran `pnpm exec biome lint` (which
  passes), missing the composite check. The pre-commit hook runs
  `check`, not `lint` (`.husky/pre-commit:14`), so a fresh commit on
  this branch is rejected by Husky today — confirmed when I tried to
  commit this report and the hook bounced it.

  Diagnostics are FIXABLE via `pnpm exec biome check --write`.
  Categories: `assist/source/organizeImports` + formatter drift across
  `apps/pragma/{api/src/auth, site/src/routes/{catalog,instruments,members,sessions,setlists}, site/src/sw}` and
  `commitlint.config.js`.

  Other gates green: install (0), typecheck pragma (0), typecheck infra
  (0), biome lint (0), knip (0), test:core (42 files / 364 tests, 0),
  back-e2e (11 files / 62 tests, 0), infra test:coverage (18 files /
  205 tests at 100%, 0), build (0).

  Verdict: FAIL. Fix-round needed before PR can be opened — mechanical
  `biome check --write` + re-stage. After that, the branch is ready
  for `/visual-validation` and `/open-pr`.
artifacts:
  - docs/features/pragma/first-features/validation/technical-validation-rattrapage-2026-05-25.md
next:
  kind: fix
---
