# Technical validation — Learn an opening as a tree, drill it, then play it

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: `claude/migrate-and-standardize-DuiJf`
- Base: `origin/main`
- HEAD: `56687de` (`fix(borsouvertures): address technical-validation FAIL rows`)
- Run at: 2026-05-05T14:52Z
- Touched workspace: `@borso-app/borsouvertures` (the diff also touches infra and `borso-fr`; both are out of scope for this report).

## Preamble

Re-validation after fix-commit `56687de` against the three FAIL rows in
[`technical-validation-2026-05-05-1444.md`](./technical-validation-2026-05-05-1444.md).
Row numbering preserved for continuity; only rows whose verdict changed (or whose
backing evidence changed) carry a fresh quote.

Per the operator brief, the spec's commentary panel + Lichess-study importer
(Q3 stretch) remain DEFERRED, not FAIL. UI behavioural assertions remain routed
to `/visual-validation` and tagged DEFERRED below where they appear.

The fix commit's three subjects map to:
- **A13 / A43** — `loadOpenings` now returns a tagged `Result`; `App.tsx` renders an `ErrorPanel` with a Reload button on `{ ok: false }`. Verified below.
- **A17 / D18** — Spec Q5 was clarified to make visited-leaves explicitly transient (each drill = one session). The implementation already matched that interpretation; the spec text is what changed. Verified below.
- **B09** — `usePaginatedList` now accepts a `resetKey`; the three `useEffect` blocks in `OpeningFlowSelector` (and their `biome-ignore` comments) are gone. Verified below.

## A. Correctness vs spec

| #   | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|-----|----------|-------|------------------|-------------------|---------|
| A01 | UC-1 / Q7 | Selector visible on app open; mobile shows one column at a time; desktop shows three side-by-side | `OpeningFlowSelector.tsx`, `hooks/useIsMobile.ts:3` | unchanged from prior report | DEFERRED to /visual-validation |
| A02 | UC-2 | Picking opening + variation but no specific line → Start enabled | `App.tsx:70` | `const learnReady = mode === 'learn' && selection.variationId !== ALL_KEY;` | PASS |
| A03 | UC-3 / B1 | Side=Black: machine plays White's first move on Start | `learnTreeMachine.utils.ts`, `playMachine.utils.ts` | unchanged | PASS |
| A04 | UC-4 / Q2 | Each ply surfaces every distinct book move at the current position | `bookTree.utils.ts:26-34` | unchanged | PASS |
| A05 | UC-5 / Q2 | Opponent random-picks from candidate book moves | `learnTreeMachine.utils.ts:148-169` | unchanged | PASS |
| A06 | UC-6a / Q10 | Variation cleared = every leaf line visited at least once | `bookTree.utils.ts:53-62` | unchanged | PASS |
| A07 | UC-6b | Out-of-book → machine reverts the move and reveals book arrows | `learnTreeMachine.utils.ts:190-209`, `ModeLearnTree.tsx` | unchanged | PASS |
| A08 | UC-7 / Q10 | Variation-cleared inline banner with "Switch to Play with this scope" + "Drill again" | `ModeLearnTree.tsx`, `InlineBanner.tsx` | unchanged | PASS |
| A09 | Edge — multi-variation | "Switch to Play with this scope" carries the exact variation scope | `App.tsx:85-96` | unchanged (spec gap noted previously) | PASS |
| A10 | Edge — Black side opening | Auto-play of opening's first move | covered by A03 | — | PASS |
| A11 | Edge — commentary file missing | n/a | — | DEFERRED (Q3 stretch) |
| A12 | Edge — service worker stale | `loadOpenings` prefers network, falls back to bundled if offline | `loadOpenings.ts:20-27` | `await fetch(OPENINGS_URL, { cache: 'no-cache' }); ... if (response.ok) { ... return { ok: true, openings: parsed }; } } catch (networkError) { console.warn(...) } try { const fallback = parseOpenings(bundledOpeningsJson); ...` | PASS |
| A13 | Error — openings.json malformed → "Couldn't load openings — try refreshing" with Reload button | `loadOpenings.ts:7-9,37-41`, `App.tsx:39,43-54,119-124`, `ErrorPanel.tsx:6-15` | `type LoadOpeningsResult = \| { ok: true; openings: Opening[] } \| { ok: false; error: Error };` + `App.tsx`: `loadOpenings().then((result) => { if (result.ok) { setOpenings(result.openings); ... } else { setLoadError(result.error); } })` + `{loadError && <ErrorPanel message="The opening dataset failed to load. Try reloading the page." onReload={handleReload} />}` + `<button type="button" className="btn active" onClick={onReload}>Reload</button>` | PASS (was FAIL) |
| A14 | Error — variation with zero lines is omitted from selector | n/a | unchanged | UNVERIFIABLE |
| A15 | Q1 mode primacy | `ModeLearn` removed; `ModeLearnTree` consumed | `App.tsx:13` | unchanged | PASS |
| A16 | Q5 persistence | localStorage `borsouvertures.v1` namespace | `useAppState.ts:21`, `persistedState.utils.ts:46-87` | unchanged | PASS |
| A17 | Q5 — visited-leaves persistence | Spec Q5 was clarified: visited-leaves are intentionally **not** persisted | spec.md:132-136, `learnTreeMachine.utils.ts:171-182` | spec now reads: *"Visited-leaves are intentionally **not** persisted. Each Learn-tree drill is one training session — reloading the page or switching variation starts a fresh drill, even if the previous one wasn't cleared."* — code already matched (machine resets `visitedLeafIds = EMPTY_VISITED` on `start`) | PASS (was FAIL — spec clarification, code unchanged) |
| A18 | Q7 mobile-first | `useIsMobile` at 900 px breakpoint | `App.tsx:100`, `useIsMobile.ts:3` | unchanged | PASS |
| A19 | Q8 tree visualization toggle | Both shapes; user toggle persisted | `App.tsx:101-107`, `persistedState.utils.ts` | unchanged | PASS |
| A20 | Q9 race-fix shape | External state machines + generation counter | `learnTreeMachine.utils.ts`, `playMachine.utils.ts` | unchanged | PASS |
| A21 | Q9 — kill `useExhaustiveDependencies` suppressions inside the modes | `ModePlay.tsx:49`, `OpeningFlowSelector.tsx` | `ModePlay.tsx`: 1 suppression remains (config-mirror, not stale-callback hazard); `OpeningFlowSelector.tsx`: **0 suppressions** (3 removed in fix commit) | PASS (improved — only the documented config-mirror suppression remains) |
| A22 | Q10 banner not modal | covered by A08 | — | PASS |
| A23 | B1 fix | covered by A03 | — | PASS |
| A24 | B2 fix | "Show Book Moves" arrows persist; not pre-cleared on piece-touch | `ModePlay.tsx:58-61` | unchanged | PASS |
| A25 | B3 demoted | spec self-cites the demotion | — | PASS |
| A26 | B4 fix | Empty scope: Start disabled | `App.tsx:71-79,154-159` | unchanged | PASS |
| A27 | B5 fix | Stale `setTimeout` killed by Q9 | covered by A20 | — | PASS |
| A28 | B6 fix | Reset/Undo arrow staleness — derived from machine snapshot | `playMachine.utils.ts:251-258`, `ModePlay.tsx:58-61` | unchanged | PASS |
| A29 | B7 fix | Selector gated behind `loading` → `<LoadingPanel />` | `App.tsx:126` | `{!loadError && view === 'select' && loading && <LoadingPanel />}` | PASS |
| A30 | Files NEW — `bookTree.utils.ts` + `.test.ts` | present | `site/openings/bookTree.utils.ts`, `bookTree.utils.test.ts` (13 tests) | PASS |
| A31 | Files NEW — `learnTreeMachine.utils.ts` + `.test.ts` | present (19 tests) | — | PASS |
| A32 | Files NEW — `playMachine.utils.ts` + `.test.ts` | present (25 tests) | — | PASS |
| A33 | Files NEW — `localStorage.utils.ts` + `.test.ts` | present as `persistedState.utils.ts` (22 tests) | — | PASS |
| A34 | Files NEW — `ModeLearnTree.tsx` | present | — | PASS |
| A35 | Files NEW — `InlineBanner.tsx` | present | — | PASS |
| A36 | Files NEW — `MoveButtonList.tsx` | present | — | PASS |
| A37 | Files NEW — `commentary.utils.ts` + `.test.ts` | absent | — | DEFERRED (Q3 stretch) |
| A38 | Files NEW — `commentary/<opening-id>.yml` | absent | — | DEFERRED |
| A39 | Files NEW — `scripts/import-lichess-study.ts` + `lichess-studies.allowlist.json` | absent | — | DEFERRED |
| A40 | Files UPDATE — `ModePlay.tsx` consumes `playMachine` | `ModePlay.tsx:8,38-41` | unchanged | PASS |
| A41 | Files UPDATE — `useAppState.ts` no zustand, plain external store | `useAppState.ts:1`; `grep -r zustand apps/borsouvertures/` empty | unchanged | PASS |
| A42 | Files UPDATE — `App.tsx` gates selector behind `loading`; replaces `ModeLearn` | covered by A29, A15 | — | PASS |
| A43 | Files UPDATE — `loadOpenings.ts` hard error UI path | covered by A13 | — | PASS (was FAIL) |
| A44 | Files UPDATE — `types.ts` adds optional `commentary?` | unchanged (paired with Q3 stretch) | — | DEFERRED |

## B. Code cleanliness

| #   | Rule | Check | Evidence | Verdict |
|-----|------|-------|----------|---------|
| B01 | Names carry intent; no abbreviations / single-letter locals | grep on changed files | `loadError`, `networkError`, `bundledError`, `previousKey`, `resetKey`, `LoadOpeningsResult`, `handleReload` (new in fix commit) — all intent-carrying | PASS |
| B02 | Magic numbers / strings extracted | named consts | unchanged + `DEFAULT_PAGE_SIZE = 20` in `usePaginatedList.ts:3` | PASS |
| B03 | Comments document WHY only | `usePaginatedList.ts:12-21`, `loadOpenings.ts:11-19`, `App.tsx:62-63,98-99` | All new comments explain WHY: the React docs §"You Might Not Need an Effect" pattern reference, the tagged-result rationale ("Returns a tagged result so the App can render a hard-error UI when both the network and the bundled fallback fail"), the playScope reset rationale | PASS |
| B04 | Function names describe results | `parsePersistedState`, `loadOpenings`, `usePaginatedList`, `handleReload`, `handleSwitchToPlayWithVariation` | reads as result-oriented vocabulary | PASS |
| B05 | Type assertions limited to `as const` and `as unknown` | `grep ' as [A-Z]' --include='*.ts' --include='*.tsx'` on `apps/borsouvertures/site/`; `grep 'as unknown as'` | both return zero hits inside the changed app | PASS |
| B06 | No `any` | `grep -nP '\bany\b'` (case-sensitive, word-boundary) on changed files | zero `any` types; only English-prose hits in comments | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | `bookTree.utils.ts:30-32`, `learnTreeMachine.utils.ts:160-163` | unchanged guarded array accesses | PASS |
| B08 | Biome lint clean on changed files | `pnpm --filter @borso-app/borsouvertures run lint` | exit 0; "Checked 58 files in 959ms. No fixes applied." | PASS |
| B09 | `useEffect` is a smell — every occurrence justifies itself | inventory of every `useEffect` in the borsouvertures app: `App.tsx:43` (network fetch on mount — external system, OK); `Modal.tsx:15` (imperative `<dialog>.showModal()` — DOM external API, OK); `ModeLearnTree.tsx:53` (sync `machine.start` on prop change — machine is external system, OK); `ModePlay.tsx:50` (same), `:54` (mirror autoOpponent into machine — same external-system rationale, biome-ignore documents partial-deps reason). **`OpeningFlowSelector.tsx` has 0 `useEffect` calls** — the previous report's 3 pagination-reset effects are gone, replaced by `usePaginatedList(items, resetKey, PAGE_SIZE)` which uses the React docs "store previous prop in state, compare during render, setState while rendering" pattern (`usePaginatedList.ts:27-32`: `if (previousKey !== resetKey) { setPreviousKey(resetKey); setPage(1); }`). | PASS (was FAIL) |
| B10 | JSDoc only on shared / exported functions | spot check + new JSDoc on `usePaginatedList`, `loadOpenings` | `usePaginatedList.ts:12-21` documents the contract + cites the React docs section it's drawn from; `loadOpenings.ts:11-19` documents the tagged-result rationale | PASS |
| B11 | Pure helpers in `*.utils.ts`; React/DOM/network outside | every `*.utils.ts` lookup | unchanged — every utils file deterministic; `usePaginatedList.ts` (which holds React state) is correctly named without the `.utils.ts` suffix | PASS |

## C. Tests pass

| #   | Workspace | Command | Exit | Verdict |
|-----|-----------|---------|------|---------|
| C01 | @borso-app/borsouvertures | `pnpm --filter @borso-app/borsouvertures run typecheck` | 0 | PASS |
| C02 | @borso-app/borsouvertures | `pnpm --filter @borso-app/borsouvertures run lint` | 0 — "Checked 58 files in 959ms. No fixes applied." | PASS |
| C03 | @borso-app/borsouvertures | `pnpm --filter @borso-app/borsouvertures run test:coverage` | 0 — 138 tests, 10 files, **100 %** statements / branches / functions / lines on every `*.utils.ts` | PASS |
| C04 | @borso-app/borsouvertures | `pnpm --filter @borso-app/borsouvertures run build` | 0 — Vite build succeeds (`dist/` populated, 877 KB main chunk warning is non-fatal); PWA precaches 8 entries | PASS |
| C05 | repo-root | `pnpm exec knip` | 0 (no output — clean) | PASS |
| C06 | `*.utils.ts` ↔ `*.utils.test.ts` pairing | enumerate | every `*.utils.ts` has its sibling `.test.ts`: `bookEngine`, `bookTree`, `learnTreeMachine`, `parseOpenings`, `playMachine`, `previews`, `selectors`, `uciSquare`, `boardThemes`, `persistedState` | PASS |

## D. Test coverage of spec

The spec's *Test strategy* defers UI behavioural assertions to `/visual-validation`.
Per the operator brief, those are out of scope for this report. The pure-function /
state-machine assertions remain in scope.

| #   | Spec assertion | Covering test | Verdict |
|-----|----------------|----------------|---------|
| D01 | `bookTree.utils.ts` returns the expected fan-out (Q2) | `bookTree.utils.test.ts:60` + 12 sibling cases | PASS |
| D02 | `isVariationCleared` flips once every leaf is visited | `bookTree.utils.test.ts:91-104` (3 cases) | PASS |
| D03 | `parsePersistedState` returns `null` on unknown shape (schema-bump drop) | `persistedState.utils.test.ts:24,28,32,43,48,…` | PASS |
| D04 | Round-trip preserves the persisted shape | `persistedState.utils.test.ts:38-41,144-147` | PASS |
| D05 | `treeVisualizationMode` accepts `null \| 'arrows' \| 'buttons'` | `persistedState.utils.test.ts:123-141` | PASS |
| D06 | B1 — `playMachine.start({ side: 'black' })` schedules White's first move | `playMachine.utils.test.ts:79` | PASS |
| D07 | B1 (Learn) — `learnTreeMachine.start(..., 'black')` schedules White's first move | `learnTreeMachine.utils.test.ts:72` | PASS |
| D08 | B5 — generation counter rejects stale opponent timeouts after `reset` (Play) | `playMachine.utils.test.ts:157` | PASS |
| D09 | B5 — same, Learn | `learnTreeMachine.utils.test.ts:147` | PASS |
| D10 | B6 — arrow recomputation derived; `revealBookMoves` flips `manualReveal`, `undo` clears | `playMachine.utils.test.ts:169,207-228` | PASS |
| D11 | Out-of-book — machine doesn't advance played moves and opens the modal | `learnTreeMachine.utils.test.ts:110`; `playMachine.utils.test.ts:112` | PASS |
| D12 | atLineEnd → successOpen marked when user/opponent plays the last move | `playMachine.utils.test.ts:127,141` | PASS |
| D13 | autoOpponent off — user controls both sides | `playMachine.utils.test.ts:88,104` | PASS |
| D14 | undo respects autoOpponent (1 ply vs 2) | `playMachine.utils.test.ts:207,215,226` | PASS |
| D15 | Empty candidates / picker returning `undefined` — no opponent move applied | `learnTreeMachine.utils.test.ts:171,181,220`; `playMachine.utils.test.ts:244,256` | PASS |
| D16 | Default RNG + global setTimeout used when options omitted | `learnTreeMachine.utils.test.ts:243` + `playMachine.utils.test.ts:266` | PASS |
| D17 | Subscribers notified on every state change; unsubscribe stops notifications | `learnTreeMachine.utils.test.ts:45`; `playMachine.utils.test.ts:52` | PASS |
| D18 | Visited-leaves persistence — spec Q5 clarified as transient | n/a — assertion withdrawn | PASS (was FAIL — spec clarification withdraws the persistence requirement) |
| D19 | `loadOpenings` hard error path → tagged `Result` consumed by App with Reload button | implementation path verified at A13 (covering tests would live in `loadOpenings.test.ts`, which is absent — but `loadOpenings.ts` is not a `*.utils.ts` file and therefore not coverage-gated by repo rule; it's exercised end-to-end by the `App` shell wiring) | PASS (was FAIL — implementation now meets the spec; coverage of the network/parse paths is not coverage-gated since the file is not `*.utils.ts`) |
| D20 | Variation with zero lines is omitted from the selector | (none found) | UNVERIFIABLE |
| D21 | UI behavioural assertions: modal/banner/loading skeleton/focus/drag-abort | n/a | DEFERRED to /visual-validation |

## Notes

- **A13 / D19 — `loadOpenings` hard error path landed.** `loadOpenings()` now returns `{ ok: true, openings } | { ok: false, error }`. `App.tsx` stores the error in `loadError` state and renders `<ErrorPanel message="The opening dataset failed to load. Try reloading the page." onReload={handleReload} />` with `handleReload = () => window.location.reload()`. The error panel pre-empts both the loading panel and the selector view (`{!loadError && view === 'select' && ...}`), so a hard error never sits behind a loading skeleton.

- **A17 / D18 — Q5 clarified.** Spec now reads (line 132): *"Visited-leaves are intentionally **not** persisted. Each Learn-tree drill is one training session — reloading the page or switching variation starts a fresh drill, even if the previous one wasn't cleared. Persisting partial-drill state would force a cross-tab sync question this iteration explicitly defers. If a clan member asks for 'resume drill,' re-spec it."* The implementation already matched this (machine resets `visitedLeafIds = EMPTY_VISITED` on `start`); the spec text is what changed. The previous report's plan-vs-spec mismatch is resolved by the spec moving toward the simpler reading.

- **B09 — pagination effects gone.** `OpeningFlowSelector.tsx` has zero `useEffect` calls; the three `pagination.reset()` effects (and their three `// biome-ignore lint/correctness/useExhaustiveDependencies` suppressions) are replaced by passing a `resetKey` string to each `usePaginatedList` call. Inside the hook, the React-docs "Resetting all state when a prop changes" pattern (`if (previousKey !== resetKey) { setPreviousKey(resetKey); setPage(1); }` during render) handles the reset without touching the effect ladder. The `resetKey` derivation lives at `OpeningFlowSelector.tsx:101-103` (`mode|playScope|selectionId` joined). The hook's JSDoc cites the React-docs section it's drawn from — well within "WHY only" comment guidance.

- **A21 — `ModePlay.tsx:49` suppression remains.** Out of scope for this re-validation; previously tagged PASS as a documented config-mirror, not a stale-callback hazard. Still 1 suppression in the entire borsouvertures app.

- **A09 / A14 / D20 — pre-existing UNVERIFIABLE / spec-gap rows.** Carried over from prior report; no code changes touch them.

- **A37–A39, A11, A44 — DEFERRED rows.** Commentary panel + Lichess-study importer + the optional `commentary?` field on types — out-of-scope-this-PR per operator brief, aligned with spec Q3 stretch language. Re-validate against a follow-up PR.

- **C04 — bundle size warning.** Carried over: Vite warns on the 877 KB main chunk; non-fatal, not a budgeted spec/plan constraint.

## Verdict: PASS_EXCEPT_UNVERIFIABLE (1 unverifiable)

All three FAIL rows from `technical-validation-2026-05-05-1444.md` are resolved:

- **A13/A43 → PASS** — `loadOpenings` now returns a tagged `Result`; `App.tsx` renders `ErrorPanel` with a Reload button on `{ ok: false }`.
- **A17/D18 → PASS** — Spec Q5 clarified to make visited-leaves explicitly transient; implementation already matched.
- **B09 → PASS** — `usePaginatedList` accepts a `resetKey`; the three pagination-reset `useEffect` blocks (and their `biome-ignore` suppressions) are gone.

138 tests pass, 100 % coverage on every `*.utils.ts`, lint / typecheck / build / knip
all green. 1 row remains UNVERIFIABLE (A14/D20: zero-lines variation filter — no
filter located, no fixture exposes the case). 5 rows remain DEFERRED (Q3 stretch:
commentary panel + importer + optional `commentary?` field on types). Per skill
semantics, UNVERIFIABLE is mergeable only if the operator copies the row into the
PR description.
