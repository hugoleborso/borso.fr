# Technical validation — Pragma: first features (catalog, setlist, sessions, CRM bars) — round 3

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- ADR: [`../../../../adr/0004-pragma-shared-password-auth.md`](../../../../adr/0004-pragma-shared-password-auth.md)
- Branch: `claude/pragma-erp-specification-k41Mg`
- Base: `origin/main`
- HEAD: `3267f91` (impl tip: `283e174` — round-3 unified fix; `3267f91` is docs-only verdict checkpoint)
- Run at: 2026-05-20T10:35:00Z
- Touched workspaces (this report's scope): `@borso-app/pragma` (`apps/pragma/{site,api,cdk,test}/`).
- Prior reports:
  - [round-1](./technical-validation-2026-05-19-2111.md) (FAIL — auth-bypass + foundation-only scope)
  - [round-1.5](./technical-validation-2026-05-19-2200.md) (PASS_EXCEPT_UNVERIFIABLE on the auth fix; full-spec rows deferred)
  - [round-2](./technical-validation-2026-05-20-0020.md) (FAIL — 6 technical blockers: B08, A07/A08, A10/D20, A13/D21, A18, A20)
- Routing note: the spec routes every numbered happy-path step under *Use cases* to `/visual-validation`. Category D below covers only the deterministic / non-DOM behavioural assertions; UI rows are not echoed here.

The 6 previously-failing technical rows are the spotlight; every one is re-checked below.

---

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence | Verdict |
|---|---|---|---|---|---|
| A01 | Q.O.D. *App-workspace slug* = `pragma` | Workspace lives at `apps/pragma/` with `@borso-app/pragma` name | `apps/pragma/package.json` | `"name": "@borso-app/pragma"` | PASS |
| A02 | Q.O.D. *Auth model* = shared password (ADR-0004) | Hono middleware verifies signed HttpOnly cookie + argon2id hash in `app_config`; rate-limit 5/15min/ip_hash; rotate-password endpoint behind session | `apps/pragma/api/src/auth/shared-password.middleware.ts`, `auth.controller.ts` | `mountGated(app, '/api/admin/rotate-password', ...)` plus back-e2e tests | PASS |
| A03 | Q.O.D. *Concurrency* = last-write-wins | Plain UPDATE without version column | `apps/pragma/api/src/songs/songs.repository.ts` | Drizzle update via repository; no optimistic lock | PASS |
| A04 | Q.O.D. *Mastery* hybrid (default ?? override) | `mastery.core.ts:effective` returns `override ?? default` | `apps/pragma/api/src/mastery/mastery.core.ts` | branch test covers `override = 0` falsy trap | PASS |
| A05 | Q.O.D. *Transition warning rule* — no harmonic kept by same member | `transition.core.ts:evaluateTransition` intersects harmonic-member sets | `apps/pragma/api/src/setlists/transition.core.ts` | `if (overlap.length > 0) return { kind: 'safe' };` | PASS |
| A06 | Q.O.D. *Transition comment* — global per ordered (A,B) | Unique `(song_a_id, song_b_id)` constraint, single-row reuse | `apps/pragma/api/src/transitions/transitions.schema.ts` + back-e2e | `treats A→B and B→A as distinct rows` passes | PASS |
| **A07** | Q.O.D. *Mastery matrix UI* — scroll-wheel ±1, right-click clear, row/column averages live | `MasteryMatrix` component implements all three affordances + row/column averages | `apps/pragma/site/src/components/MasteryMatrix.tsx:97-130, 152-211` | `onWheel`, `onContextMenu`, `onAuxClick`, `rowAverage`, `columnAverage` all present; clamp via `clampScore` | **PASS (closed from round-2 FAIL)** |
| **A08** | Q.O.D. *Mastery matrix locus on `/members`* | Matrix mounted INSIDE `/members` route; `/mastery` route removed | `apps/pragma/site/src/routes/members/MembersPage.tsx:14, 275`; `App.tsx` has no `/mastery` route | `import { MasteryMatrix } from '../../components/MasteryMatrix'` rendered on members page | **PASS (closed from round-2 FAIL)** |
| A09 | Q.O.D. *Accent color* = blue | `--accent` declared once in design-tokens.css | `apps/pragma/site/src/styles/design-tokens.css` | `--accent: #2d5fa0;` | PASS |
| **A10** | Q.O.D. *Offline cache scope* = next session only via `/api/offline-manifest` precache | `GET /api/offline-manifest` mounted; SW reads it on install to compose pre-cache | `apps/pragma/api/src/app.ts:81`, `sessions/sessions.controller.ts:32`, `site/src/sw/manifest.utils.ts`, `site/src/sw/sw-cache.utils.ts:20` | `mountGated(app, '/api/offline-manifest', buildOfflineManifestRouter())`; `pickNextSession` filters to future sessions and picks earliest | **PASS (closed from round-2 FAIL)** |
| A11 | Q.O.D. *Energy viz* = single-setlist sparkline | `energy-curve.core.ts` + `sparkline.utils.ts` + integrated in editor | `apps/pragma/api/src/setlists/energy-curve.core.ts`, `apps/pragma/site/src/routes/setlists/sparkline.utils.ts` | both files + sibling tests | PASS |
| A12 | Q.O.D. *Chord chart formats* = chordpro \| pdf \| image (discriminated union) | Zod union enforced at controller boundary | `apps/pragma/api/src/songs/songs.schema.ts` | discriminated union over `kind` literals | PASS |
| **A13** | Q.O.D. *Embeds* = iframes for Spotify/Deezer/YouTube — provider-detection util | `embed.utils.ts` implements oEmbed iframe resolution for YouTube, Spotify, Deezer, Vimeo, SoundCloud, Soundslice; plain `<a>` fallback for unknown URLs | `apps/pragma/site/src/lib/embed.utils.ts:147-176` | `resolveEmbed` returns `{ kind: 'oembed', provider, iframeSrc, width, height }` or `{ kind: 'plain', href }` | **PASS (closed from round-2 FAIL)** |
| A14 | Q.O.D. *DB seed* = manual UI | No seed Lambda in CDK; first deploy ships empty DB | `apps/pragma/cdk/lib/stack.ts` | grep confirms — no seeding asset | PASS |
| A15 | Q.O.D. *friendsCountPerMember* — each member fills their own count | Per-member input on concert detail | `apps/pragma/site/src/routes/sessions/{SessionDetailPage,ConcertEditForm}.tsx` | session-detail back-e2e covers PUT shape | PASS |
| A16 | Q.O.D. *User-facing language* = FR + EN i18n with parity test | `react-i18next` + en.json/fr.json + `i18n-parity.core.ts` | `apps/pragma/site/src/i18n/i18n-parity.core.test.ts` | parity test asserts no missing keys either side | PASS |
| A17 | Use case 1.5 (ChordPro tonality auto-deduce) | `tonality.core.ts` returns `null` on missing/malformed | `apps/pragma/api/src/songs/tonality.core.ts` | sibling test covers ambiguous → null | PASS |
| **A18** | Use case 2 — setlist drag-handle reorder (designer pass) | `SetlistEntryRow` exposes a dedicated drag handle (`draggable` + `onDragStart` on a labelled element); `SetlistEditor` tracks `draggingEntryId` and swaps positions on drop | `apps/pragma/site/src/routes/setlists/SetlistEntryRow.tsx:38-53`, `SetlistEditor.tsx:86, 191-197, 269` | `<div draggable aria-label={t('setlist.dragHandle')} onDragStart=...>` plus up/down buttons retained as a11y fallback | **PASS (closed from round-2 FAIL)** |
| A19 | Use case 2.4 — transition warning surface with side-gutter visual | warning marker rendered between consecutive rows; comment modal opens on click | `apps/pragma/site/src/routes/setlists/SetlistEditor.tsx`, `TransitionCommentModal.tsx` | transition computed via `evaluateTransition`; modal exists | PASS |
| **A20** | Use case 4.3 — stale-bar banner at login for bars w/ no interaction >N days (default 60) | `bars.core.ts:isStale` + `countStale`; `BarsPage` renders banner + per-row badge | `apps/pragma/api/src/bars/bars.core.ts:21-30`, `apps/pragma/site/src/routes/bars/BarsPage.tsx:104, 187-189, 211, 260` | `isStale(bar, now, thresholdDays)` takes `now` explicitly; banner reads `staleCount`; never calls `new Date()` inside core | **PASS (closed from round-2 FAIL)** |
| A21 | Use case 5 — PWA caches "next upcoming session's setlist only" | SW pre-caches the manifest payload (catalog + next session only) | covered in A10 | rolled into A10 — PASS | PASS |
| A22 | Spec route `/sessions/<id>/setlist` | Setlist editor is embedded inside `/sessions/<id>` rather than a dedicated route | `apps/pragma/site/src/App.tsx` | functional equivalent (unchanged from round-2) | PASS-with-note |
| A23 | Domain model: MASTERY_DEFAULT + MASTERY_OVERRIDE unique indexes | Drizzle schema + back-e2e | `apps/pragma/api/src/mastery/mastery.schema.ts` + `mastery.controller.test.ts` | constraint verified | PASS |
| A24 | Domain model: SETLIST_ENTRY position index | Drizzle index `(setlist_id, position)` | `apps/pragma/api/src/setlists/setlists.schema.ts` | drizzle migration includes the index | PASS |
| A25 | Files-to-change: `apps/pragma/cdk/` — composes PreviewableApp + DsqlCluster + uploads bucket | Stack composes PreviewableApp + S3 + CORS PUT/GET; DsqlCluster is its own stack; no SecretsManager (ADR-0004) | `apps/pragma/cdk/lib/stack.ts`, `cdk/bin/cdk.ts` | unchanged from round-2 PASS | PASS |
| A26 | Files-to-change: `apps/pragma/site/src/sw/` — service worker | SW + `register-sw.ts` + `manifest.utils.ts` + `sw-cache.utils.ts` | `apps/pragma/site/src/sw/` | all present | PASS |
| A27 | Plan: bootstrap `set-password` first-time | Implemented inline on `auth.controller.ts` as `POST /api/admin/set-password` | `apps/pragma/api/src/auth/auth.controller.ts` | back-e2e: 2nd set-password attempt 401s | PASS |

---

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | `pnpm exec biome lint apps/pragma/` clean | `pnpm exec biome lint apps/pragma/` | `Checked 152 files in 1470ms. No fixes applied.` exit 0 | PASS |
| B02 | `pnpm exec knip` clean (workspace-wide) | `pnpm exec knip` | exit 0 — one *configuration hint* only (`@borso/infra` listed under `ignoreDependencies` could be removed); no unused exports / files / deps | PASS |
| B03 | No `any` outside comments | `grep -rEn '\bany\b' apps/pragma/{site,api,cdk}/src` | only hit is `it('ignores a chord-line if any token does not parse', …)` — natural English in a test description | PASS |
| B04 | Banned type assertions absent (only `as const` / `as unknown`) | `grep -rEn ' as [A-Z][a-zA-Z]+' apps/pragma/{site,api,cdk}` excluding `as const \| as unknown \| node_modules \| dist \| cdk.out` | no matches | PASS |
| B05 | `useEffect` — every introduced effect justifies itself | 12 `useEffect` sites across the front-end: 11 fetch-on-mount with abort-style cleanup (`RequireSession`, `CatalogPage`, `SongDetailPage`, `SongScenePage`, `SessionsPage`, `SessionDetailPage`, `BarsPage`, `InstrumentsPage`, `MembersPage`, `SetlistEditor`, `TransitionCommentModal`); 1 `window.addEventListener('online'/'offline')` in `OfflineBanner.tsx` — the canonical `addEventListener` case. None watch React state to set other React state; no derived-state-via-effect anti-pattern. | PASS |
| B06 | Magic numbers extracted | Sample: `STALE_BAR_DEFAULT_THRESHOLD_DAYS`, `MILLISECONDS_PER_DAY` (bars.core), `RIGHT_BUTTON`, `YOUTUBE_IFRAME_WIDTH/HEIGHT`, `FONT_SIZE_MIN_PX/STEP_PX/MAX_PX` (SongScenePage), `CHORD_CHART_PREFIX`/`AVATAR_PREFIX` declared as named consts | many files; no bare numerics in domain logic | PASS |
| B07 | Function names describe the result | Sample: `evaluateTransition`, `pickNextSession`, `buildOfflineManifest`, `resolveEmbed`, `clampScore`, `rowAverage`, `columnAverage`, `countStale`, `isStale`, `mintChordChartUpload` | per-file inspection | PASS |
| **B08** | **Per-domain layered triad on the backend** (CLAUDE.md "Back-end domains are vertical slices…") | File census per domain folder under `apps/pragma/api/src/`: every folder (`auth`, `bars`, `instruments`, `members`, `mastery`, `sessions`, `setlists`, `songs`, `transitions`, `uploads`) now ships `<domain>.controller.ts + <domain>.service.ts + <domain>.repository.ts + <domain>.schema.ts`. `.core.ts` files (`bars`, `mastery`, `setlists/{transition,energy-curve}`, `songs/{lineup,tonality}`) live INSIDE their bounded context. Controllers import `getDatabase()` from `database/client` but pass it to services — they never call `database.insert/select/...` inline. Reference: `apps/pragma/api/src/songs/songs.controller.ts:13, 32` — `import { createSong, ... } from './songs.service'`, then `await createSong(getDatabase(), input)`. Routing is the only controller responsibility. Service → repository delegation visible in `songs.service.ts:43-45` (calls `insertSong`). | **PASS (closed from round-2 FAIL)** |
| B09 | No horizontal aggregator folders | `ls apps/pragma/api/src` shows only `auth/`, `bars/`, `database/`, `instruments/`, `mastery/`, `members/`, `sessions/`, `setlists/`, `songs/`, `transitions/`, `uploads/` + `app.ts` / `main.ts` / `main.dev.ts` | PASS |
| B10 | `.core.ts` files live INSIDE their bounded context | `bars/bars.core.ts`, `mastery/mastery.core.ts`, `setlists/{transition,energy-curve}.core.ts`, `songs/{lineup,tonality}.core.ts` | PASS |
| B11 | `.core.ts` never calls `new Date()` directly | `grep "new Date()" apps/pragma/api/src/**/*.core.ts` → only match is the literal text inside a documentation comment in `bars.core.ts:5` explaining the rule | PASS |
| B12 | Utilities ship at 100% coverage with sibling test | 15 `*.utils.ts` files (`rate-limit`, `ip-hash`, `session-cookie`, `member-palette`, `sparkline`, `mastery-matrix`, `mastery-aggregate`, `formatters`, `embed`, `chordpro`, `stale-bar`, `member-color`, `manifest`, `sw-cache`, `i18n`) — every one has a sibling `*.utils.test.ts`; runner picks them up; per-file 100% threshold passes (see C04). | PASS |
| B13 | Code-language rule (English) | grep for `prenom/lieu/chanson/salle` returns nothing in source; identifiers are English | PASS |

---

## C. Tests pass

| # | Workspace | Command | Result | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (typecheck) | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 (`tsc -p tsconfig.cdk.json --noEmit && tsc --noEmit`) | PASS |
| C02 | repo (lint, pragma slice) | `pnpm exec biome lint apps/pragma/` | exit 0 — 152 files checked | PASS |
| C03 | repo (knip) | `pnpm exec knip` | exit 0 — one configuration hint only (`@borso/infra` in `ignoreDependencies`) | PASS |
| C04 | @borso-app/pragma (test:core) | `pnpm --filter @borso-app/pragma run test:core` | `Test Files 23 passed (23) / Tests 245 passed (245) — Duration 15.79s` | PASS |
| C05 | @borso-app/pragma (back-e2e) | `pnpm --filter @borso-app/pragma test` (via `scripts/local-postgres.sh`) | `Test Files 9 passed (9) / Tests 51 passed (51) — Duration 11.11s` | PASS |
| C06 | @borso-app/pragma (test:coverage — `*.core.ts` + `*.utils.ts` per-file 100%) | `pnpm --filter @borso-app/pragma run test:coverage` | `Test Files 32 passed (32) / Tests 296 passed (296)` + threshold met (per-file `perFile: true, statements/branches/functions/lines = 100`) | PASS |
| C07 | @borso-app/pragma (build) | `pnpm --filter @borso-app/pragma run build` | `✓ built in 1.74s` — `index-BAUMRRMm.js 408.45 kB / gzip 121.27 kB` | PASS |
| C08 | @borso-app/pragma (synth) | `pnpm --filter @borso-app/pragma run synth` | `Successfully synthesized to /home/user/borso.fr/apps/pragma/cdk.out` — both `pragma-prod` and `pragma-cluster` stacks compose | PASS |

Note on coverage: the `test:coverage` summary shows a workspace-wide 46% — that's expected and not a gate. The gated set is `*.core.ts` + `*.utils.ts`, configured via `perFile: true` + `include: [api/src/**/*.{core,utils}.ts, site/src/**/*.{core,utils}.ts]` (see `vitest.workspace.ts`). The runner exits 0, which means the per-file 100% threshold held on every matched file.

---

## D. Test coverage of spec

Numbered happy-path steps (use cases 1, 1bis, 2, 3, 4, 5) are routed by the spec to `/visual-validation`; they are out of scope for this report. Deterministic / non-DOM behavioural assertions:

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Tonality auto-deduce from ChordPro (valid / ambiguous / missing) | `apps/pragma/api/src/songs/tonality.core.test.ts` — `ignores a chord-line if any token does not parse` + ambiguous + missing fixtures | PASS |
| D02 | Transition warning rule (exhaustive table) | `apps/pragma/api/src/setlists/transition.core.test.ts` — multiple `describe`s covering each branch | PASS |
| D03 | Lineup default + override resolution (absent / null / explicit-null-instrument) | `apps/pragma/api/src/songs/lineup.core.test.ts` | PASS |
| D04 | Energy-curve smoothing (nullable points, all-null, monotonic, peak) | `apps/pragma/api/src/setlists/energy-curve.core.test.ts` | PASS |
| D05 | Mastery `effective(member, instrument, song) = override ?? default` incl. `override = 0` falsy-trap | `apps/pragma/api/src/mastery/mastery.core.test.ts` | PASS |
| D06 | Mastery mean-for-song over lineup | `apps/pragma/api/src/mastery/mastery.core.test.ts` (`meanForSong`) | PASS |
| D07 | i18n catalog key-parity (no missing translation either side) | `apps/pragma/site/src/i18n/i18n-parity.core.test.ts` | PASS |
| D08 | Auth — rate-limit token-bucket math (5/15min/ip_hash) | `apps/pragma/api/src/auth/rate-limit.utils.test.ts` | PASS |
| D09 | Auth — back-e2e: 5 wrong → 429; rotate-password invalidates cookie; bootstrap 401s once row exists | `apps/pragma/api/src/auth/auth.controller.test.ts` (back-e2e) | PASS |
| D10 | Catalog CRUD round-trip + JSONB Zod rejection | `apps/pragma/api/src/songs/songs.controller.test.ts` (back-e2e) | PASS |
| D11 | Setlist concurrency last-write-wins; entries-reorder | `apps/pragma/api/src/setlists/setlists.controller.test.ts` | PASS |
| D12 | Sessions practice ↔ concert linkage (`preparedConcertId`) | `apps/pragma/api/src/sessions/sessions.controller.test.ts` | PASS |
| D13 | Bars CRM CRUD + status transitions | `apps/pragma/api/src/bars/bars.controller.test.ts` | PASS |
| D14 | Transition comment global-per-ordered-pair (A→B vs B→A distinct) | `apps/pragma/api/src/transitions/transition-comments.controller.test.ts > treats A→B and B→A as distinct rows` | PASS |
| D15 | Mastery defaults CRUD via API | `apps/pragma/api/src/mastery/mastery.controller.test.ts` | PASS |
| D16 | Members CRUD via API | `apps/pragma/api/src/members/members.controller.test.ts` | PASS |
| D17 | Instruments CRUD + `isHarmonic` toggle | `apps/pragma/api/src/instruments/instruments.controller.test.ts` | PASS |
| D18 | CDK stack — no Secrets Manager + uploads bucket shape + CORS pair + custom prod domain alias | `apps/pragma/cdk/test/stack.test.ts` (8 tests) | PASS |
| D19 | SW cache key — same chart with new `uploadedAt` produces different key | `apps/pragma/site/src/sw/sw-cache.utils.test.ts` | PASS |
| **D20** | Plan: `manifest.utils.ts` — `pickNextSession` empty / multiple / past-only fixtures + `buildOfflineManifest` + `manifestUrls` | `apps/pragma/site/src/sw/manifest.utils.test.ts` exists; per-file 100% coverage met (gate C06). | **PASS (closed from round-2 FAIL)** |
| **D21** | Plan: `embed.utils.ts` — Spotify/Deezer/YouTube/Vimeo/SoundCloud/Soundslice → iframe URL; unknown → plain link | `apps/pragma/site/src/lib/embed.utils.test.ts` exists; per-file 100% coverage met (gate C06). | **PASS (closed from round-2 FAIL)** |
| D22 | Mastery row/column averages — `mastery-matrix.utils.ts` `rowAverage` / `columnAverage` (null on empty, average on filled) | `apps/pragma/site/src/lib/mastery-matrix.utils.test.ts` | PASS |
| D23 | Stale-bar threshold logic — `stale-bar.utils.ts` (front-side mirror of `bars.core.ts`) | `apps/pragma/site/src/lib/stale-bar.utils.test.ts` + `apps/pragma/api/src/bars/bars.core.test.ts` | PASS |
| D24 | ChordPro parser + transposer — natural / sharp / flat roots, plain text fallthrough | `apps/pragma/site/src/lib/chordpro.utils.test.ts` | PASS |
| D25 | Member palette slot allocation — `member-palette.utils.ts` cycles coral/teal/mustard/plum/sage | `apps/pragma/api/src/members/member-palette.utils.test.ts` | PASS |
| D26 | Mastery aggregate (catalog card) — `mastery-aggregate.utils.ts` mean over lineup, null on empty | `apps/pragma/site/src/lib/mastery-aggregate.utils.test.ts` | PASS |

---

## Notes

> One bullet per FAIL or note-bearing row. PASS rows do not need a note.

- **A22 — Setlist route shape** (PASS-with-note, unchanged from round-2). The spec lists `/sessions/<id>/setlist` as its own route group. Implementation embeds `SetlistEditor` inside `SessionDetailPage`. Functionally equivalent. Kept as a note rather than a FAIL because the spec's use-case sequence ("opens the concert, taps 'build setlist'") does not require the URL to carry a `/setlist` suffix.
- **B05 — `useEffect` audit** (PASS). 12 effects total. Every one is either (a) fetch-on-mount synchronising React state with the network with a cancellation guard, or (b) `window.addEventListener('online'/'offline')` in `OfflineBanner.tsx`. No effect watches React state to set other React state. The `OfflineBanner` listener is borderline ("could `useSyncExternalStore` cover this?") but defensible.
- **All six round-2 blockers are closed.** B08 (per-domain triad: every domain ships controller + service + repository + schema; controllers no longer query the DB inline), A07/A08 (mastery matrix on `/members` with scroll-wheel ±1, right-click clear, live row/column averages), A10/D20 (`GET /api/offline-manifest` + `manifest.utils.ts` `pickNextSession`), A13/D21 (`embed.utils.ts` with 6-provider iframe resolution + plain-link fallback), A18 (HTML5 drag from a dedicated handle element on each setlist entry row), A20 (`bars.core.ts:isStale` + banner + per-row badge, `now` injected, never `new Date()` inside core).
- **Knip configuration hint** is informational only — knip exits 0. The hint suggests removing `@borso/infra` from `apps/pragma/knip.json`'s `ignoreDependencies`. Worth a one-line kaizen but does not block.

Positives:
- Layered-triad refactor is complete and consistent across all ten bounded contexts. Songs, mastery, sessions, setlists, bars all route DB through their repositories. Reference shape matches `apps/last-loop-lepin/api/src/{auth,edition,...}`.
- 245 core tests + 51 back-e2e tests + 8 CDK stack tests, all green. Per-file 100% threshold on `*.core.ts` / `*.utils.ts` is met by every gated file (`test:coverage` exits 0 with `perFile: true`).
- Build green at 408 kB JS / 121 kB gzip; CDK synth green for both `pragma-prod` and `pragma-cluster` stacks.

---

## Verdict: PASS

Aggregated row counts (full-spec scope):

- Category A: 27 PASS (0 FAIL) — A22 is a PASS-with-note.
- Category B: 13 PASS (0 FAIL).
- Category C: 8 PASS (0 FAIL).
- Category D: 26 PASS (0 FAIL).

Per the standard: all rows PASS → **PASS**. All six round-2 technical blockers (B08, A07, A08, A10/D20, A13/D21, A18, A20) are closed with quoted evidence. The branch is technically mergeable subject to `/visual-validation`'s parallel verdict.

Recommended next step: `next.kind: ship`.
