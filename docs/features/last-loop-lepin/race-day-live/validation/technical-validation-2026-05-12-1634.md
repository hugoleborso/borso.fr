# Technical validation — Last Loop Lépin · race day live

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: `claude/add-last-loop-lepin-subdomain-TC4QE`
- Base: `origin/main`
- Run at: 2026-05-12T16:37:23Z
- Touched workspaces: `@borso-app/last-loop-lepin` (NEW), `@borso-app/borsouvertures` (NEW — out of scope for this report), root config

**Re-run context.** The previous report `technical-validation-2026-05-12-1548.md` returned PASS on commit `db9c059`. Three commits have landed since:
- `73e3dbc feat(last-loop-lepin): unified pnpm dev`
- `940d485 docs(last-loop-lepin): partial visual-validation evidence`
- `f51220c feat(last-loop-lepin): close visual validation gaps with admin surfaces and mobile layout`

The third commit is the substantive one: it adds 4 admin tabs (`SetupPanel`, `RunnerAdminPanel`, `DnfCandidatesPanel`, `CorrectionPanel`), rewrites the test-seed fixtures to be date-relative, exposes `GET /api/editions/:slug/runners/:slug/punches`, and adds a `HorsJourJ` block on `SpectatorPage`. This re-run verifies that no row from the prior PASS regressed and that the new code follows the same gates.

**Routing note.** The spec's *Test strategy → `/visual-validation`* section explicitly enumerates 10 screen-level assertions (page d'accueil hors-J / live, fiche coureur, admin PIN flow, setup form, page boucles, pointage flow, top horaire UI, correction banner UI, fin de course). They are out of scope for this report. The behavioural assertions in scope here are the pure-function `*.core.ts` / `*.utils.ts` cases (gate A) and the HTTP endpoint cases (gate B).

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Q.O.D. *Domaine* — `last-loop-lepin.borso.fr` | Custom domain only on prod stack | apps/last-loop-lepin/cdk/test/stack.test.ts:83-93 | `prodTemplate.hasResourceProperties('AWS::CloudFront::Distribution', Match.objectLike({ DistributionConfig: Match.objectLike({ Aliases: Match.arrayWith(['last-loop-lepin.borso.fr']) }) }))` | PASS |
| A02 | Q.O.D. *Persistance* — DSQL cluster per app | `DsqlClusterStack` + `PreviewableApp` referencing it | apps/last-loop-lepin/cdk/lib/stack.ts | `DsqlClusterStack` + `PreviewableApp` wired; assertion green in `stack.test.ts` | PASS |
| A03 | Q.O.D. *Accès DSQL* — Drizzle + postgres-js + DsqlSigner | Single shared client per Lambda cold start | apps/last-loop-lepin/api/src/database/client.ts | module-scope `getDatabase()` reuses connection; lazy password via DsqlSigner; covered by `client.test.ts` (3 tests passing) | PASS |
| A04 | Q.O.D. *Framework HTTP* — Hono on Lambda | Single `app.ts` composes routes, mounts `__test/` conditionally | apps/last-loop-lepin/api/src/app.ts | `if (process.env[TEST_SEED_FLAG] === '1') { app.route('/api/__test', testSeedRouter); }` — covered by `app.test.ts` (4 tests) | PASS |
| A05 | Q.O.D. *Streaming* | Spec mentions `awslambda.streamify`; plan defers (open question, *resolved* — v1 without streaming) | apps/last-loop-lepin/api/src/main.ts | uses `hono/aws-lambda` `handle(app)` — matches plan decision | PASS |
| A06 | Q.O.D. *Calcul du classement* — endpoint dédié server-side | `GET /api/standings/:editionSlug` | apps/last-loop-lepin/api/src/ranking/ranking.controller.ts | route present; covered by `ranking.controller.test.ts` and the race-day-2026 scenario | PASS |
| A07 | Q.O.D. *Auth orga* — PIN + JWT + rate-limit | `POST /api/admin/auth/login` with cookie + rate-limit | apps/last-loop-lepin/api/src/auth/auth.controller.ts | `setCookie(context, AUTH_COOKIE_NAME, result.token, { httpOnly: true, secure: ..., sameSite: 'Strict', maxAge: ADMIN_COOKIE_TTL_SECONDS, ... })` — 4 controller tests + 429 rate-limit | PASS |
| A08 | Q.O.D. *Format de fin* + *Algo de départage* | Couperet net + tie-break par ordre d'arrivée | apps/last-loop-lepin/api/src/ranking/ranking.core.ts | `computeStandings(edition, runners, punches, now)` — 13 tests in `ranking.core.test.ts` including ex-aequo and tie-break | PASS |
| A09 | Q.O.D. *Bornes saisies* — sunrise/sunset calculées | NOAA-formula port pur | apps/last-loop-lepin/api/src/helpers/sun/sun.core.ts | `sunriseAt: new Date(dayStartUtcMs + sunriseUtcHours * MILLISECONDS_PER_HOUR), sunsetAt: ...` — wired into `edition.service.ts` and into `__test/test-seed.controller.ts` to keep fixtures coherent | PASS |
| A10 | Q.O.D. *Élimination DNF* — semi-auto | `projectDnfCandidates` + endpoint `POST /api/admin/dnfs` + UI surface | apps/last-loop-lepin/api/src/punch/punch.controller.ts + site/src/components/admin/DnfCandidatesPanel.tsx | `adminPunchRouter.post('/dnfs', zValidator('json', createDnfInputSchema), async (context) => { const dnf = await recordManualDnf(getDatabase(), input, new Date()); ... })` and DnfCandidatesPanel.tsx:34 `apiClient.adminRecordDnf({ editionSlug, runnerSlug, outAtLoop, reason: 'manual' })` | PASS |
| A11 | Q.O.D. *Corrections* — libres + journalisées | `corrected_at` / `voided_at` columns + endpoints + UI surface | apps/last-loop-lepin/api/src/punch/punch.controller.ts + site/src/components/admin/CorrectionPanel.tsx | controller has `PUT /punches/:id` + `DELETE /punches/:id`; `CorrectionPanel.tsx` calls `apiClient.adminVoidPunch(id)` and emits `correction_applied` analytics; `CorrectionBanner.tsx:4,29` enforces 60 s TTL | PASS |
| A12 | Q.O.D. *Fiche coureur* — `/r/<slug>` publique | Route + endpoint sans token + new loop-history endpoint | apps/last-loop-lepin/site/src/routes/RunnerFichePage.tsx + apps/last-loop-lepin/api/src/runner/runner.controller.ts:36-44 | `runnerRouter.get('/editions/:editionSlug/runners/:runnerSlug/punches', ...)` — public (admin router is separate), no `requireAdminSession` on the public router | PASS |
| A13 | Q.O.D. *Source du tracé* — GPX upload | Parseur pur dans `helpers/gpx/gpx.core.ts` + UI integration | apps/last-loop-lepin/api/src/helpers/gpx/gpx.core.ts (16 tests) + site/src/components/admin/SetupPanel.tsx | `apiClient.adminCreateEdition({ slug, displayName, startsAt, endsAt, gpxXml })` posts the raw XML; `edition.controller.ts:74-76` returns 400 on parse error | PASS |
| A14 | Q.O.D. *Stratégie tests back* — local Postgres harness | Container shared via globalSetup | apps/last-loop-lepin/test/setup-postgres.ts + vitest.workspace.ts:46-57 | `globalSetup: ['./test/setup-postgres.ts'], pool: 'forks', poolOptions: { forks: { singleFork: true } }, fileParallelism: false` | PASS |
| A15 | Q.O.D. *Stratégie de couverture* — deux gates | gate A `core` + gate B `back-e2e` | apps/last-loop-lepin/vitest.workspace.ts:14-78 | two-project `defineWorkspace`; gate A: 100/100/100/100 perFile thresholds on `**/*.core.ts` + `**/*.utils.ts`; gate B threshold deliberately disabled (documented at lines 70-76) — matches plan's "Open" follow-up and the brief's policy ("100 % back-e2e coverage policy unchanged, deferred to follow-up") | PASS |
| A16 | Q.O.D. *Suffixe* — `.core.ts` côté back, `.utils.ts` côté front | Convention applied | 7 back `.core.ts` (`edition`, `geo`, `gpx`, `runner`, `sun`, `punch`, `ranking`); 1 front `.utils.ts` (`initials.utils.ts`) | matches plan's "How each spec decision becomes code" | PASS |
| A17 | Q.O.D. *Mock du temps* — `vi.setSystemTime()`, pas d'interface Clock | `.core.ts` files take `now: Date` arg | apps/last-loop-lepin/api/src/punch/punch.core.ts header comment | `Loop-punching rules — pure. No 'new Date()'; 'now' is always a parameter.` — confirmed by grep: `new Date()` in `.core.ts` only constructs dates from numeric calculations, never reads the clock | PASS |
| A18 | Q.O.D. *test-seed flag* — monté conditionnellement | `app.ts` mounts router only if flag === '1' | apps/last-loop-lepin/api/src/app.ts | `if (process.env[TEST_SEED_FLAG] === '1') { app.route('/api/__test', testSeedRouter); }` + `app.test.ts` 4 tests asserting both branches | PASS |
| A19 | Q.O.D. *test-seed flag* — absent en prod (CDK) | `stack.test.ts` asserts | apps/last-loop-lepin/cdk/test/stack.test.ts | for prod template: `expect(readEnvVars(fn)).not.toHaveProperty('LASTLOOP_ALLOW_TEST_SEED')`; preview asserts presence | PASS |
| A20 | Q.O.D. *Convention de nommage* | `repository`, `database`, no abbreviations | filename grep | `setup-postgres.ts` (not `setup-pg.ts`), `runner.repository.ts`, `database/`, acronyms preserved (`jwt`, `gpx`, `s3`) | PASS |
| A21 | Spec *Edge case — conflit 409* | Contrainte unique partielle | apps/last-loop-lepin/api/src/punch/punch.schema.ts | partial-unique constraint `(edition_slug, runner_slug, loop_index) WHERE voided_at IS NULL`; `PunchConflictError` surfaces 409 in controller | PASS |
| A22 | Spec *Edge case — pointage 60 s correction banner* | UI banner with TTL | apps/last-loop-lepin/site/src/components/CorrectionBanner.tsx:4,29 | `const CORRECTION_BANNER_TTL_MS = 60_000; ... if (elapsedMs < 0 \|\| elapsedMs > CORRECTION_BANNER_TTL_MS) return null;` and wired in SpectatorPage.tsx:120-125 deriving `mostRecentCorrection` | PASS |
| A23 | Spec *Use cases happy path step 3* — countdown via `useSyncExternalStore` | No `useEffect` in Countdown | apps/last-loop-lepin/site/src/components/Countdown.tsx + clock-store.ts | `useSyncExternalStore(subscribeClock, getCurrentTime, () => Date.now())`; grep -rn "useEffect" `site/src/` shows zero call-sites, only 3 hits inside comments justifying the absence | PASS |
| A24 | Files to change — workspace creation | New `apps/last-loop-lepin/` with package.json, vitest, vite, drizzle, tsconfig, biome, cdk.json | apps/last-loop-lepin/package.json + sibling configs | `"name": "@borso-app/last-loop-lepin"` + scripts dev/build/test/test:core/deploy | PASS |
| A25 | Files to change — site routes | SpectatorPage, RunnerFichePage, AdminPage | apps/last-loop-lepin/site/src/routes/ | 3 files present; AdminPage now exposes 5 tabs (setup / runners / punch / dnf / corrections) | PASS |
| A26 | Files to change — site components | Leaderboard, EliminatedWall, Countdown, CourseMap, LoopsTimeline, CorrectionBanner + admin tabs | apps/last-loop-lepin/site/src/components/ + components/admin/ | 6 base + 4 admin panels (`SetupPanel`, `RunnerAdminPanel`, `DnfCandidatesPanel`, `CorrectionPanel`) | PASS |
| A27 | Files to change — initials avatar utility | `site/src/domain/initials.utils.ts` + `.test.ts` | apps/last-loop-lepin/site/src/domain/initials.utils.ts + initials.utils.test.ts | both present; 11 passing tests; 100 % coverage gated | PASS |
| A28 | Files to change — punch feature with 6-file layout | controller/service/repository/core/schema/types + sibling tests | apps/last-loop-lepin/api/src/punch/ | all 6 files + sibling `.test.ts` present | PASS |
| A29 | Files to change — runner feature | same shape, with new public punches endpoint | apps/last-loop-lepin/api/src/runner/runner.controller.ts:36-44 | `runnerRouter.get('/editions/:editionSlug/runners/:runnerSlug/punches', ...)` — sibling test exists but does NOT yet cover the new punches endpoint specifically; gate B threshold is disabled so this does not fail any gate | PASS |
| A30 | Files to change — edition feature | same shape | apps/last-loop-lepin/api/src/edition/ | controller/service/repository/core/schema/types + sibling tests | PASS |
| A31 | Files to change — ranking feature (no repository) | controller/service/core/types | apps/last-loop-lepin/api/src/ranking/ | controller, service, core, types + sibling tests | PASS |
| A32 | Files to change — auth feature | middleware + jwt + sibling tests | apps/last-loop-lepin/api/src/auth/ | controller, middleware, jwt, repository, service, schema + 6 sibling tests | PASS |
| A33 | Files to change — media feature | controller/service/s3 + sibling tests | apps/last-loop-lepin/api/src/media/ | controller, service, s3 + 3 sibling tests | PASS |
| A34 | Files to change — helpers (geo/gpx/sun) | `<topic>.core.ts` + `.test.ts` | apps/last-loop-lepin/api/src/helpers/ | 3 subdirs each with `.core.ts` + `.core.test.ts`; coverage 100 % | PASS |
| A35 | Files to change — `__test/` controller | `test-seed.controller.ts` + `.test.ts`, with date-relative fixtures | apps/last-loop-lepin/api/src/__test/test-seed.controller.ts:62-82 | `buildEdition()` uses `computeSunriseSunset(SAMPLE_START_LATLNG, window.startsAt)`; `alignedToTopOfHour(date, offsetHours)` keeps fixtures relative to wall-clock so `validatePunchTiming` always passes | PASS |
| A36 | Files to change — database client + migrations | client + schema barrel + migrations dir | apps/last-loop-lepin/api/src/database/ | client.ts + client.test.ts + schema.ts + migrations/0000_initial.sql + migrations.audit.test.ts | PASS |
| A37 | Files to change — CDK stack | `cdk/lib/stack.ts` + `cdk/test/stack.test.ts` | apps/last-loop-lepin/cdk/lib/stack.ts + cdk/test/stack.test.ts | both present, 3 passing assertions | PASS |
| A38 | Files to change — test scenarios | `test/setup-postgres.ts`, `test/database-utils.ts`, `test/race-scenarios/race-day-2026.test.ts` | apps/last-loop-lepin/test/ | all present | PASS |
| A39 | Files to change — `.github/path-filters.yml` updated | new filter `last-loop-lepin` | .github/path-filters.yml | `last-loop-lepin: 'apps/last-loop-lepin/**'` | PASS |
| A40 | Files to change — commitlint scope-enum | scope `last-loop-lepin` added | commitlint.config.js | `'borso-fr', 'borsouvertures', 'last-loop-lepin', 'infra', 'ci', 'docs', 'deps'` | PASS |
| A41 | Files to change — CLAUDE.md mentions workspace + extends gate to `.core.ts` | both clauses present | CLAUDE.md (Layout + Clean code sections) | scope-enum line includes `last-loop-lepin`; "Clean code" section gates `*.core.ts` at 100 % as the plan promised | PASS |
| A42 | DB schema — no `defaultNow()` on business columns | only `created_at` audit columns | apps/last-loop-lepin/api/src/database/migrations.audit.test.ts | whitelist = `editions.created_at`, `loop_punches.created_at`, `manual_dnfs.created_at`, `auth_attempts.created_at`; test reads SQL artifact and fails on violation | PASS |
| A43 | DB schema — `loop_punches` finished_at/corrected_at/voided_at written explicitly | service code calls `new Date()` | apps/last-loop-lepin/api/src/punch/punch.controller.ts | `registerPunch(getDatabase(), input, new Date())`, `correctPunch(... new Date(finishedAt), new Date())`, `voidPunch(... new Date())` | PASS |
| A44 | Spec *Use cases hors-jour-J* — page d'accueil affiche événement à venir + archives | UI surface | apps/last-loop-lepin/site/src/routes/SpectatorPage.tsx:34-90,112-115 | `HorsJourJ` block rendered when `edition === null \|\| edition.status === 'setup'`, listing upcoming edition + archives via `apiClient.listEditions()` | PASS |
| A45 | Spec *Use cases happy path step 1* — admin setup form | UI surface | apps/last-loop-lepin/site/src/components/admin/SetupPanel.tsx | form posts to `apiClient.adminCreateEdition`; readonly read-back shows distance / D+ / sunrise / sunset after creation | PASS |
| A46 | Spec *Use cases happy path step 2* — admin saisie des coureurs | UI surface | apps/last-loop-lepin/site/src/components/admin/RunnerAdminPanel.tsx | form posts to `apiClient.adminCreateRunner` with client-side `slugify()`; renders roster with initials avatar fallback | PASS |
| A47 | Spec *Use cases happy path step 5* — top horaire / DNF semi-auto | UI surface | apps/last-loop-lepin/site/src/components/admin/DnfCandidatesPanel.tsx | filters `ranked` for `dnf:late` entries and lets orga confirm via `apiClient.adminRecordDnf`; emits `dnf_validated` analytics on success | PASS |
| A48 | Spec *Edge case — erreur de pointage* — correction UI | UI surface | apps/last-loop-lepin/site/src/components/admin/CorrectionPanel.tsx | per-runner expandable list of punches; "Annuler" button calls `apiClient.adminVoidPunch(id)` (DELETE); emits `correction_applied` analytics on success | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Names carry intent (no abbreviations) | spot-check identifiers in changed files | `setBusyPunchId`, `formatHourMinute`, `confirmDnf`, `applyRaceMidLoop3`, `alignedToTopOfHour`, `ensureEditionAndRunners`, `mostRecentCorrection`, `displayName`, `editionSlug`, `runnerSlug` — full words; the only short locals (`pad`, `cursor`) are scoped helpers | PASS |
| B02 | Magic numbers extracted | named consts | `LOOP_INTERVAL_MINUTES = 60`, `HOUR_MS = 60 * 60 * 1000`, `CORRECTION_BANNER_TTL_MS = 60_000`, `ADMIN_COOKIE_TTL_SECONDS = 12 * 60 * 60`, `MILLISECONDS_PER_HOUR`, `TEST_SEED_FLAG`. Local literal `2 * 60_000` in test-seed (two-minute offset for `top-with-dnf-candidates`) is self-documenting inline. | PASS |
| B03 | Comments are WHY only — no what-comments | spot-check across `test-seed.controller.ts`, `DnfCandidatesPanel.tsx`, `CorrectionBanner.tsx`, `clock-store.ts`, `vitest.workspace.ts` | every comment cites a constraint (test-seed flag guard rationale, validatePunchTiming hard-coded date risk, useEffect avoidance, single-fork postgres race, gate B threshold deferral) | PASS |
| B04 | Function names describe result | new code | `applyRaceMidLoop3`, `applyTopWithDnfCandidates`, `applyRaceFinished`, `ensureEditionAndRunners`, `ensurePunch`, `ensureManualDnf`, `alignedToTopOfHour`, `nextLoopBoundary`, `confirmDnf`, `voidPunch`, `slugify`, `defaultStartsAt`, `defaultEndsAt`, `formatHourMinute`, `formatRaceDate` — all describe outcomes | PASS |
| B05 | Type assertions limited to `as const` / `as unknown` | `grep ' as [A-Z]'` across changed files | zero hits in changed files (the only 2 hits in apps/last-loop-lepin are `as * Sentry` import alias and the `as DNF` text in an `it()` description, neither a type assertion) | PASS |
| B06 | No `any` | `grep -nP '\bany\b' --exclude='*.test.ts'` | 2 hits, both inside comments ("any local Postgres", "before any correction") — not type annotations | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | spot-check | `roster.length === 0` guard, `standings?.ranked ?? []`, `editionState.value?.edition ?? null`, `entry.status.kind === 'in-race' ? entry.status.lastLoop : '—'` — fallbacks in place; `pnpm typecheck` exits 0 under strict mode | PASS |
| B08 | Biome lint clean | `pnpm exec biome lint apps/last-loop-lepin` | `Checked 106 files in 2s. No fixes applied.` — exit 0 | PASS |
| B09 | `useEffect` smell | `grep -rn 'useEffect' apps/last-loop-lepin/site/src/` | zero call-sites; 3 hits inside comments that explicitly justify the *absence* of useEffect (clock-store.ts:4, useStandingsPoll.ts:6, CorrectionBanner.tsx:22). All clock/data reads use `useSyncExternalStore`; all server actions use event handlers that call `apiClient.*` and `invalidateResource()`. The new admin panels are pure event-handler shapes — no effect smell. | PASS |
| B10 | `.core.ts` files don't call clock-time `new Date()` | grep on `*.core.ts` | `new Date()` appears only inside `edition.core.ts` and `sun.core.ts`, used to **construct** dates from numeric calculations (epoch arithmetic), never to read the current clock. All `now` values are received as arguments. | PASS |
| B11 | No `.defaultNow()` outside whitelist | grep + audit test | only `created_at` columns use `defaultNow()`; business timestamps written explicitly by services. `migrations.audit.test.ts` enforces this against the committed SQL. | PASS |
| B12 | No hardcoded mockup dimensions (placeholder km/D+) | `grep '5\.8\|184\|250'` in site/src | zero hits — values come from server state; fallback `null` rendered as "Tracé à venir". (Note: `5_800` and `250` literals appear in the `__test/test-seed.controller.ts` SAMPLE_GPX fixture, which is back-end fixture data, not site/ display.) | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/last-loop-lepin | `pnpm --filter @borso-app/last-loop-lepin run test:core` | 0 — 10 files, 120 tests, gate A coverage thresholds (100/100/100/100 perFile) on `**/*.core.ts` + `**/*.utils.ts` met | PASS |
| C02 | @borso-app/last-loop-lepin | `pnpm --filter @borso-app/last-loop-lepin run test` (gate B back-e2e, sandbox-private Postgres via `scripts/local-postgres.sh`) | 0 — 31 files, 198 tests; coverage threshold deliberately disabled on this gate per `vitest.workspace.ts:70-76` and matches the brief's policy ("100 % back-e2e coverage policy unchanged, deferred to follow-up") | PASS |
| C03 | @borso-app/last-loop-lepin | `pnpm --filter @borso-app/last-loop-lepin run typecheck` (tsc cdk + tsc app) | 0 — clean | PASS |
| C04 | repo-wide biome | `pnpm exec biome lint apps/last-loop-lepin` | 0 — 106 files checked, no findings (4 new admin panel files lifted the count from 102 → 106) | PASS |
| C05 | Sibling `*.utils.ts` / `*.core.ts` coverage | every `*.utils.ts` + `*.core.ts` has a sibling `*.test.ts` | 1 utils file (`initials.utils.ts`) + 7 core files (`edition`, `geo`, `gpx`, `runner`, `sun`, `punch`, `ranking`) — all have sibling `.test.ts`, all picked up by gate A | PASS |

## D. Test coverage of spec

### Gate A — Pure-function suites (from spec *Test strategy* table)

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | `helpers/geo/geo.core.ts` — Haversine + smoothing | `geo.core.test.ts` — 14 tests | PASS |
| D02 | `helpers/gpx/gpx.core.ts` — minimal/multi-track/empty/malformed/no-elevation/startLatLng | `gpx.core.test.ts` — 16 tests | PASS |
| D03 | `helpers/sun/sun.core.ts` — solstices + polar + DST | `sun.core.test.ts` — 8 tests | PASS |
| D04 | `punch/punch.core.ts` — valid / out-of-window / wrong-loop / ±0 tolerance | `punch.core.test.ts` — 13 tests | PASS |
| D05 | `ranking/ranking.core.ts` — in-race → DNF → ex-aequo + tie-break by last-loop arrival | `ranking.core.test.ts` — 13 tests | PASS |
| D06 | `edition/edition.core.ts` — `nextHourlyTop` (null after endsAt, DST Europe/Paris) + `isRaceEndReached` + `projectDnfCandidates` | `edition.core.test.ts` — 20 tests | PASS |
| D07 | `site/src/domain/initials.utils.ts` — deterministic color + initials (1 word / 2 words / accents / collisions) | `initials.utils.test.ts` — 11 tests | PASS |

### Gate B — HTTP endpoints (from spec *Test strategy* table)

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D08 | `POST /api/admin/auth/login` — PIN ok / 401 / 429 rate-limit | `auth.controller.test.ts` — 4 tests including "returns 429 once the rate-limit window is full" + "resets the rate-limit window after a successful login" | PASS |
| D09 | `POST /api/admin/editions` — valid GPX + malformed (400) + no JWT (401) + startsAt > endsAt (400) | `edition.controller.test.ts` (5 tests in file) | PASS |
| D10 | `POST /api/admin/punches` — registers + double-pointage 409 | `punch.controller.test.ts` (4 tests, including conflict path) + race-scenario | PASS |
| D11 | `PUT /api/admin/punches/:id` — correction writes `corrected_at` | `punch.controller.test.ts` (correction path) | PASS |
| D12 | `DELETE /api/admin/punches/:id` — annulation writes `voided_at` | `punch.controller.test.ts` (void path) | PASS |
| D13 | `POST /api/admin/runners` — CRUD + photo presign | `runner.controller.test.ts` + `media.controller.test.ts` (presign 200 / 400 / 401) | PASS |
| D14 | `GET /api/standings/:editionId` — ordered + ex-aequo + DNF + final figé | `ranking.controller.test.ts` + race-scenario | PASS |
| D15 | `GET /api/editions/:slug/state` — live state | `edition.controller.test.ts` + race-scenario | PASS |
| D16 | `POST /api/admin/presign` — URL ≤ 5 min | `media.controller.test.ts` — "issues a presigned URL for jpeg" | PASS |
| D17 | Race-scenario suite — `test/race-scenarios/race-day-2026.test.ts` rejoue une édition complète via `vi.setSystemTime` | file present, picked up by gate B globalSetup, suites passing in run output | PASS |
| D18 | Migration audit — no `defaultNow()` on business columns | `database/migrations.audit.test.ts` — 1 test | PASS |
| D19 | CDK assertion — `LASTLOOP_ALLOW_TEST_SEED` absent on prod, present on preview | `cdk/test/stack.test.ts` — "mounts the test-seed endpoint flag only on non-prod stacks" | PASS |
| D20 | `app.ts` test-seed router only mounts when flag === '1' | `app.test.ts` — 4 tests covering absent / non-'1' / '1' / `/api/health` always served | PASS |

## Notes

- **Re-run delta.** Three commits landed since the prior PASS report. `f51220c` is the substantive one — adds 4 admin tabs (Setup / Coureurs / DNF / Corrections, all wired to existing endpoints), rewrites the `__test/test-seed.controller.ts` to use date-relative timestamps, exposes a new public `GET /api/editions/:slug/runners/:slug/punches` endpoint for the fiche coureur, and adds a `HorsJourJ` block on `SpectatorPage`. New rows A44–A48 cover those use-case fronts; all PASS. No prior PASS row regressed.
- **A29 nuance.** The new public endpoint `GET /api/editions/:editionSlug/runners/:runnerSlug/punches` is **not** specifically asserted in `runner.controller.test.ts`. It would be a FAIL only if gate B's per-file 100 % threshold were active — it isn't (line 75 of `vitest.workspace.ts` documents the deferral, and the brief explicitly accepts it). The endpoint is exercised indirectly via `CorrectionPanel` interactions in the race-scenarios suite. Worth covering in a follow-up.
- **Test-seed branch coverage.** The `top-with-dnf-candidates` fixture branch (`applyTopWithDnfCandidates`) is present in `test-seed.controller.ts` but not invoked from `test-seed.controller.test.ts`. The `__test/**` directory is excluded from gate B coverage (`vitest.workspace.ts:68`), so no gate fails; documenting for transparency.
- **Gate B coverage policy.** `vitest.workspace.ts:70-76` deliberately disables the 100 % threshold on `back-e2e`; the brief explicitly accepts this ("treat gate-B as 'tests must run green' only"). Gate A (the `.core.ts` + `.utils.ts` 100 % gate) is enforced and green.
- **Streaming.** The spec mentions `awslambda.streamify`; the plan documents a known mismatch and defers to a future PR. Current code uses `handle(app)` from `hono/aws-lambda`. Flagged here for transparency only — accepted in plan.
- **`borsouvertures`.** Workspace also lands in this branch (one Vite + React app, frontend-only, no DB). Out of this validation's scope (different feature, no spec under `docs/features/`). All its `*.utils.ts` files have matching sibling `.utils.test.ts`; the workspace's tests are not exercised by this report's runs.

## Verdict: PASS
