# Plan — Last Loop Lépin · race day live

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md) and the Claude Design hand-off at [`../spec/mockups/`](../spec/mockups/). When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either named the risk and we missed mitigating it, didn't name the risk at all (planning gap), or named it correctly and the defect comes from elsewhere.

**Scope v1 (confirmed 2026-05-12).** Full-stack: Vite + React frontend, Hono-on-Lambda API, DSQL persistance, CDK deploy via `PreviewableApp`. The Claude Design prototype is the visual target; we recreate its surfaces in a real workspace and wire them to the backend in one shot.

**Pattern Coherence pass.** `apps/last-loop-lepin/` is a brand-new workspace — nothing to inherit. The repo's two existing apps both use plain `useState` (no zustand, no Redux, no machine library). We stay on `useState` / `useReducer` / `useSyncExternalStore`, no global store dep. The Hono-on-Lambda pattern is *referenced* by `LambdaApi`'s docstring but **not yet shipped anywhere in the repo** — this app is the first consumer; the dep lands here, intentionally, and `borsouvertures` / `borso-fr` stay frontend-only as before. Tweak-panel + edit-mode artefacts from the prototype are **dropped** (design-tool affordances, not product).

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Layout | New workspace `apps/last-loop-lepin/` | `apps/last-loop-lepin/{package.json,site/,api/,cdk/,db/,bin/app.ts,vite.config.ts,vitest.config.ts,tsconfig.json,tsconfig.cdk.json,biome.jsonc,cdk.json,.gitignore,README.md,commitlint.config.js}` | `pnpm install` from repo root succeeds; `pnpm --filter @borso-app/last-loop-lepin run dev` opens Vite |
| CLAUDE.md *Layout* | App listed in monorepo conventions | `CLAUDE.md` Layout section gets the new app slug | grep `last-loop-lepin` in `CLAUDE.md` returns ≥ 1 hit |
| CI/CD | Workflows discover the new app | `.github/path-filters.yml` adds `last-loop-lepin: 'apps/last-loop-lepin/**'`; `commitlint.config.js` scope-enum adds `last-loop-lepin`; `knip.json` adds the workspace block | `pnpm exec knip` exits 0; preview workflow detects changes when `apps/last-loop-lepin/` is touched |
| Q.O.D. *Domaine* | `last-loop-lepin.borso.fr` | `bin/app.ts` passes `domainName: 'last-loop-lepin.borso.fr'` when stage=prod | `cdk synth --all` shows the alias |
| Q.O.D. *Cycle de vie* | 24/7 + archives | Frontend route `/` is the *hors-jour-J* shell that conditionally renders the live dashboard based on the API's `edition.status` | Default state = "BEFORE" shell with hero + facts + GPX preview |
| Q.O.D. *Persistance* | DSQL per-app cluster | `cdk/src/stack.ts` instantiates `DsqlClusterStack` + `PreviewableApp` with `database: { migrationsPath: './db', cluster }` | `cdk synth --all` produces two stacks: cluster + app |
| DB schema | 4 tables (editions, runners, loop_punches, manual_dnfs) | `db/0001_initial.sql` with the spec's DDL verbatim | `DsqlSchema` construct picks it up; migration digest stable |
| Q.O.D. *Auth orga* | PIN partagé, rate-limit 5 / 5 min par IP | `api/src/handlers/admin/auth.ts` — token-bucket in DSQL or in-memory-per-Lambda; PIN compared via `crypto.timingSafeEqual` against `PIN_HASH` env (Argon2id at setup time) | Posting wrong PIN 5× from same IP returns 429 within 5 min |
| Q.O.D. *Format de fin* | Couperet net à `endsAt`, départage par ordre d'arrivée sur la dernière boucle commune | `site/src/domain/leaderboard.utils.ts` (`computeLeaderboard`, `resolveTieByLastLoop`) + `api/src/utils/race-end.utils.ts` (server-side authoritative finalisation) | Unit tests cover: single-survivor before endsAt; tie at endsAt; ms-level departage |
| Q.O.D. *Bornes saisies* | `startsAt`/`endsAt` saisies ; `sunriseAt`/`sunsetAt` calculés | `domain/sun.utils.ts` (pure NOAA-formula port; no `suncalc` dep — too heavy for what we need) ; `api/src/handlers/admin/edition.ts` computes them server-side at edition creation, stores them in `editions` row | Unit tests on `computeSunriseSunset` (été / hiver / DST transition) |
| Q.O.D. *Élimination DNF* | Semi-auto au top horaire | `site/src/domain/dnf.utils.ts` (`projectDnfCandidates`) is pure ; admin UI lists candidates, orga confirms via `POST /admin/dnf` | `projectDnfCandidates` returns the runners not punched for the current loop after `nextHourlyTop` is in the past |
| Q.O.D. *Corrections* | Libres + journalisées publiquement (banner 60 s) | `loop_punches.corrected_at` + `voided_at` columns ; `GET /state` includes a `recentCorrections` array (last 60 s) ; `site/src/components/CorrectionBanner.tsx` reads it | Unit: a punch with `correctedAt` < 60 s ago shows in the banner array ; > 60 s does not |
| Q.O.D. *Fiche coureur readonly* | `/r/<slug>` publique sans token | Frontend route, server endpoint `GET /runners/:slug/fiche` returns the same DTO as the spectator computation, filtered to one runner | Hit `/r/jean-dupont` directly with no session → page renders |
| Q.O.D. *Source du tracé* | GPX upload | `site/src/domain/gpx.utils.ts` (pure parser ; Haversine distance ; D+ with anti-bruit threshold ; extracts `startLatLng`) ; `api/src/utils/gpx-parse.utils.ts` (mirror, server-side validation) | Unit: minimal valid GPX, multi-track, missing-elevation, malformed |
| Q.O.D. *Photo manquante* | Fallback initiales sur fond couleur déterministe | `site/src/domain/initials.utils.ts` (`initialsAvatar`) — hash → hue in oklch space ; `RunnerAvatar` component | Unit: same name → same hue across runs ; one-word / two-words / accents |
| Spec *Use cases · happy path* étape 3 | Compte à rebours visible sur la home en live | `Countdown` component subscribes to wall clock via `useSyncExternalStore` (no `useEffect` smell — CLAUDE.md *Clean code*) | Sur la home en mode live, le compteur décrémente à la seconde |
| Spec *Use cases · happy path* étape 6 | Détection automatique de fin de course | Edge function check at `state` endpoint : if `now >= endsAt OR inRace.length <= 1` then `edition.status = 'finished'` (idempotent) ; client polls `state` every 2 s | Unit on `isRaceEndReached(edition, now)` ; integration: posting punches past endsAt is rejected |
| Spec *Edge case · 4G inégale* | Optimistic UI sur pointage | Admin punch button optimistically toggles local state ; reconciles on 2xx ; on 5xx / 409 the UI shows "réseau perdu, retry en cours" ; idempotency key on POST punch | Manual: throttle network in DevTools, click punch ; tile becomes punched immediately, then settles |
| Spec *Edge case · conflit 409* | Server-side first-wins, second 409 | `POST /admin/punches` uses a unique constraint `(edition_slug, runner_slug, loop_index, voided_at IS NULL)` ; on conflict, return 409 with the existing punch payload | Unit on the route handler with a duplicate insert ; UI shows "déjà pointé à HH:MM:SS" |
| Spec *Test strategy · `*.utils.ts`* | 100 % coverage gated | `vitest.config.ts` mirrors `apps/borso-fr/vitest.config.ts` thresholds 100/100/100/100 ; both `site/**/*.utils.ts` and `api/**/*.utils.ts` are covered (single Vitest run for the workspace) | `pnpm --filter @borso-app/last-loop-lepin run test:coverage` exits 0 |
| Spec *Test strategy · visual-validation* | `/visual-validation` after impl | `pnpm dev` starts a single port serving the SPA + a mock API (`vite.config.ts` adds a `server.proxy` rule pointing at the local Lambda handler via `@hono/node-server`) ; the visual-validation agent drives this URL | `pnpm dev` opens and the spectator route renders mock data without manual setup |
| Spec *Production strategy · Sentry* | Frontend Sentry + 4 named errors + 4 analytics events | `site/src/observability/sentry.ts` (init guarded by DSN env var so dev runs noisy-free) ; named errors as classes in `site/src/observability/errors.ts` ; `site/src/observability/events.ts` exposes `track(eventName, payload)` that goes to Sentry breadcrumbs in v1 (no separate analytics vendor) | grep `Sentry.init` returns one entry ; events fire on the listed paths |
| Design *Spectator 4-up* | Grid: leader, count, map, wall | `site/src/routes/SpectatorPage.tsx` mirrors the prototype's `spec-grid` CSS exactly | Visual: layout matches mockups/project/pages/spectator.jsx in dimensions, gaps, breakpoints |
| Design *Home* | Hero + facts + timeline + roster + footer | `site/src/routes/HomePage.tsx` ; data sourced from `GET /state` (edition + runners) ; pre-GPX state shows "Tracé à venir" | Visual: matches home.jsx; both pre-race and live banners render |
| Design *Admin console* | PIN gate → 3 tabs (punch / cut-off / log) | `site/src/routes/AdminPage.tsx` ; auth state lives in a cookie set by the PIN endpoint ; the punch grid is a list of `<button>` tiles, one per runner ; optimistic toggle | Visual: matches admin.jsx ; cookie expires after 12 h |
| Design *Fiche coureur* | Sidebar runner list + hero + stats | `site/src/routes/RunnerFichePage.tsx` ; URL `/r/<slug>` ; selecting another runner in sidebar updates URL via `pushState` | Visual: matches runner-fiche.jsx ; direct URL navigation works |
| Design *Setup* | Edition setup (GPX upload, runners CRUD, sunrise/sunset readout) | `site/src/routes/SetupPage.tsx` ; protected by the same admin cookie ; upload form posts multipart to `/admin/editions` then `/admin/runners` | Visual: matches setup.jsx |
| Design *Tweak panel* | **Dropped** — design-tool affordance | Removed during port ; only one aesthetic ships (`scoreboard` is the default, see *Open questions*) | grep `data-aesthetic` returns at most CSS, no JS toggle |
| Design *Countdown 3 styles* | Pick one for v1 ; the other two are dead code | We ship `bar` (most readable on small screens, mobile-first admin) ; `ring` and `split-flap` are dropped ; revisit if user requests | One countdown component, no style prop |
| Design *Course map sun gutter* | Sunrise/sunset markers on map | `site/src/components/CourseMap.tsx` includes a side gutter that positions sunrise/sunset on a same-day timeline (no overnight band) | Visual: gutter top = startsAt, bottom = endsAt ; sunrise tick within range ; sunset tick within range |
| CLAUDE.md *useEffect is a smell* | Avoid `useEffect` outside genuine external-state sync | Wall clock via `useSyncExternalStore` ; `state` polling via a custom `useEdgeState()` hook that owns its own SWR-style fetcher ; PIN form has no effects | grep `useEffect` in `site/src/` — every remaining effect is justified in a comment |
| CLAUDE.md *no-type-assertion plugin* | Only `as const` / `as unknown` | All narrowing via type guards (`isRunnerStatus`, `isEdgeState`, `isGpxFile`) | `pnpm exec biome lint` passes |
| CLAUDE.md *no JSDoc on internals* | JSDoc only on exported `*.utils.ts` API | Verify in self-check | grep `/**` outside `*.utils.ts` & shared types returns nothing |

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
| **First repo consumer of `PreviewableApp`** — the construct hasn't been deployed end-to-end yet | **high** | Land an integration test in `apps/last-loop-lepin/cdk/test/synth.test.ts` that runs `cdk synth --all` and asserts on the produced template ; deploy to preview ASAP on the PR | Preview workflow fails or the synthesized template is missing a stack ; deploy job logs |
| **First Hono-on-Lambda in this repo** — bundling, cold-start, env wiring not battle-tested | **high** | Pin Hono via `pnpm add hono`, use `aws-lambda-router` style export `export const handler = lhandler` ; bundle via `LambdaApi`'s NodejsFunction (esbuild) ; smoke-test the handler locally with `@hono/node-server` in `pnpm dev` | `pnpm --filter ... run test` covers the handler ; preview API responds 200 on `/health` |
| **DSQL `DsqlSchema` digesting migration on first deploy** | **high** | The single `db/0001_initial.sql` lands all 4 tables in one shot, idempotent (`CREATE TABLE IF NOT EXISTS`) ; the construct's migration runner handles deterministic ordering | Preview deploy succeeds first time ; on rerun, no schema drift |
| Sunrise/sunset NOAA-formula port is wrong near DST transitions | medium | Tests cover 21 March / 22 September (equinoxes), 21 June / 21 December (solstices), and 26 October 2026 (FR DST→CET) ; cross-check against `https://aa.usno.navy.mil/data/RS_OneDay` for Lépin-le-Lac lat/lng | Unit tests fail ; manual verification at edition setup |
| GPX parser blows up on edge file shapes | medium | Test fixtures committed under `site/src/domain/__fixtures__/*.gpx` for: minimal, multi-track, no-elevation, malformed (Open question Q1 — what tags we accept) | Unit tests at 100 % coverage ; admin upload shows "GPX invalide" message on malformed |
| Coverage gate trips on initial scaffolding (helpers not yet 100 %) | medium | Plan does not allow a "TODO: cover later" — every `*.utils.ts` row lands with its `*.utils.test.ts` row in the same commit | `pnpm test:coverage` exits 0 on first push ; CI confirms |
| Sentry DSN leaked to public client bundle | low | DSN is only embedded if `VITE_SENTRY_DSN` is set ; preview uses a separate DSN from prod ; never commit a `.env` | Inspect built bundle ; sentry-cli source-map upload is the only place the prod DSN appears |
| Wall-clock subscription leaks between routes | low | `useSyncExternalStore` with a single module-scoped store (`createWallClockStore()`) → 1 interval shared across all subscribers ; auto-cleanup | DevTools timeline ; only 1 setInterval handle live |
| Optimistic punch desync (server rejects after the UI updated) | medium | Punch tile shows a "syncing" sub-state until 2xx ; on 4xx/5xx, the UI rolls back + shows an inline error ; idempotency key prevents double-punch on retry | E2E via /visual-validation: throttle network, click punch, see syncing state then commit |
| Spec drift on dimensions resurfaces in code (placeholder km/D+ in JSX) | medium | Per the user's decision, **all distance/D+/photo data flows from server state** — no hardcoded numbers in TSX ; pre-GPX home shows "Tracé à venir" | grep for `184|6.706|5.8|250` in `site/src/` returns nothing outside fixtures |
| Tweak-panel artefacts leak into production (`data-aesthetic`, `__edit_mode`, tweak state) | medium | Strip during port ; only the chosen aesthetic's CSS variables ship under `:root` | grep `data-aesthetic` outside CSS, `__edit_mode`, `useTweaks` returns nothing in `site/src/` |
| 100 % coverage gate too strict for `*.utils.ts` doing real RNG/time | low | Helpers that need *time* take a `now: Date` parameter (no `new Date()` inside) ; helpers that need *RNG* take a seed | Coverage report ; no `/* v8 ignore */` in source |
| CloudFront cache hides admin write effects (state still cached) | medium | `GET /state` shipped with `Cache-Control: max-age=2, stale-while-revalidate=10` ; admin writes return the new state in the response so the UI doesn't wait for the cache | Client polls every 2 s and sees the update within 2 s of write |
| Knip flags new files because nothing imports them | low | Knip workspace block for `last-loop-lepin` lists `bin/app.ts`, `site/src/main.tsx`, `api/src/main.ts`, `**/*.utils.test.ts` as entries | `pnpm exec knip` exits 0 pre-push |
| `infra/cdk/**` not touched but coverage gate fires anyway | low | We do not modify `infra/cdk/**` ; if we end up needing to (e.g. PreviewableApp bugfix), call out the 100 %-line gate in the diff | Pre-commit hook ; if it triggers, separate PR for the infra fix |

## Code-quality self-check

- [ ] `pnpm exec biome lint` passes (including the `no-type-assertion-except-unknown` plugin).
- [ ] Only `as const` / `as unknown` casts. Narrowing via type guards (`isRunnerStatus`, `isEdgeState`, `isGpxFile`).
- [ ] No `any` anywhere — `pnpm typecheck` clean with `strict: true` and `noUncheckedIndexedAccess: true`.
- [ ] No single-letter locals outside `for (let i …)` (CLAUDE.md *Clean code*).
- [ ] Magic numbers extracted to named constants: `STATE_POLL_INTERVAL_MS`, `WALL_CLOCK_TICK_MS`, `CORRECTION_BANNER_TTL_MS`, `LOOP_INTERVAL_MINUTES`, `PIN_RATE_LIMIT_WINDOW_MS`, `PIN_RATE_LIMIT_MAX_ATTEMPTS`, `GPX_ELEVATION_NOISE_THRESHOLD_M`, `STATE_CACHE_MAX_AGE_S`, `STATE_CACHE_STALE_WHILE_REVALIDATE_S`, `ADMIN_COOKIE_TTL_S`, `OPTIMISTIC_PUNCH_RECONCILE_TIMEOUT_MS`.
- [ ] Magic strings extracted: route names, status enums, analytics event names, error class names — all typed unions or named consts.
- [ ] Comments only document non-obvious WHY. No restatement of code, no PR-narrative comments, no "// added by Claude".
- [ ] No JSDoc on internals ; JSDoc allowed on exported `*.utils.ts` API + on shared types in `domain/types.ts`.
- [ ] Function names describe the result: `computeLeaderboard`, `projectDnfCandidates`, `parseGpx`, `initialsAvatar`, `nextHourlyTop`, `isRaceEndReached`, `resolveTieByLastLoop`, `computeSunriseSunset`.
- [ ] Pure helpers in `*.utils.ts` paired with `*.utils.test.ts` at 100 % coverage. Files: `site/src/domain/{gpx,sun,leaderboard,timing,dnf,initials}.utils.ts`, `api/src/utils/{gpx-parse,race-end,rate-limit,pin}.utils.ts`.
- [ ] `useEffect` smell ban: every effect in the diff is justified in a comment. Default to `useSyncExternalStore` / event handlers / derived state.
- [ ] Tweak-panel / edit-mode artefacts from the design prototype dropped (no `data-aesthetic` runtime toggle, no `__edit_mode_*` postMessage, no `useTweaks`).

## Pre-flight gates

Run, in order, before push:
1. `pnpm install` — new deps land (Hono, `@aws-sdk/client-dsql-data`, `@fontsource/inter`, `@fontsource/space-grotesk`, `@fontsource/jetbrains-mono`, `@sentry/react`, `argon2`, `zod`).
2. `pnpm --filter @borso-app/last-loop-lepin typecheck` — TS clean (site + api + cdk).
3. `pnpm exec biome lint` — root config; per-app biome.jsonc enables the type-assertion plugin.
4. `pnpm --filter @borso-app/last-loop-lepin test:coverage` — every `*.utils.ts` at 100 % statements / branches / functions / lines.
5. `pnpm --filter @borso-app/last-loop-lepin build` — Vite build succeeds; `dist/` is populated.
6. `pnpm exec knip` — no unused entries.
7. `/visual-validation docs/features/last-loop-lepin/race-day-live/spec/spec.md` — verdict PASS (drive the running dev server).
8. `/technical-validation docs/features/last-loop-lepin/race-day-live/spec/spec.md` — verdict PASS.

## Open questions / unknowns

- **GPX parser scope.** The spec lists "GPX malformé" as an error case but doesn't enumerate tags we must accept. Plan accepts: GPX 1.1, `<trk><trkseg><trkpt lat lon><ele>?</ele></trkpt>...`. Multi-`<trk>` files are flattened in document order. `<rte>` (route, not track) and `<wpt>` (waypoints) ignored.
- **Which aesthetic ships v1.** Design proposed scoreboard / topographic / telemetry. Plan defaults to **scoreboard** (the design's own default; dark+vivid; best legibility on a phone in sunlight). User can flip in a follow-up PR.
- **PIN storage format.** Plan goes with Argon2id hash in env var (`PIN_HASH`). Alternative: SSM SecureString fetched at cold start. SSM round-trip cost vs env-var deploy is < 100 ms ; chose env-var for simplicity. Revisit if PIN rotation cadence increases.
- **State polling vs SSE/WebSocket.** Plan goes with 2 s polling + CloudFront cache. SSE would halve mean propagation but adds infra surface (long-lived Lambda). v1 ships polling; revisit if input metric `p90 < 2 s` is missed in the first edition.
- **`PreviewableApp` first real use** may surface construct bugs. Mitigation rests in the risk register ; this is a known landing-strip risk for any new construct.
- **Sentry vs Plausible/Posthog** for the 5 analytics events. Plan uses Sentry breadcrumbs (no extra vendor) for v1. If product wants funnels, add a real analytics dep in a follow-up.

## Missing technical skills

These would have helped this plan and don't yet exist under `.claude/skills/`. Seed them next:
- `/vite` — multi-page Vite config, fontsource, env var conventions, dev-server proxy.
- `/react` — `useSyncExternalStore` patterns, `useEffect` ban enforcement, route-state-in-URL conventions.
- `/hono` — Lambda handler conventions, route grouping, error class → HTTP status mapping.
- `/cdk-app` — `PreviewableApp` wiring, `DsqlCluster` cross-stack reference, stage/preview routing, env validation helpers.
- `/dsql` — `DsqlSchema` migration digest, IAM grant pattern, `@aws-sdk/client-dsql-data` query helper.
- `/observability` — Sentry init shape, named error class pattern, breadcrumb-vs-event guidelines, sourcemap upload during deploy.
