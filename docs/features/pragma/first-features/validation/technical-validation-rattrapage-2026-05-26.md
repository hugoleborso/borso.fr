# Technical-validation rattrapage — rounds 7 → 17c

Catch-up pass after the orchestrator stopped invoking validation between rounds 7 and 17c. The branch was just rebased on `origin/main` (160 commits ahead). I did not consult any per-round verdict YAML except as cross-references — each row below was re-derived from the diff against the spec, the plan, and the brief's explicit "claim ≠ reality" suspicions (Round-13 optimistic, Round-10 SPA fallback, Round-15 i18n typing). The orchestrator's prior "PASS" stamps were treated as untrustworthy by construction.

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: `claude/pragma-erp-specification-k41Mg`
- HEAD: `3e163e2`
- Base: `origin/main` (rebased; +449 files, +31 125 / −702 LOC)
- Run at: 2026-05-25T23:55:00Z
- Touched workspaces: `@borso-app/pragma`, `@borso/infra`, root `.claude/skills/*`

Use-case routing for category D: every numbered happy-path step under spec _Use cases_ is routed to `/visual-validation` (per the spec's _Test strategy_). Out of scope for this report — visual-validation rows are _not_ mirrored here.

## TL;DR

**Verdict: FAIL.** Body of work is overwhelmingly clean (every per-round suspicion the brief flagged held up, all tests / typecheck / build / coverage gates green, optimistic-onMutate audit comes out PASS across all 11 query files, i18n type augmentation correct, SPA fallback list correct, `asyncifyIndex` composition correct, no `jsonb`, no `any`, no horizontal aggregators) **— but** `pnpm exec biome check` (the repo's actual pre-commit gate, lint + format + organizeImports) reports **125 diagnostics across 16 source files**. The brief asked the validator to run `biome lint` and that _does_ pass (the lint rules are clean). The composite `biome check` does not, and the pre-commit hook runs `check`, not `lint` — meaning **a fresh commit on this branch is rejected by Husky today**. This is a strict FAIL of category B / C04: code that isn't pre-commit-clean cannot land. Fix is mechanical (`pnpm exec biome check --write`); has to ship before the PR can go up.

## A. Spec correctness

| #   | Spec ref                                                             | Claim                                                                                                                                                                 | File:line                                                                                                                                                                                                                               | Verdict |
| --- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| A01 | Q.O.D. _App-workspace slug = `pragma`_                               | New full-stack workspace under `apps/pragma/{site,api,cdk}`                                                                                                           | `apps/pragma/package.json` (name `@borso-app/pragma`); `apps/pragma/{site,api,cdk}/` all present                                                                                                                                        | PASS    |
| A02 | Q.O.D. _Auth model = shared password_                                | Hono middleware verifies signed HMAC cookie + argon2id; rate-limited 5/15 min per `ip_hash`; bootstrap + rotate endpoints                                             | `apps/pragma/api/src/auth/shared-password.middleware.ts`, `apps/pragma/api/src/auth/auth.controller.ts`, `apps/pragma/api/src/auth/rate-limit.utils.ts`                                                                                 | PASS    |
| A03 | Q.O.D. _Concurrency = LWW_                                           | Plain PUTs replace row wholesale; offline UI blocks mutations                                                                                                         | controllers issue Drizzle `update().set(...)` patches with no version column; `AppShell.tsx:77` exposes `online` state via `window.addEventListener('online'/'offline')`                                                                | PASS    |
| A04 | Q.O.D. _Mastery matrix = hybrid_                                     | `mastery_default` + sparse `mastery_override`; `effective = override ?? default`                                                                                      | `apps/pragma/api/src/mastery/mastery.core.ts`; `mastery.schema.ts` shows `masteryDefaultTable` and `masteryOverrideTable` with the spec'd uniques                                                                                       | PASS    |
| A05 | Q.O.D. _Transition warning_                                          | Pair warns iff no `isHarmonic` instrument held by same member across both                                                                                             | `apps/pragma/api/src/setlists/transition.core.ts` (table-driven test in `transition.core.test.ts`)                                                                                                                                      | PASS    |
| A06 | Q.O.D. _Transition comment locus = global per ordered pair_          | One row per `(songA, songB)`; unique index on the ordered pair                                                                                                        | `apps/pragma/api/src/transitions/transitions.schema.ts:16` has `comment`; unique on `(song_a_id, song_b_id)` via migration                                                                                                              | PASS    |
| A07 | Q.O.D. _Accent color = blue_                                         | `--accent` token in tokens.css                                                                                                                                        | `apps/pragma/site/src/styles/tokens.css` (sole CSS file under `site/src`)                                                                                                                                                               | PASS    |
| A08 | Q.O.D. _Offline cache scope = next session only_                     | SW caches catalog + 3 chart formats + next-future-session setlist                                                                                                     | `apps/pragma/site/public/sw.js` present; manifest endpoint registered in `app.ts`                                                                                                                                                       | PASS    |
| A09 | Q.O.D. _Energy viz = sparkline_                                      | `*.core.ts` smoother + React sparkline                                                                                                                                | `apps/pragma/api/src/setlists/energy-curve.core.ts`; `apps/pragma/site/src/components/molecules/EnergySparkline.tsx`                                                                                                                    | PASS    |
| A10 | Q.O.D. _Chord chart formats_                                         | Discriminated union persisted as text + Zod-parsed                                                                                                                    | `apps/pragma/api/src/songs/songs.schema.ts:27` `chart: text('chart')`; Zod variant union under `songs.schema.ts`                                                                                                                        | PASS    |
| A11 | Q.O.D. _Embeds = iframes_                                            | URL → provider detection                                                                                                                                              | `apps/pragma/site/src/lib/embed.utils.ts` + `embed.utils.test.ts`                                                                                                                                                                       | PASS    |
| A12 | Q.O.D. _Code language = English_                                     | All identifiers EN                                                                                                                                                    | sampled 12 files; no French identifiers landed                                                                                                                                                                                          | PASS    |
| A13 | Q.O.D. _User-facing language = FR + EN_                              | `react-i18next`; key parity gated                                                                                                                                     | `apps/pragma/site/src/i18n/{i18n.ts,en.json,fr.json,i18n-parity.core.ts}`                                                                                                                                                               | PASS    |
| A14 | Spec _Files to change_ → `apps/pragma/site/src/i18n/`                | `react-i18next.d.ts` augments **`i18next`** (not `react-i18next`), `CustomTypeOptions.resources.translation = typeof en`                                              | `apps/pragma/site/src/i18n/react-i18next.d.ts:18` `declare module 'i18next' { interface CustomTypeOptions {…} }`                                                                                                                        | PASS    |
| A15 | Spec _Files to change_ → `apps/pragma/cdk/`                          | Stack composes LambdaApi + StaticSite + DsqlCluster + DsqlSchema + uploads bucket                                                                                     | `apps/pragma/cdk/lib/stack.ts`; `cdk/test/stack.test.ts` (8 tests, all green)                                                                                                                                                           | PASS    |
| A16 | Spec _Files to change_ → `.github/path-filters.yml`                  | `pragma: 'apps/pragma/**'` filter                                                                                                                                     | diff confirms one added entry                                                                                                                                                                                                           | PASS    |
| A17 | Plan row _Round 10 — SPA fallback_                                   | CloudFront Function source includes `SPA_APPS = ['last-loop-lepin', 'pragma']` + asset-vs-route disambiguation via `lastDotSpa < lastSlashSpa`                        | `infra/cdk/src/internal/cf-host-routing-function.code.js:61` and 78–84 (verbatim)                                                                                                                                                       | PASS    |
| A18 | Plan row _Round 8 — asyncifyIndex_                                   | `asyncifyIndex` exists, composed in `splitStatements` with `makeIdempotent` + `stripUsingClause`; idempotent on already-`ASYNC` input                                 | `infra/cdk/src/internal/migration-runner/index.ts:151–168`                                                                                                                                                                              | PASS    |
| A19 | Plan row _Round 11 — uploads bounded context_                        | `uploads/` triad; only the repository imports the S3 SDKs; signed-PUT enforces ContentType + size cap (Zod)                                                           | `apps/pragma/api/src/uploads/uploads.repository.ts:11` imports `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`; no other file under `uploads/` does; `uploads.schema.ts:13` caps `contentLength` at `MAX_UPLOAD_BYTES`           | PASS    |
| A20 | Plan row _Round 7 — jsonb → text_                                    | All JSON columns declared as `text(...)`; comment + link to dsql-postgres-compat-gaps.md §1                                                                           | `apps/pragma/api/src/{songs,setlists,sessions}/{*}.schema.ts` — `friendsCountPerMember`, `lineupOverride`, `links`, `chart`, `defaultLineup`, `isrcs`, `tags` are all `text(...)`; **0 `jsonb(` occurrences in `apps/pragma/api/src/`** | PASS    |
| A21 | Plan row _Round 17a — sessions create dialog + delete_               | TanStack Form, `<input type="datetime-local">`, concert variant (venue+capacity+gear), practice variant with `preparedConcertId` dropdown filtered to future concerts | `apps/pragma/site/src/components/molecules/CreateSessionDialog.tsx:80,103`; `filterFutureConcerts` from `create-session-dialog.utils`                                                                                                   | PASS    |
| A22 | Plan row _Round 17a — delete with confirmation_                      | Trash icon per row, `stopPropagation`, confirm dialog                                                                                                                 | `apps/pragma/site/src/routes/sessions/SessionsPage.tsx:112–123` (trash button, `event.preventDefault();event.stopPropagation();setPendingDeletion(session.id)`); confirm dialog gated by `pendingDeletion !== null`                     | PASS    |
| A23 | Plan row _Round 13/17a/17b/17c — optimistic on every cache mutation_ | All `useMutation` exports that touch the cache have `onMutate` + `onError` rollback + `onSettled` invalidate                                                          | see Table B-onMutate below                                                                                                                                                                                                              | PASS    |
| A24 | Spec _Test strategy → core 100%_                                     | Every `*.core.ts` + `*.utils.ts` covered                                                                                                                              | `pnpm --filter @borso-app/pragma run test:core` → 42 files, 364 tests, exit 0                                                                                                                                                           | PASS    |
| A25 | Spec _Test strategy → back-e2e_                                      | Full CRUD on songs / setlists / sessions / bars; auth middleware; concurrency                                                                                         | `pnpm --filter @borso-app/pragma run test` → 11 files, 62 tests, exit 0                                                                                                                                                                 | PASS    |

## B. Code cleanliness

### Per-domain triad (Backend)

| Domain      | controller                                                                                                     | service | repository | schema | Verdict |
| ----------- | -------------------------------------------------------------------------------------------------------------- | ------- | ---------- | ------ | ------- |
| auth        | Y                                                                                                              | Y       | Y          | Y      | PASS    |
| bars        | Y                                                                                                              | Y       | Y          | Y      | PASS    |
| instruments | Y                                                                                                              | Y       | Y          | Y      | PASS    |
| mastery     | Y                                                                                                              | Y       | Y          | Y      | PASS    |
| members     | Y                                                                                                              | Y       | Y          | Y      | PASS    |
| sessions    | Y                                                                                                              | Y       | Y          | Y      | PASS    |
| setlists    | Y                                                                                                              | Y       | Y          | Y      | PASS    |
| songs       | Y                                                                                                              | Y       | Y          | Y      | PASS    |
| transitions | `transition-comments.controller.ts` (non-canonical name, but the only controller in the folder and namespaced) | Y       | Y          | Y      | PASS    |
| uploads     | Y                                                                                                              | Y       | Y          | Y      | PASS    |

No horizontal aggregator folders (`domain/`, `controllers/`, `services/`, `repositories/`, `routes/`) under `api/src/`. The two non-domain folders are `database/` (Drizzle client + migrations + schema barrel) and `auth/` (the bounded context for shared-password auth). Both are bounded contexts, not aggregators.

Drizzle imports outside `*.repository.ts` / `*.schema.ts`: `grep -rEn "from ['\"]drizzle-orm" apps/pragma/api/src/ | grep -v "\.schema\.ts:\|\.repository\.ts:\|database/"` → **0 hits**. PASS.

### `*.core.ts` time-injection rule

`grep -nE "new Date\(" apps/pragma/api/src/**/*.core.ts` → no direct `new Date()` inside core files; `now: Date` is a parameter where needed (e.g. `uploads.core.ts` builds keys from explicit input). PASS.

### Tailwind-only + atomic design (Frontend)

| Rule                     | Verdict | Evidence                                                                                                                                                                                   |
| ------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Only one CSS entry point | PASS    | `find apps/pragma/site/src -name "*.css"` → `apps/pragma/site/src/styles/tokens.css` (single file)                                                                                         |
| Atomic design buckets    | PASS    | `apps/pragma/site/src/components/{atoms,molecules,organisms}/` exclusively; no flat `components/`, no `ui/`, no `shared/`                                                                  |
| One-directional imports  | PASS    | `grep -rE "from ['\"](.*)?molecules/" apps/pragma/site/src/components/atoms/` → 0 hits; `grep -rE "from ['\"](.*)?organisms/" apps/pragma/site/src/components/{atoms,molecules}/` → 0 hits |

### Hono RPC (BE↔FE typing)

| Rule                            | Verdict          | Evidence                                                                                                                             |
| ------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| No hand-rolled `apiRequest`     | PASS             | `apps/pragma/site/src/lib/api.ts` exports `api = hc<typeof apiRouter>(...)`; every callsite reaches through `api.api.X.$method(...)` |
| Server response types inferred  | PASS             | `InferResponseType<typeof api.api.sessions.$get>` in `sessions.ts:10`, `bars.ts:21`, `mastery.ts:21`                                 |
| Raw `fetch(...)` in `site/src/` | 1 legitimate hit | `FileDrop.tsx` — direct PUT to a presigned S3 URL, not an API call                                                                   |

### TanStack Query — optimistic-onMutate audit (per-file)

| File             | Mutations                                                                                                          | All cache-touching ones have `onMutate` + `onError` rollback + `onSettled` invalidate                                                                               | Verdict |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `auth.ts`        | `useLogin` (no cache state)                                                                                        | n/a — no list/byId to roll back                                                                                                                                     | PASS    |
| `bars.ts`        | `useCreateBar`, `useUpdateBar`, `useDeleteBar`                                                                     | all 3 wired (`onMutate` snapshots `BarsListResponse`, `onError` restores, `onSettled` invalidates `barKeys.all`)                                                    | PASS    |
| `instruments.ts` | create / update / delete                                                                                           | all 3 wired                                                                                                                                                         | PASS    |
| `mastery.ts`     | `useSaveMasteryDefault`, `useDeleteMasteryDefault`                                                                 | both wired (`upsertDefault` helper preserves cache shape)                                                                                                           | PASS    |
| `members.ts`     | create / update / delete / `useAssignMemberInstruments`                                                            | all 4 wired                                                                                                                                                         | PASS    |
| `sessions.ts`    | `useCreateSession`, `useUpdateSession`, `useDeleteSession`                                                         | all 3 wired — `useCreateSession` injects a tempId via `crypto.randomUUID()` matching the SessionRow shape, `useUpdateSession` snapshots both `list` and `byId` keys | PASS    |
| `setlists.ts`    | `useCreateSetlist`, `useAppendSetlistEntry`, `useUpdateSetlistEntry`, `useDeleteSetlistEntry`, `useReorderSetlist` | `useCreateSetlist` documented skip (caller awaits server id for navigation, JSDoc on `:68`); other 4 wired with pure-helper transforms from `setlists.utils.ts`     | PASS    |
| `songs.ts`       | create / update / delete                                                                                           | all 3 wired                                                                                                                                                         | PASS    |
| `transitions.ts` | `useSaveTransitionComment`                                                                                         | wired (snapshots `transitionKeys.pair`, restores on error)                                                                                                          | PASS    |
| `uploads.ts`     | `useSignChartUpload`                                                                                               | n/a — no cache state (returns presigned URL, FE PUTs directly)                                                                                                      | PASS    |

This is the single highest-priority verification of the rattrapage. Round 13's "claimed but not shipped" failure mode is **not present in HEAD** — the post-round-17c branch ships optimistic on every legitimate target.

### TanStack Form

| Surface                   | Verdict | Evidence                                                            |
| ------------------------- | ------- | ------------------------------------------------------------------- |
| `Login.tsx`               | PASS    | `useForm({defaultValues, validators, onSubmit})` at L40             |
| `InstrumentsPage.tsx`     | PASS    | useForm at L46                                                      |
| `MembersPage.tsx`         | PASS    | useForm at L55                                                      |
| `SongEditForm.tsx`        | PASS    | useForm at L58                                                      |
| `BarForm.tsx`             | PASS    | useForm at L116                                                     |
| `ConcertEditForm.tsx`     | PASS    | useForm at L61                                                      |
| `SetlistEntryRow.tsx`     | PASS    | useForm at L88                                                      |
| `CreateSessionDialog.tsx` | PASS    | two `useForm` instances (concert + practice variants) at L80 + L103 |

`grep -rE "useState<string>" apps/pragma/site/src/routes/` returns only single-field uses (search boxes, modal local state) — no 6-field `useState` chains.

### TanStack Table

| Organism            | Verdict | Evidence                                                        |
| ------------------- | ------- | --------------------------------------------------------------- |
| `MasteryMatrix.tsx` | PASS    | `useReactTable` at L240, columns built via `createColumnHelper` |
| `BarsList.tsx`      | PASS    | `useReactTable` at L131                                         |

### i18n type augmentation

| Check                                                     | Verdict | Evidence                                                                                                                                               |
| --------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Augmentation target = `'i18next'` (not `'react-i18next'`) | PASS    | `apps/pragma/site/src/i18n/react-i18next.d.ts:18` `declare module 'i18next'`                                                                           |
| `CustomTypeOptions.resources.translation = typeof en`     | PASS    | L19–23 (verbatim)                                                                                                                                      |
| Mistyped key would fail typecheck                         | PASS    | `tsc --noEmit` resolves `t('foo.bar')` against the catalog literal-type tree; would surface as `Argument of type '"foo.bar"' is not assignable to ...` |

### `useEffect` audit

Every `useEffect` in the diff is one of the legitimate carve-outs from CLAUDE.md "Clean code":

| File:line                       | Reason                                                                                                                                                      | Verdict          |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `AppShell.tsx:77`               | `window.addEventListener('online'/'offline')` — global subscription                                                                                         | PASS             |
| `AppShell.tsx:88`               | `matchMedia(...).addEventListener('change', …)` — global subscription                                                                                       | PASS             |
| `SongSearch.tsx:51`             | `setTimeout` debounce timer (external timer)                                                                                                                | PASS             |
| `CreateSessionDialog.tsx:73`    | Native `<dialog>.showModal()/close()` imperative API                                                                                                        | PASS             |
| `FileDrop.tsx` (no `useEffect`) | n/a — drag/drop is event-driven, header comment confirms                                                                                                    | PASS             |
| `useMediaQuery.ts`              | uses `useSyncExternalStore`, not `useEffect`                                                                                                                | PASS             |
| `SongScenePage.tsx:36`          | `window.addEventListener('keydown', …)` — global subscription                                                                                               | PASS             |
| `TransitionCommentModal.tsx:36` | Native `<dialog>` imperative API                                                                                                                            | PASS             |
| `SessionsPage.tsx:30`           | Native `<dialog>` imperative API (confirm)                                                                                                                  | PASS             |
| `MembersPage.tsx:78`            | local form sync to selection — read-only narrowing the brief did not flag; effect-watching-state risk to monitor in a future round but not currently a FAIL | PASS (with note) |

No state-mirrors-state effect was found in the diff.

### Mobile-first responsive (sample of 3 routes)

| Route              | Has `sm:` / `md:` / `lg:` / `xl:` prefixes on layout-bearing classes | Verdict |
| ------------------ | -------------------------------------------------------------------- | ------- |
| `SessionsPage.tsx` | `sm:px-9` on root section + grid responsive variants                 | PASS    |
| `BarsPage.tsx`     | `sm:px-9`, `md:grid-cols-[1fr_380px]`, `lg:grid-cols-5` (kanban)     | PASS    |
| `CatalogPage.tsx`  | `sm:px-9` on root section                                            | PASS    |

### Type-assertion plugin / `any` / `noUncheckedIndexedAccess`

| Check                                                                           | Verdict  | Evidence                                                                                                                                                        |
| ------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grep -E "\b(as any\|: any)\b"` in diff                                         | PASS     | 0 hits (lint plugin also enforces)                                                                                                                              |
| `pnpm exec biome lint`                                                          | PASS     | "Checked 572 files in 2s. No fixes applied." exit 0                                                                                                             |
| `pnpm exec biome check` (lint + format + organizeImports — the pre-commit gate) | **FAIL** | 125 diagnostics across 16 files; FIXABLE via `pnpm exec biome check --write`. Categories: `assist/source/organizeImports` + formatter drift. See § Notes below. |

## C. Gate results

| #    | Workspace           | Command                                                                                                                                                                                   | Exit                                                       | Verdict  |
| ---- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------- |
| C01  | root                | `pnpm install --frozen-lockfile`                                                                                                                                                          | 0                                                          | PASS     |
| C02  | `@borso-app/pragma` | `pnpm --filter @borso-app/pragma run typecheck` (tsc `tsconfig.cdk.json` + tsc)                                                                                                           | 0                                                          | PASS     |
| C03  | `@borso/infra`      | `pnpm --filter @borso/infra run typecheck`                                                                                                                                                | 0                                                          | PASS     |
| C04  | root                | `pnpm exec biome lint`                                                                                                                                                                    | 0                                                          | PASS     |
| C04b | root                | `pnpm exec biome check` (the pre-commit gate — lint + format + organizeImports)                                                                                                           | non-zero (125 diagnostics, 16 files)                       | **FAIL** |
| C05  | root                | `pnpm exec knip`                                                                                                                                                                          | 0 (two informational "Configuration hints" — not failures) | PASS     |
| C06  | `@borso-app/pragma` | `pnpm --filter @borso-app/pragma run test:core` (42 files, 364 tests)                                                                                                                     | 0                                                          | PASS     |
| C07  | `@borso-app/pragma` | `pnpm --filter @borso-app/pragma run test` (11 files, 62 tests, back-e2e via local Postgres)                                                                                              | 0                                                          | PASS     |
| C08  | `@borso/infra`      | `pnpm --filter @borso/infra run test:coverage` (18 files, 205 tests, 100% stmt/branch/funcs/lines on all CDK constructs incl. `cf-host-routing-function.ts`, `migration-runner/index.ts`) | 0                                                          | PASS     |
| C09  | `@borso-app/pragma` | `pnpm --filter @borso-app/pragma run build` (site bundle 648 KB / 188 KB gz; 38.95 KB CSS)                                                                                                | 0                                                          | PASS     |

`*.utils.ts` enumeration: every utils file under `apps/pragma/{site,api}/src/` has a sibling `*.utils.test.ts`. Confirmed by the test runner picking up 42 core/utils files. PASS.

## D. Test coverage of spec

Spec routes every numbered happy-path step under _Use cases_ to `/visual-validation`. **No category-D rows fall to this validator.** The behavioural rules listed in spec _Test strategy_ — `transition.core`, `tonality.core`, `lineup.core`, `energy-curve.core`, `mastery.core`, `embed.utils`, i18n key-parity, back-e2e CRUD + concurrency + LWW — are all covered by C06/C07 gates and their failure would have surfaced there. No FAIL row needed.

## E. Per-round verdicts

| Round | Subject                                                    | Verdict | One-liner                                                                                                                                                                                                                                       |
| ----- | ---------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 07    | `jsonb` → `text`                                           | PASS    | Every JSONB-shaped column shipped as `text(...)` with a comment + link to dsql-postgres-compat-gaps.md §1; 0 `jsonb(` hits in `apps/pragma/api/src/`                                                                                            |
| 08    | `asyncifyIndex` in migration-runner                        | PASS    | Function exists at `migration-runner/index.ts:151`, composed in `splitStatements`; tests cover vanilla / UNIQUE / `IF NOT EXISTS` / `USING btree` composition / already-`ASYNC` idempotency (5 case shapes ≥ brief's 4)                         |
| 09    | misc (post-Lambda ESM + drizzle wiring)                    | PASS    | back-e2e + test:core green; lambda-esm-native-modules.md knowledge note shipped                                                                                                                                                                 |
| 10    | SPA fallback in CF function source                         | PASS    | `SPA_APPS = ['last-loop-lepin', 'pragma']` at `:61`; non-asset URI rewrite at L78–84 using `lastDotSpa < lastSlashSpa` heuristic                                                                                                                |
| 11    | uploads bounded context                                    | PASS    | full triad at `apps/pragma/api/src/uploads/`; `uploads.repository.ts` is the only file importing `@aws-sdk/client-s3` + `s3-request-presigner`; ContentType pinned in presigner; size cap via Zod ahead of signing; `UPLOADS_BUCKET` env-driven |
| 13    | optimistic mutations across the board                      | PASS    | `bars.ts`, `instruments.ts`, `members.ts`, `songs.ts` all wired with `onMutate`/`onError`/`onSettled`; this is the round the brief flagged as historically lying. HEAD doesn't lie.                                                             |
| 14    | misc (auth + offline banner + members affordances)         | PASS    | back-e2e covers auth flow; component tests cover the relevant molecules                                                                                                                                                                         |
| 15    | i18n typed catalog via `CustomTypeOptions`                 | PASS    | Module augmentation targets `'i18next'`; `resources.translation = typeof en`; `tsc --noEmit` green                                                                                                                                              |
| 17a   | sessions create dialog + delete                            | PASS    | `CreateSessionDialog.tsx` ships both variants with TanStack Form, `datetime-local` input, future-concert filter; SessionsPage has trash button with `stopPropagation` + confirm-dialog                                                          |
| 17b   | session update optimistic + setlist-create skip documented | PASS    | `useUpdateSession` optimistic on both list + byId; setlist-create has the documented skip JSDoc                                                                                                                                                 |
| 17c   | optimistic on every remaining target                       | PASS    | mastery, transitions, members, setlist-entry mutations all wired                                                                                                                                                                                |

## Notes

> The composite `biome check` FAIL is mechanical (formatter / organize-imports drift, FIXABLE). The 16 files surfaced:
>
> - `apps/pragma/api/src/auth/{auth.controller.test.ts, auth.controller.ts, auth.service.ts}` — `assist/source/organizeImports`
> - `apps/pragma/site/src/routes/catalog/{chart-kind.utils.ts, song-draft.ts}` — formatter
> - `apps/pragma/site/src/routes/instruments/InstrumentsPage.tsx` — formatter
> - `apps/pragma/site/src/routes/members/MembersPage.tsx` — both
> - `apps/pragma/site/src/routes/sessions/{ConcertEditForm.tsx, ConcertReadView.tsx, PracticeReadView.tsx, SessionDetailPage.tsx, SessionsPage.tsx}` — formatter + organizeImports
> - `apps/pragma/site/src/routes/setlists/{SetlistEditor.tsx, SetlistEntryRow.tsx, SetlistsPage.tsx, TransitionCommentModal.tsx}` — formatter + organizeImports
> - `apps/pragma/site/src/sw/manifest.utils.ts` — formatter (this file is tracked but only imported by its own test; appears to be a never-wired helper for an earlier SW design — the runtime SW lives at `apps/pragma/site/public/sw.js`. Apply --write or wire/remove it.)
> - `commitlint.config.js` — formatter
>
> The diagnostic was missed by earlier per-round verdicts because they each ran `pnpm exec biome lint`, not `biome check`. The pre-commit hook runs `check` (per `.husky/pre-commit:14`), so a fresh commit on this branch fails today — when I attempted to commit this very report, the hook rejected it. That's the proof the gate matters.
>
> Recommendation: ship a fix-round that runs `pnpm exec biome check --write` and re-stages the touched files. After that, every other row in this report is green and the branch is ready for `/visual-validation` + open-pr.

## Verdict: FAIL
