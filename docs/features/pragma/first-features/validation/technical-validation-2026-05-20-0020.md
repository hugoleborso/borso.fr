# Technical validation — Pragma: first features (catalog, setlist, sessions, CRM bars)

- Spec: [`../spec/spec.md`](../spec/spec.md) — SHA pinned in `runs/.../state.json`.
- Plan: [`../plan/plan.md`](../plan/plan.md)
- ADR: [`../../../../adr/0004-pragma-shared-password-auth.md`](../../../../adr/0004-pragma-shared-password-auth.md)
- Branch: `claude/pragma-erp-specification-k41Mg`
- Base: `origin/main`
- HEAD: `7de18da` (round-2 impl commit is `ff6657e`; the three commits on top are docs-only — orchestrator checkpoint, standard-amendment, prior verdict)
- Run at: 2026-05-20T00:20:00Z
- Touched workspaces (this report's scope): `@borso-app/pragma` (`apps/pragma/{site,api,cdk,test}/`).
- Prior reports:
  - [round-1 technical](./technical-validation-2026-05-19-2111.md) (FAIL — auth-bypass + foundation-only scope)
  - [round-1.5 technical](./technical-validation-2026-05-19-2200.md) (PASS_EXCEPT_UNVERIFIABLE on the auth fix; full-spec rows deferred)
  - [round-1 visual](./visual-validation-2026-05-19-2111.md) (PASS_EU — foundation only)
- Routing note: the spec routes every numbered happy-path step under *Use cases* to `/visual-validation`. Category D below therefore covers only the deterministic / non-DOM behavioural assertions; UI rows are not echoed as UNVERIFIABLE here.

---

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence | Verdict |
|---|---|---|---|---|---|
| A01 | Q.O.D. *App-workspace slug* = `pragma` | Workspace lives at `apps/pragma/` with `@borso-app/pragma` name | `apps/pragma/package.json` | `"name": "@borso-app/pragma"` | PASS |
| A02 | Q.O.D. *Auth model* = shared password (ADR-0004) | Hono middleware verifies signed HttpOnly cookie + argon2id hash in `app_config`; rate-limit 5/15min/ip_hash; rotate-password endpoint behind session | `apps/pragma/api/src/auth/shared-password.middleware.ts`, `auth.controller.ts:rotate-password` | `app.use('/api/admin/rotate-password', sharedPasswordMiddleware)` (fixed in round-1.5) | PASS |
| A03 | Q.O.D. *Concurrency* = last-write-wins | Plain UPDATE without version column | `apps/pragma/api/src/songs/songs.controller.ts:145` | `database.update(songTable).set(input).where(eq(songTable.id, id))` — no version check | PASS |
| A04 | Q.O.D. *Mastery* hybrid (default ?? override) | `mastery.core.ts:effective` returns `override ?? default` (treats override=0 correctly) | `apps/pragma/api/src/mastery/mastery.core.ts:42-44` | `const override = overrides[songId]?.[memberId]?.[instrumentId]; if (override !== undefined) return override;` | PASS |
| A05 | Q.O.D. *Transition warning rule* — no harmonic kept by same member across pair → warn | `evaluateTransition` intersects harmonic-member sets on each side | `apps/pragma/api/src/setlists/transition.core.ts:43-62` | `if (overlap.length > 0) return { kind: 'safe' };` | PASS |
| A06 | Q.O.D. *Transition comment* — global per ordered (A,B) | Unique constraint `(song_a_id, song_b_id)`, single-row reuse | `apps/pragma/api/src/database/schema.ts` (transition_comment table) | back-e2e `transition-comments.controller.test.ts > treats A→B and B→A as distinct rows` PASSES | PASS |
| A07 | Q.O.D. *Mastery matrix UI locus* = both (5×7 grid on members + per-song override grid) | `/mastery` page exists; per-song override grid on song detail TBD | `apps/pragma/site/src/routes/mastery/MasteryPage.tsx`, `routes/catalog/SongDetailPage.tsx` | `mastery-table` rendered with member rows × instrument columns. **Spec also calls for row/column averages updating live** — not present in `MasteryPage.tsx`. Spec further requires "scroll-wheel to ±1, right-click to clear" — implementation is a plain `<input type="number">`. | **FAIL** |
| A08 | Q.O.D. *Mastery matrix locus on `/members`* | Spec literally says "User opens `/members`. Sees the 5-member × 7-instrument matrix" | `App.tsx:34` mounts `/members` (admin only) and `/mastery` (matrix) as separate routes | `<Route path="/mastery" element={<MasteryPage />} />` — matrix moved off `/members` | FAIL (route divergence) |
| A09 | Q.O.D. *Accent color* = blue | `--accent` declared once in design-tokens.css | `apps/pragma/site/src/styles/design-tokens.css` | `--accent: #2d5fa0;` | PASS |
| A10 | Q.O.D. *Offline cache scope* = next session only via `/api/offline-manifest` precache | SW caches all session reads stale-while-revalidate; **no `/api/offline-manifest` endpoint**, no "next-session selector" logic, no `manifest.utils.ts` | `apps/pragma/site/public/sw.js:41-53` | `function isReadableApiPath(pathname) { ... if (pathname === '/api/sessions') return true; ... }` — caches every session, not "next only" | **FAIL** |
| A11 | Q.O.D. *Energy viz* = single-setlist sparkline | `energy-curve.core.ts` + `sparkline.utils.ts` + integrated in editor | `apps/pragma/api/src/setlists/energy-curve.core.ts`, `apps/pragma/site/src/routes/setlists/sparkline.utils.ts` | both files present with sibling tests | PASS |
| A12 | Q.O.D. *Chord chart formats* = chordpro \| pdf \| image (discriminated union) | Zod union enforced at controller boundary | `apps/pragma/api/src/songs/songs.controller.ts:36-40` | `z.union([z.object({kind:z.literal('chordpro'), text:...}), z.object({kind:z.literal('pdf'),...}), z.object({kind:z.literal('image'),...})])` | PASS |
| A13 | Q.O.D. *Embeds* = iframes for Spotify/Deezer/YouTube — provider-detection util | Plan called for `embed.utils.ts` (100% gated) — **file absent**; song detail renders external links but not iframes | `apps/pragma/site/src/routes/catalog/SongDetailPage.tsx` | `grep iframe apps/pragma/site/src/` returns nothing | **FAIL** |
| A14 | Q.O.D. *DB seed* = manual UI | No seed Lambda in CDK; first deploy ships empty DB | `apps/pragma/cdk/lib/stack.ts` (no seed asset) | grep confirms — no `Function` / lambda asset for seeding | PASS |
| A15 | Q.O.D. *friendsCountPerMember* — each member fills their own count on concert | Per-member input on concert detail | `apps/pragma/site/src/routes/sessions/SessionDetailPage.tsx` (concert friend-count form) | session-detail back-e2e covers PUT shape | PASS |
| A16 | Q.O.D. *User-facing language* = FR + EN i18n with parity test | `react-i18next` + en.json/fr.json + `i18n-parity.core.ts` gating test | `apps/pragma/site/src/i18n/i18n-parity.core.test.ts:8-10` | `expect(diff).toEqual({ missingInEn: [], missingInFr: [] })` PASSES | PASS |
| A17 | Use case 1.5 (ChordPro tonality auto-deduce) | `tonality.core.ts` returns `null` on missing/malformed | `apps/pragma/api/src/songs/tonality.core.ts` (+ `.test.ts`) | tonality.core.test fixtures cover ambiguous → null | PASS |
| A18 | Use case 2 — setlist editor drag-reorder (designer pass: `handle` drag pattern) | Implementation uses up/down buttons, not drag | `apps/pragma/site/src/routes/setlists/SetlistEditor.tsx:7` | `/** Reordering uses up/down buttons rather than HTML5 drag (handle pattern from the design bundle stays a v2 polish — buttons cover the same intent…) */` — explicitly punted | **FAIL** |
| A19 | Use case 2.4 — transition warning surface with side-gutter visual | warning marker rendered between consecutive rows; comment modal opens on click | `apps/pragma/site/src/routes/setlists/SetlistEditor.tsx`, `TransitionCommentModal.tsx` | transition computed via `evaluateTransition`; modal exists | PASS |
| A20 | Use case 4.3 — stale-bar banner at login for bars w/ no interaction >N days (default 60) | **Not implemented**; no banner in `BarsPage.tsx` or `AppShell.tsx` | `apps/pragma/site/src/routes/bars/BarsPage.tsx` | `grep -nE 'stale\|banner\|STALE' apps/pragma/site/src/routes/bars/` returns nothing | **FAIL** |
| A21 | Use case 5 — PWA caches "next upcoming session's setlist only" | SW caches every session GET, not just the next | `apps/pragma/site/public/sw.js:46-49` | covered in A10 | (rolled into A10) |
| A22 | Spec route `/sessions/<id>/setlist` | Setlist editor is **embedded** inside `/sessions/<id>` rather than a dedicated route | `apps/pragma/site/src/App.tsx:31` | `<Route path="/sessions/:sessionId" element={<SessionDetailPage />} />` (no `/setlist` subroute) | Note (functionally equivalent; deviation from spec verbatim) — **PASS with note** |
| A23 | Domain model: MASTERY_DEFAULT + MASTERY_OVERRIDE unique indexes | Drizzle schema + back-e2e | `apps/pragma/api/src/database/schema.ts`; back-e2e `mastery.controller.test.ts` | constraint verified in tests | PASS |
| A24 | Domain model: SETLIST_ENTRY position index | Drizzle index `(setlist_id, position)` | `apps/pragma/api/src/database/schema.ts` | drizzle migration includes the index | PASS |
| A25 | Files-to-change: `apps/pragma/cdk/` — composes PreviewableApp + DsqlCluster + uploads bucket | Stack composes PreviewableApp + S3 + CORS PUT/GET; DsqlCluster is its own stack in `bin/cdk.ts`; no SecretsManager (ADR-0004) | `apps/pragma/cdk/lib/stack.ts:50-96`, `cdk/bin/cdk.ts:52` | `new PreviewableApp(...)`, `new Bucket(...)`, `new DsqlClusterStack(...)` | PASS |
| A26 | Files-to-change: `apps/pragma/site/src/sw/` — service worker | SW file present at `site/public/sw.js`; `register-sw.ts` registers it | `apps/pragma/site/public/sw.js`, `apps/pragma/site/src/sw/register-sw.ts` | both present | PASS |
| A27 | Plan: `apps/pragma/api/src/auth/bootstrap.handler.ts` for `set-password` first-time | Implemented inline on `auth.controller.ts` as `POST /api/admin/set-password`, gated by "row absent" | `apps/pragma/api/src/auth/auth.controller.ts` | back-e2e: 2nd set-password attempt 401s | PASS |

---

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | `pnpm exec biome lint apps/pragma/` clean | `pnpm exec biome lint apps/pragma/` | `Checked 100 files in 1341ms. No fixes applied. exitcode=0` | PASS |
| B02 | `pnpm exec knip` clean (workspace-wide) | `pnpm exec knip` | one configuration *hint* (`Remove from ignoreDependencies`), zero unused exports / files / deps | PASS |
| B03 | No `any` outside comments | `grep -rEn '\bany\b' apps/pragma/{site,api,cdk}/` | every hit is in a comment string | PASS |
| B04 | Banned type assertions absent (only `as const` / `as unknown`) | `grep -rEn ' as [A-Z][a-zA-Z]*' apps/pragma/{site,api,cdk}/ \| grep -v 'as const\|as unknown'` | no matches | PASS |
| B05 | `useEffect` — every introduced effect justifies itself | Walked 12 `useEffect` sites across `routes/**` and `components/**`. Patterns observed: (i) fetch-on-mount with a `cancelled` flag (RequireSession, CatalogPage, SongDetailPage, SessionsPage, SessionDetailPage, BarsPage, InstrumentsPage, MembersPage, MasteryPage, SetlistEditor, TransitionCommentModal) — synchronising React state with the network, a legitimate external system; (ii) `window.addEventListener('online'/'offline')` in OfflineBanner.tsx — the canonical `addEventListener` case. None watch React state to set other React state. | PASS-with-note |
| B06 | Magic numbers extracted | Sample: `SCORE_MIN`, `SCORE_MAX`, `ENERGY_MIN`, `ENERGY_MAX`, `CHART_UPLOAD_CORS_MAX_AGE_SECONDS`, `ABORT_MULTIPART_UPLOAD_DAYS` declared as named consts | `songs.controller.ts:27-28`, `cdk/lib/stack.ts:36-37`, `MasteryPage.tsx` | PASS |
| B07 | Function names describe the result | Sample: `evaluateTransition`, `harmonicMembersIn`, `readableForeground`, `cellKey`, `diffCatalogs`, `isInParity` | per-file inspection | PASS |
| B08 | **Per-domain triad on the backend** (CLAUDE.md "Back-end domains are vertical slices, never horizontal aggregators" + the standard's new B-row). Each domain folder under `apps/pragma/api/src/` must carry `<domain>.controller.ts + <domain>.service.ts + <domain>.repository.ts + <domain>.schema.ts`. | Per-folder file census: `bars/`, `instruments/`, `members/`, `mastery/`, `sessions/`, `setlists/`, `songs/`, `transitions/`, `uploads/` ship **only `<domain>.controller.ts`** (plus `*.core.ts` inside the slice where applicable). Service / repository / schema layers are absent. The controllers inline Drizzle queries: `apps/pragma/api/src/songs/songs.controller.ts:117 — `await database.insert(songTable).values({...}).returning(SONG_PROJECTION)` (DB query inside the route handler, no repository). The reference shape under `apps/last-loop-lepin/api/src/{auth,edition,punch,runner,media}/` carries every layer. Only `auth/` partially complies (it has `app-config.repository.ts`, no service file). | **FAIL** |
| B09 | No horizontal aggregator folders (`domain/`, `controllers/`, `services/`, …) | `find apps/pragma/api/src -maxdepth 2 -type d` — only per-bounded-context folders. The mid-round `domain/` folder cleanup is complete. | PASS |
| B10 | `.core.ts` files live INSIDE their bounded context | `mastery.core.ts` in `mastery/`, `transition.core.ts` + `energy-curve.core.ts` in `setlists/`, `lineup.core.ts` + `tonality.core.ts` in `songs/` | PASS |
| B11 | Utilities ship at 100% coverage with sibling test | Census of `*.utils.ts` files: 8 found (`rate-limit`, `ip-hash`, `session-cookie`, `formatters`, `member-color`, `sw-cache`, `i18n`, `sparkline`) — **all** have matching `*.test.ts` siblings; runner picks them up | PASS |
| B12 | Code-language rule (English) | `grep -rE '(prenom\|lieu\|chanson\|salle)' apps/pragma/` returns nothing in source | PASS |

---

## C. Tests pass

| # | Workspace | Command | Result | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (typecheck) | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 (`tsc -p tsconfig.cdk.json --noEmit && tsc --noEmit`) | PASS |
| C02 | repo (lint) | `pnpm exec biome lint apps/pragma/` | exit 0 — 100 files checked | PASS |
| C03 | repo (knip) | `pnpm exec knip` | exit 0, one configuration hint (`Remove from ignoreDependencies`) | PASS |
| C04 | @borso-app/pragma (test:core) | `pnpm --filter @borso-app/pragma run test:core` | `Test Files 15 passed (15) / Tests 151 passed (151) — Duration 13.64s` | PASS |
| C05 | @borso-app/pragma (back-e2e) | `pnpm --filter @borso-app/pragma test` (via `scripts/local-postgres.sh`) | `Test Files 9 passed (9) / Tests 51 passed (51) — Duration 9.65s` | PASS |
| C06 | @borso-app/pragma (build) | `pnpm --filter @borso-app/pragma run build` | `✓ built in 1.55s` — `index-BI3JeLvV.js 389.76 kB / gzip 115.87 kB` | PASS |
| C07 | @borso-app/pragma (synth) | `pnpm --filter @borso-app/pragma run synth` | `Successfully synthesized to /home/user/borso.fr/apps/pragma/cdk.out` — both `pragma-prod` and `pragma-pr-1` stacks compose | PASS |

Note on CDK coverage: the per-stack tests at `apps/pragma/cdk/test/stack.test.ts` (8 tests) run inside the `test:core` project and pass. Spec/plan call this out (row #C04 = `test:core` includes `cdk/test/**`). The shared `infra/cdk/**` pre-commit coverage hook does not gate `apps/pragma/cdk/` — the gate is the in-app vitest project, which the round ran green.

---

## D. Test coverage of spec

Numbered happy-path steps (use cases 1, 1bis, 2, 3, 4, 5) are routed by the spec to `/visual-validation`; they are out of scope for this report. Deterministic / non-DOM behavioural assertions:

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Tonality auto-deduce from ChordPro (valid / ambiguous / missing) | `apps/pragma/api/src/songs/tonality.core.test.ts` — `it('ignores a chord-line if any token does not parse', …)` + ambiguous + missing fixtures | PASS |
| D02 | Transition warning rule (exhaustive table — same-member harmonic kept / switched / non-harmonic / same-song-twice) | `apps/pragma/api/src/setlists/transition.core.test.ts` — multiple `describe`s covering each branch | PASS |
| D03 | Lineup default + override resolution (absent / null / explicit-null-instrument) | `apps/pragma/api/src/songs/lineup.core.test.ts` | PASS |
| D04 | Energy-curve smoothing (nullable points, all-null, monotonic, peak) | `apps/pragma/api/src/setlists/energy-curve.core.test.ts` | PASS |
| D05 | Mastery `effective(member, instrument, song) = override ?? default` incl. `override = 0` falsy-trap | `apps/pragma/api/src/mastery/mastery.core.test.ts` — `effective` branch tests + `isRedundantOverride` | PASS |
| D06 | Mastery mean-for-song over lineup | `apps/pragma/api/src/mastery/mastery.core.test.ts` (`meanForSong`) | PASS |
| D07 | i18n catalog key-parity (no missing translation either side) | `apps/pragma/site/src/i18n/i18n-parity.core.test.ts:8-10` — `expect(diff).toEqual({ missingInEn: [], missingInFr: [] })` | PASS |
| D08 | Auth — rate-limit token-bucket math (5/15min/ip_hash) | `apps/pragma/api/src/auth/rate-limit.utils.test.ts` | PASS |
| D09 | Auth — back-e2e: 5 wrong → 429; rotate-password invalidates cookie; bootstrap 401s once a row exists | `apps/pragma/api/src/auth/auth.controller.test.ts` (`back-e2e`) | PASS |
| D10 | Catalog CRUD round-trip + JSONB shape rejected on malformed Zod input | `apps/pragma/api/src/songs/songs.controller.test.ts` (back-e2e) | PASS |
| D11 | Setlist concurrency last-write-wins; entries-reorder | `apps/pragma/api/src/setlists/setlists.controller.test.ts` | PASS |
| D12 | Sessions practice ↔ concert linkage (`preparedConcertId`) | `apps/pragma/api/src/sessions/sessions.controller.test.ts` | PASS |
| D13 | Bars CRM CRUD + status transitions | `apps/pragma/api/src/bars/bars.controller.test.ts` | PASS |
| D14 | Transition comment global-per-ordered-pair (A→B vs B→A distinct) | `apps/pragma/api/src/transitions/transition-comments.controller.test.ts > treats A→B and B→A as distinct rows` | PASS |
| D15 | Mastery defaults CRUD via API | `apps/pragma/api/src/mastery/mastery.controller.test.ts` | PASS |
| D16 | Members CRUD via API | `apps/pragma/api/src/members/members.controller.test.ts` | PASS |
| D17 | Instruments CRUD + `isHarmonic` toggle effect | `apps/pragma/api/src/instruments/instruments.controller.test.ts` | PASS |
| D18 | CDK stack — no Secrets Manager resources (ADR-0004) + uploads bucket shape + CORS pair + custom prod domain alias | `apps/pragma/cdk/test/stack.test.ts` (8 tests covering each assertion) | PASS |
| D19 | SW cache key — same chart with new `uploadedAt` produces different key (Risk-register row) | `apps/pragma/site/src/sw/sw-cache.utils.test.ts` | PASS |
| D20 | Plan: "next-session selector" — `manifest.utils.ts` empty/multiple/past-only fixtures | **Test file absent.** Plan row §Q.O.D. *Offline cache scope* required `manifest.utils.ts` with these fixtures; neither file nor test exists. Rolled up with A10. | **FAIL** |
| D21 | Plan: `embed.utils.ts` — Spotify/Deezer/YouTube → iframe URL; unknown → plain link | **Test file absent.** Rolled up with A13. | **FAIL** |

---

## Notes

> One bullet per FAIL or note-bearing row, expanding what was observed and what was missing.

- **A07 / A08 — Mastery matrix UI** (FAIL). Spec, use case 1bis: "User opens `/members`. Sees the 5-member × 7-instrument matrix, each cell holding a 0-10 score. Click a cell to edit; **scroll-wheel to ±1**; **right-click to clear**. **Row averages (per-member overall musicianship) and column averages (per-instrument bench strength) update live**." The implementation moves the matrix off `/members` to a dedicated `/mastery` route (acceptable as a UX split, but a divergence from the spec verbatim — kept as FAIL because the spec mounts it explicitly on `/members`); uses a plain `<input type="number">` instead of scroll-wheel ± and right-click clear; and renders no row/column averages. The spec averages are a live numeric, not UI-pretty-only — they are a category-A correctness claim, not a category-D unit-test claim.
- **A10 / D20 — Offline cache scope** (FAIL). Spec / Q.O.D. *Offline cache scope* = "next session only". Plan called for `apps/pragma/api/src/offline-manifest` endpoint + `apps/pragma/site/src/sw/manifest.utils.ts` (100% gated) implementing the "next-session selector" with empty / multiple / past-only fixtures. Implementation ships neither: the SW caches every `/api/sessions/<id>` and `/api/setlists/by-session/<id>` GET stale-while-revalidate, so it incidentally caches whatever the user happens to read, including past sessions and far-future sessions — opposite of the spec's bound. Risk: PWA cache budget unbounded, and the "the concert you are heading to is the one cached" property the spec asserts is not enforced.
- **A13 / D21 — Embeds** (FAIL). Q.O.D. *Embeds* = iframes. Plan row called for `embed.utils.ts` (100% gated) detecting Spotify / Deezer / YouTube and producing iframe URLs. The file does not exist; `SongDetailPage.tsx` renders external links as plain `<a>` tags. The user-visible *Result* section of the spec lists iframe embedding as functional requirement.
- **A18 — Setlist drag-reorder** (FAIL). Spec use case 2: "Drags songs from the catalog into ordered positions." Designer-pass row: "**mobile drag pattern: `handle`**". `SetlistEditor.tsx:7` explicitly states "Reordering uses up/down buttons rather than HTML5 drag (handle pattern from the design bundle stays a v2 polish — buttons cover the same intent and are accessible without pointer drag)." This is a deliberate punt of a spec-pinned requirement; it cannot ship as v1 without a spec amendment.
- **A20 — Stale-bar banner** (FAIL). Spec use case 4.3: "At login, the app surfaces an in-app banner for bars with no interaction for >N days (N to define with designer; default 60)." `grep -nE 'stale|banner|STALE' apps/pragma/site/src/routes/bars/` returns no matches; no `lastInteractionAt` evaluation against `STALE_BAR_DAYS` is implemented; `AppShell.tsx` mounts only the `OfflineBanner`.
- **A22 — Setlist route shape** (PASS-with-note). Spec lists `/sessions/<id>/setlist` as its own route group. Implementation embeds `SetlistEditor` inside `SessionDetailPage`. Functionally equivalent — the user reaches the editor from the session detail page in one click. Kept as a note rather than a FAIL because the spec's use-case sequence ("opens the concert, taps 'build setlist'") does not require the URL to carry a `/setlist` suffix.
- **B05 — `useEffect` audit** (PASS-with-note). 12 effects across the front-end. Every one is either (a) a fetch-on-mount synchronising React state with the network, with a `cancelled` cleanup flag, or (b) `window.addEventListener('online'/'offline')` in `OfflineBanner.tsx`. No effect watches React state to set other React state; no derived-state-via-effect anti-pattern observed. The pattern is borderline ("could `useSyncExternalStore` cover the online listener?") but defensible; no FAIL row.
- **B08 — Per-domain triad** (FAIL). The standard's freshly-added bullet (CLAUDE.md "Back-end domains are vertical slices, never horizontal aggregators"; technical-validation standard B.*Per-domain triad on the backend*) requires `<domain>.controller.ts + <domain>.service.ts + <domain>.repository.ts + <domain>.schema.ts` per bounded context. Pragma ships controllers only. Concrete signature of the failure: `apps/pragma/api/src/songs/songs.controller.ts:114-130` inlines a Drizzle `database.insert(songTable).values({...}).returning(...)` call inside the route handler — exactly the shape the standard names as FAIL ("A controller file with DB queries inlined… FAILs the row even if a `<domain>.service.ts` exists"). The pragma controllers don't even have a service file to delegate to. The reference shape under `apps/last-loop-lepin/api/src/{auth,edition,punch,runner,ranking,media}/` shows the full triad; pragma is one round of refactoring short. **Note for context:** the mid-round refactor that removed the `domain/` aggregator (B09 PASS) did not finish the job — it dissolved horizontal aggregators into vertical slices but didn't grow the per-slice layered triad. Round-3 implementation must add service + repository + schema files per domain and route the controller through them.
- **D20 / D21 — Coverage misses** for the absent utils files (`manifest.utils.ts`, `embed.utils.ts`). Each rolls up into its A-row but is restated under D to make the coverage-gate gap explicit.

Positives worth noting:
- Auth path is now correctly gated end-to-end (round-1's bypass on `rotate-password` is fixed and tested).
- The Q.O.D. user-language pair (FR + EN) ships with the gated i18n-parity test from day 1 — a piece of infrastructure that prevents the silent drift the plan's risk register named.
- 151 core + 51 back-e2e tests all green, including CDK stack tests that lock the ADR-0004 "no SecretsManager resource" assertion into a regression gate.

---

## Verdict: FAIL

Aggregated row counts (full-spec scope):

- Category A: 22 PASS, 5 FAIL (A07, A08, A10, A13, A18, A20 — A21 rolled into A10)
- Category B: 11 PASS, 1 FAIL (B08)
- Category C: 7 PASS, 0 FAIL
- Category D: 19 PASS, 2 FAIL (D20, D21 — rolled up from A-row failures, restated for the coverage gate)

Per the standard: ≥1 FAIL row → FAIL. **Not mergeable as-is.**

Recommended next step: `next.kind: fix`. Specifically: (1) implement service + repository + schema layers per domain (B08); (2) ship the spec's missing UI items — drag-reorder (A18), stale-bar banner (A20), live row/column averages + scroll/right-click on the mastery matrix (A07), mount the matrix on `/members` per the spec (A08); (3) ship the `embed.utils.ts` + iframe embeds (A13/D21); (4) ship the `/api/offline-manifest` + `sw/manifest.utils.ts` "next-session selector" (A10/D20). Then re-run `/technical-validation`.
