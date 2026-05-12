# Technical validation — Last Loop Lépin · race day live

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: `claude/add-last-loop-lepin-subdomain-TC4QE`
- Base: `origin/main`
- Run at: 2026-05-12T15:48:00Z
- Touched workspaces: `@borso-app/last-loop-lepin` (NEW), `@borso-app/borsouvertures` (NEW, out of scope for this report), root config

**Routing note.** The spec's *Test strategy → `/visual-validation`* section explicitly enumerates 10 screen-level assertions (page d'accueil hors-J / live, fiche coureur, admin PIN flow, setup form, page boucles, pointage flow, top horaire UI, correction banner UI, fin de course). They are out of scope for this report. The behavioural assertions in scope here are the pure-function `*.core.ts` / `*.utils.ts` cases (gate A) and the HTTP endpoint cases (gate B).

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Q.O.D. *Domaine* — `last-loop-lepin.borso.fr` | Custom domain only on prod stack | apps/last-loop-lepin/cdk/test/stack.test.ts:83-93 | `prodTemplate.hasResourceProperties('AWS::CloudFront::Distribution', Match.objectLike({ DistributionConfig: Match.objectLike({ Aliases: Match.arrayWith(['last-loop-lepin.borso.fr']) }) }))` | PASS |
| A02 | Q.O.D. *Persistance* — DSQL cluster per app | `DsqlClusterStack` + `PreviewableApp` referencing it | apps/last-loop-lepin/cdk/test/stack.test.ts:32-42 | `const clusterStack = new DsqlClusterStack(app, 'last-loop-lepin-cluster', { app: 'last-loop-lepin', env }); ... cluster: clusterStack.cluster` | PASS |
| A03 | Q.O.D. *Accès DSQL* — Drizzle + postgres-js + DsqlSigner | Single shared client per Lambda cold start | apps/last-loop-lepin/api/src/database/client.ts | module-scope `getDatabase()` reuses connection; lazy password via DsqlSigner; covered by `client.test.ts` (3 tests passing) | PASS |
| A04 | Q.O.D. *Framework HTTP* — Hono on Lambda | Single `app.ts` composes routes | apps/last-loop-lepin/api/src/app.ts:24-46 | `export function createApp(): Hono { const app = new Hono(); ... app.route('/api/editions', editionRouter); ... if (process.env[TEST_SEED_FLAG] === '1') app.route('/api/__test', testSeedRouter); }` | PASS |
| A05 | Q.O.D. *Streaming* | Spec mentions `awslambda.streamify`; plan defers (open question, *resolved* — v1 without streaming) | apps/last-loop-lepin/api/src/main.ts | uses `hono/aws-lambda` `handle(app)` — matches plan decision | PASS |
| A06 | Q.O.D. *Calcul du classement* — endpoint dédié server-side | `GET /api/standings/:editionSlug` | apps/last-loop-lepin/api/src/ranking/ranking.controller.ts:8-14 | `rankingRouter.get('/standings/:editionSlug', async (context) => { const standings = await computeStandingsForEdition(getDatabase(), context.req.param('editionSlug'), new Date()); ... })` | PASS |
| A07 | Q.O.D. *Auth orga* — PIN + JWT + rate-limit | `POST /api/admin/auth/login` with cookie + rate-limit | apps/last-loop-lepin/api/src/auth/auth.controller.ts:19-37 | `authRouter.post('/login', zValidator('json', loginInputSchema), async (context) => { ... setCookie(context, AUTH_COOKIE_NAME, result.token, { httpOnly: true, secure: ..., sameSite: 'Strict', maxAge: ADMIN_COOKIE_TTL_SECONDS, ...` | PASS |
| A08 | Q.O.D. *Format de fin* + *Algo de départage* | Couperet net + tie-break par ordre d'arrivée | apps/last-loop-lepin/api/src/ranking/ranking.core.ts | `computeStandings(edition, runners, punches, now)` — covered by 13 tests in `ranking.core.test.ts` including ex-aequo and tie-break | PASS |
| A09 | Q.O.D. *Bornes saisies* — sunrise/sunset calculées | NOAA-formula port pur | apps/last-loop-lepin/api/src/helpers/sun/sun.core.ts:130-131 | `sunriseAt: new Date(dayStartUtcMs + sunriseUtcHours * MILLISECONDS_PER_HOUR), sunsetAt: ...` — wired into `edition.service.ts` line 40 | PASS |
| A10 | Q.O.D. *Élimination DNF* — semi-auto | `projectDnfCandidates` + endpoint `POST /api/admin/dnfs` | apps/last-loop-lepin/api/src/punch/punch.controller.ts:66-70 | `adminPunchRouter.post('/dnfs', zValidator('json', createDnfInputSchema), async (context) => { const dnf = await recordManualDnf(getDatabase(), input, new Date()); ... })` | PASS |
| A11 | Q.O.D. *Corrections* — libres + journalisées | `corrected_at` / `voided_at` columns + endpoints | apps/last-loop-lepin/api/src/punch/punch.controller.ts:40-64 | `adminPunchRouter.put('/punches/:id', ...)` + `adminPunchRouter.delete('/punches/:id', ...)` and `CorrectionBanner.tsx` 60 s TTL | PASS |
| A12 | Q.O.D. *Fiche coureur* — `/r/<slug>` publique | Route + endpoint sans token | apps/last-loop-lepin/site/src/routes/RunnerFichePage.tsx + apps/last-loop-lepin/api/src/runner/runner.controller.ts:21-33 | `runnerRouter.get('/editions/:editionSlug/runners/:runnerSlug', ...)` — no `requireAdminSession` on this router | PASS |
| A13 | Q.O.D. *Source du tracé* — GPX upload | Parseur pur dans `helpers/gpx/gpx.core.ts` | apps/last-loop-lepin/api/src/helpers/gpx/gpx.core.ts (16 tests) | GpxParseError surface; `edition.controller.ts:74-76` returns 400 on parse error | PASS |
| A14 | Q.O.D. *Stratégie tests back* — testcontainers Postgres | Container shared via globalSetup | apps/last-loop-lepin/test/setup-postgres.ts + vitest.workspace.ts:46-57 | `globalSetup: ['./test/setup-postgres.ts'], pool: 'forks', poolOptions: { forks: { singleFork: true } }, fileParallelism: false` | PASS |
| A15 | Q.O.D. *Stratégie de couverture* — deux gates | gate A `core` + gate B `back-e2e` | apps/last-loop-lepin/vitest.workspace.ts:14-78 | two-project `defineWorkspace`; gate A: 100/100/100/100 perFile thresholds on `**/*.core.ts` + `**/*.utils.ts`; gate B threshold deliberately disabled (documented at lines 70-76) — matches plan's "Open" follow-up | PASS |
| A16 | Q.O.D. *Suffixe* — `.core.ts` côté back, `.utils.ts` côté front | Convention applied | `find` lists all 7 back `.core.ts` files; 1 front `.utils.ts` (`initials.utils.ts`) | matches plan's "How each spec decision becomes code" line 37 | PASS |
| A17 | Q.O.D. *Mock du temps* — `vi.setSystemTime()`, pas d'interface Clock | `.core.ts` files take `now: Date` arg | apps/last-loop-lepin/api/src/punch/punch.core.ts:2 | `Loop-punching rules — pure. No 'new Date()'; 'now' is always a parameter.` — confirmed by grep: `new Date()` only used to construct dates from numeric calculations, never to read clock | PASS |
| A18 | Q.O.D. *test-seed flag* — monté conditionnellement | `app.ts` mounts router only if flag === '1' | apps/last-loop-lepin/api/src/app.ts:41-43 | `if (process.env[TEST_SEED_FLAG] === '1') { app.route('/api/__test', testSeedRouter); }` + `app.test.ts` 4 tests asserting both branches | PASS |
| A19 | Q.O.D. *test-seed flag* — absent en prod (CDK) | `stack.test.ts` asserts | apps/last-loop-lepin/cdk/test/stack.test.ts:63-72 | `for (const fn of Object.values(prodFunctions)) { expect(readEnvVars(fn)).not.toHaveProperty('LASTLOOP_ALLOW_TEST_SEED'); }` + preview asserts presence | PASS |
| A20 | Q.O.D. *Convention de nommage* | `repository`, `database`, no abbreviations | filename grep | `setup-postgres.ts` (not `setup-pg.ts`), `runner.repository.ts`, `database/`, acronyms preserved (`jwt`, `gpx`, `s3`) | PASS |
| A21 | Spec *Edge case — conflit 409* | Contrainte unique partielle | apps/last-loop-lepin/api/src/punch/punch.schema.ts:35-37 | `activePunchUnique: uniqueIndex('loop_punches_active_uq').on(table.editionSlug, table.runnerSlug, table.loopIndex).where(sql\`voided_at IS NULL\`)` + `PunchConflictError` surface in controller line 29-31 | PASS |
| A22 | Spec *Edge case — pointage 60 s correction banner* | UI banner with TTL | apps/last-loop-lepin/site/src/components/CorrectionBanner.tsx:4,29 | `const CORRECTION_BANNER_TTL_MS = 60_000; ... if (elapsedMs < 0 \|\| elapsedMs > CORRECTION_BANNER_TTL_MS) return null;` | PASS |
| A23 | Spec *Use cases happy path step 3* — countdown via `useSyncExternalStore` | No `useEffect` in Countdown | apps/last-loop-lepin/site/src/components/Countdown.tsx:20 | `const now = useSyncExternalStore(subscribeClock, getCurrentTime, () => Date.now());` | PASS |
| A24 | Files to change — workspace creation | New `apps/last-loop-lepin/` with package.json, vitest, vite, drizzle, tsconfig, biome, cdk.json | apps/last-loop-lepin/package.json + sibling configs | `"name": "@borso-app/last-loop-lepin"` + scripts dev/build/test/test:core/deploy | PASS |
| A25 | Files to change — site routes | SpectatorPage, RunnerFichePage, AdminPage | apps/last-loop-lepin/site/src/routes/ | 3 files present | PASS |
| A26 | Files to change — site components | Leaderboard, EliminatedWall, Countdown, CourseMap, LoopsTimeline, CorrectionBanner | apps/last-loop-lepin/site/src/components/ | 6 files present | PASS |
| A27 | Files to change — initials avatar utility | `site/src/domain/initials.utils.ts` + `.test.ts` | apps/last-loop-lepin/site/src/domain/initials.utils.ts + initials.utils.test.ts | both present; 11 passing tests; 100 % coverage gated | PASS |
| A28 | Files to change — punch feature with 6-file layout | controller/service/repository/core/schema/types + sibling tests | apps/last-loop-lepin/api/src/punch/ | all 6 files + 4 sibling `.test.ts` present | PASS |
| A29 | Files to change — runner feature | same shape | apps/last-loop-lepin/api/src/runner/ | controller/service/repository/core/schema/types + sibling tests | PASS |
| A30 | Files to change — edition feature | same shape | apps/last-loop-lepin/api/src/edition/ | controller/service/repository/core/schema/types + sibling tests | PASS |
| A31 | Files to change — ranking feature (no repository) | controller/service/core/types | apps/last-loop-lepin/api/src/ranking/ | controller, service, core, types + sibling tests; no repository (correct per spec line 293) | PASS |
| A32 | Files to change — auth feature | middleware + jwt + sibling tests | apps/last-loop-lepin/api/src/auth/ | controller, middleware, jwt, repository, service, schema + 6 sibling tests | PASS |
| A33 | Files to change — media feature | controller/service/s3 + sibling tests | apps/last-loop-lepin/api/src/media/ | controller, service, s3 + 3 sibling tests | PASS |
| A34 | Files to change — helpers (geo/gpx/sun) | `<topic>.core.ts` + `.test.ts` | apps/last-loop-lepin/api/src/helpers/ | 3 subdirs each with `.core.ts` + `.core.test.ts`; coverage 100 % | PASS |
| A35 | Files to change — `__test/` controller | `test-seed.controller.ts` + `.test.ts` | apps/last-loop-lepin/api/src/__test/ | both files present | PASS |
| A36 | Files to change — database client + migrations | client + schema barrel + migrations dir | apps/last-loop-lepin/api/src/database/ | client.ts + client.test.ts + schema.ts + migrations/0000_initial.sql + migrations.audit.test.ts | PASS |
| A37 | Files to change — CDK stack | `cdk/lib/stack.ts` + `cdk/test/stack.test.ts` | apps/last-loop-lepin/cdk/lib/stack.ts + cdk/test/stack.test.ts | both present, 3 passing assertions | PASS |
| A38 | Files to change — test scenarios | `test/setup-postgres.ts`, `test/fixtures.ts`, `test/race-scenarios/race-day-2026.test.ts` | apps/last-loop-lepin/test/ | all 3 present + `database-utils.ts` helper | PASS |
| A39 | Files to change — `.github/path-filters.yml` updated | new filter `last-loop-lepin` | .github/path-filters.yml:20 | `last-loop-lepin: 'apps/last-loop-lepin/**'` | PASS |
| A40 | Files to change — commitlint scope-enum | scope `last-loop-lepin` added | commitlint.config.js:8 | `'borso-fr', 'borsouvertures', 'last-loop-lepin', 'infra', 'ci', 'docs', 'deps'` | PASS |
| A41 | Files to change — CLAUDE.md mentions workspace + extends gate to `.core.ts` | both clauses present | CLAUDE.md:27 + line 39 | scope-enum line includes `last-loop-lepin`; "Clean code" section adds the `.core.ts` clause as the plan promised | PASS |
| A42 | DB schema — no `defaultNow()` on business columns | only `created_at` audit columns | apps/last-loop-lepin/api/src/database/migrations.audit.test.ts:20-25,55-72 | whitelist = `editions.created_at`, `loop_punches.created_at`, `manual_dnfs.created_at`, `auth_attempts.created_at`; test reads SQL artifact and fails on violation | PASS |
| A43 | DB schema — `loop_punches` finished_at/corrected_at/voided_at written explicitly | service code calls `new Date()` | apps/last-loop-lepin/api/src/punch/punch.controller.ts:26,47,58 | `registerPunch(getDatabase(), input, new Date())`, `correctPunch(... new Date(finishedAt), new Date())`, `voidPunch(... new Date())` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Names carry intent (no abbreviations) | `setup-postgres.ts`, `runner.repository.ts`, `database/`, no 1-letter locals outside `for` | `find apps/last-loop-lepin -name 'setup-*'` returns `setup-postgres.ts` (not `setup-pg.ts`); identifiers in core files (e.g. `accumulator`, `candidate`, `displayName`, `sunriseUtcHours`) | PASS |
| B02 | Magic numbers extracted | named consts visible everywhere | `CORRECTION_BANNER_TTL_MS = 60_000`, `TICK_INTERVAL_MS = 1_000`, `ADMIN_COOKIE_TTL_SECONDS = 12 * 60 * 60`, `MILLISECONDS_PER_HOUR`, `MIN_SLUG_LENGTH`, `MAX_SLUG_LENGTH` etc. | PASS |
| B03 | Comments are WHY only — no what-comments | spot-check across `clock-store.ts`, `migrations.audit.test.ts`, `vitest.workspace.ts`, controllers | every comment cites a constraint (audit-whitelist rationale, useEffect avoidance, single-fork postgres race, streaming deferral) | PASS |
| B04 | Function names describe result | `computeStandings`, `projectDnfCandidates`, `parseGpx`, `initialsAvatar`, `nextHourlyTop`, `isRaceEndReached`, `resolveTieByLastLoop`, `computeSunriseSunset`, `slugifyDisplayName`, `freshDatabase`, `truncateAllTables` | descriptive across the diff | PASS |
| B05 | Type assertions limited to `as const` / `as unknown` | `grep -n 'as [A-Z]'` excluding tests | only 4 hits, all inside comments documenting the rule, not actual assertions | PASS |
| B06 | No `any` | `grep -nP '\bany\b'` excluding tests | 2 hits, both in code comments ("any local Postgres", "before any correction"), not type annotations | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | spot-check migrations.audit.test.ts:40-47 | `const tableName = match[1] ?? ''; const body = match[2] ?? '';` — fallbacks in place; `pnpm typecheck` exits 0 (strict mode) | PASS |
| B08 | Biome lint clean | `pnpm exec biome lint apps/last-loop-lepin` | `Checked 102 files in 1533ms. No fixes applied.` — exit 0 | PASS |
| B09 | `useEffect` smell | `grep -rn 'useEffect' apps/last-loop-lepin/site/src/` | zero hits in code; only 3 hits inside comments that explicitly justify the *absence* of useEffect (clock-store.ts:4, useStandingsPoll.ts:6, CorrectionBanner.tsx:22) — pattern is `useSyncExternalStore` everywhere clock/data is read | PASS |
| B10 | `.core.ts` files don't call clock-time `new Date()` | grep on `*.core.ts` | `new Date()` appears only inside `edition.core.ts` and `sun.core.ts`, used to **construct** dates from numeric calculations (epoch arithmetic), never to read the current clock. All `now` values are received as arguments. | PASS |
| B11 | No `.defaultNow()` outside whitelist | grep + audit test | only `created_at` columns use `defaultNow()`; business timestamps (`finished_at`, `corrected_at`, `voided_at`, `decided_at`, `sunrise_at`, `sunset_at`, `starts_at`, `ends_at`) are written explicitly by services. `migrations.audit.test.ts` enforces this against the committed SQL. | PASS |
| B12 | No hardcoded mockup dimensions (placeholder km/D+) | `grep '5\.8\|184\|250'` in site/src | zero hits — values come from server state, fallback `null` handled | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/last-loop-lepin | `pnpm --filter @borso-app/last-loop-lepin run test:core` | 0 — 10 files, 120 tests, gate A coverage thresholds (100/100/100/100 perFile) on `**/*.core.ts` + `**/*.utils.ts` met | PASS |
| C02 | @borso-app/last-loop-lepin | `pnpm --filter @borso-app/last-loop-lepin run test` (gate B back-e2e, testcontainer-less local-postgres harness) | 0 — 31 files, 198 tests; coverage threshold deliberately disabled on this gate per `vitest.workspace.ts:70-76` and matches the brief's policy note ("back-e2e coverage policy unchanged, deferred to follow-up") | PASS |
| C03 | @borso-app/last-loop-lepin | `pnpm --filter @borso-app/last-loop-lepin run typecheck` (tsc cdk + tsc app) | 0 — clean | PASS |
| C04 | repo-wide biome | `pnpm exec biome lint apps/last-loop-lepin` | 0 — 102 files checked, no findings | PASS |
| C05 | Sibling `*.utils.ts` / `*.core.ts` coverage | every `*.utils.ts` + `*.core.ts` has a sibling `*.test.ts` | 1 utils file (`initials.utils.ts`) + 7 core files (`edition`, `geo`, `gpx`, `sun`, `punch`, `ranking`, `runner`) — all have sibling `.test.ts`, all picked up by gate A | PASS |

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
| D10 | `POST /api/admin/punches` — registers + double-pointage 409 | `punch.controller.test.ts` (4 tests, including conflict path) + `app.test.ts` + race-scenario | PASS |
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

- The brief flagged previous report's A25-A33 (missing sibling .test.ts files, missing `CorrectionBanner.tsx`, missing `runner.core.ts`) and D10-D20 as FAIL. All are now verified PASS — sibling tests, the component, and the runner core file are present and exercised. Commit `56f1ac3 test(last-loop-lepin): sibling test suites for every layer + correction-banner` addresses the previous FAILs directly.
- Gate B coverage threshold is deliberately disabled in `vitest.workspace.ts:70-76` ("v1 ships the testcontainer harness + race-day-2026 scenario + audit tests; per-feature integration tests scheduled in a follow-up PR labelled `kaizen`"). The brief explicitly accepts this policy ("100 % back-e2e coverage policy unchanged, deferred to follow-up"). Gate A (the `.core.ts` + `.utils.ts` 100 % gate) is enforced and green.
- The spec mentions `awslambda.streamify`; the plan documents a known mismatch (LambdaApi uses APIGW HTTP API which does not support streaming) and defers to a future PR. Current code uses `handle(app)` from `hono/aws-lambda`. Flagged here for transparency only — accepted in plan.
- `borsouvertures` workspace also lands in this branch (one Vite + React app, frontend-only, no DB). It is outside this validation's scope (different feature, no spec under `docs/features/`). All its `*.utils.ts` files have matching sibling `.utils.test.ts`; the workspace's tests are not exercised by this report's runs.

## Verdict: PASS
