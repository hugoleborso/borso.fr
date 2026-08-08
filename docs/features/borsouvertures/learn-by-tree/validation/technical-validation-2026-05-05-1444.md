# Technical validation — Learn an opening as a tree, drill it, then play it

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: `claude/migrate-and-standardize-DuiJf`
- Base: `origin/main`
- Run at: 2026-05-05T14:44Z
- Touched workspace: `@borso-app/borsouvertures` (the diff also touches infra and `borso-fr`; both are out of scope for this report).

## Preamble

Per the operator brief, the spec's commentary panel + Lichess-study importer (Q3 stretch) are
acknowledged out-of-scope-this-PR — the `commentary.utils.ts`, `commentary/<opening-id>.yml`,
`scripts/import-lichess-study.ts`, and `scripts/lichess-studies.allowlist.json` files listed in
the spec's *Changes* section are intentionally absent. Tagged DEFERRED, not FAIL.

Per the same brief, UI behavioural assertions — modal opens, banner displays, mobile-default
button list, loading skeleton, focus management — are routed to `/visual-validation` and tagged
DEFERRED below where they appear.

The plan trades two file names against the spec without altering behaviour:
- `localStorage.utils.ts` (spec) lives as `persistedState.utils.ts`. The `borsouvertures.v1`
  namespace, drop-on-bump semantics, and the read/write API are present; only the file name
  differs.
- `LoadingPanel.tsx` ships (plan named it under "Files NEW"). Spec's `loadOpenings.ts` "hard
  error UI path with single Reload button" was not implemented — `loadOpenings` console-warns
  and returns the bundled fallback, then continues to bundled-empty if that also throws. Tagged
  in A12 below.

## A. Correctness vs spec

| #   | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|-----|----------|-------|------------------|-------------------|---------|
| A01 | UC-1 / Q7 | Selector visible on app open; mobile shows one column at a time; desktop shows three side-by-side | `apps/borsouvertures/site/components/OpeningFlowSelector.tsx`, `hooks/useIsMobile.ts:3` | `MOBILE_BREAKPOINT_PX = 900` + selector flow uses `useIsMobile()` | DEFERRED to /visual-validation (UI behaviour) |
| A02 | UC-2 | Picking opening + variation but no specific line → Start enabled with intent "drill the variation tree" | `apps/borsouvertures/site/App.tsx:57` | `const learnReady = mode === 'learn' && selection.variationId !== ALL_KEY;` | PASS |
| A03 | UC-3 / B1 | Board orients to the user's chosen side; if Black, the machine plays White's first move on Start | `apps/borsouvertures/site/openings/learnTreeMachine.utils.ts:171-182`, `playMachine.utils.ts:193-203` | `start(...) { ... generation += 1; notify(...); scheduleOpponentMove(...); }` and `scheduleOpponentMove` early-returns on non-opponent ply, so White-on-side=Black is auto-played | PASS (covered by `learnTreeMachine.utils.test.ts:72` "plays White's first move when side is Black" + `playMachine.utils.test.ts:79` "plays White's first move when side is Black (B1)") |
| A04 | UC-4 / Q2 | Each ply surfaces every distinct book move at the current position across still-matching lines | `apps/borsouvertures/site/openings/bookTree.utils.ts:26-34` | `nextMovesAt` collects `next` over `linesMatchingPrefix` into a `Set` and returns the array | PASS |
| A05 | UC-5 / Q2 | Opponent random-picks from candidate book moves and the machine advances | `apps/borsouvertures/site/openings/learnTreeMachine.utils.ts:148-169` | `scheduleOpponentMove`: `const candidates = nextMovesAt(...); const choice = pickRandom(candidates); ... applyUciToBoard(choice);` | PASS |
| A06 | UC-6a / Q10 | Variation cleared = every leaf line visited at least once | `apps/borsouvertures/site/openings/bookTree.utils.ts:53-62` | `isVariationCleared`: `for (const line of variation.lines) { if (!visitedLeafIds.has(line.id)) return false; } return true;` | PASS |
| A07 | UC-6b | Out-of-book → machine reverts the move and reveals book arrows | `apps/borsouvertures/site/openings/learnTreeMachine.utils.ts:190-209`, `ModeLearnTree.tsx:137-156` | `playMove` on out-of-book sets `outOfBookOpen = true; notify(...); return 'rejected-out-of-book';` (board move never applied); UI then offers a Reveal book moves button | PASS (note: spec says "machine reverts the move" — the board-state move is never applied because `applyUciToBoard` is gated on `candidates.includes(uci)`; the *visual* revert behaviour is for /visual-validation) |
| A08 | UC-7 / Q10 | On variation cleared, an inline banner appears above the board (not a modal) with "Switch to Play with this scope" + "Drill again" | `apps/borsouvertures/site/modes/ModeLearnTree.tsx:89-97`, `components/InlineBanner.tsx:9-31` | `<InlineBanner message="Variation cleared — every line visited at least once" primaryLabel="Switch to Play with this scope" ... secondaryLabel="Drill again" onSecondaryClick={machine.reset} />` rendered inside `<div className="board-area">`, sibling to `BoardView` | PASS (visual placement deferred to /visual-validation) |
| A09 | Edge — multi-variation drill | "Switch to Play with this scope" carries the exact variation scope | `apps/borsouvertures/site/App.tsx:72-83` | `handleSwitchToPlayWithVariation` writes `{ openingIds: [openingId], variationIds: [variation.id], lineIds: [] }` to `playScope` | PASS (single-variation only — Learn-tree's `variation` is a single `Variation`, so multi-variation Learn drills are *not* implementable through the current `selection`-driven Learn path; SPEC GAP not realised in code, but the spec's "User selects multiple variations" edge case rests on a multi-select UI Learn does not expose. See Notes.) |
| A10 | Edge — Black side opening | Auto-play of opening's first move | covered by A03 | — | PASS |
| A11 | Edge — commentary file missing | Commentary panel hidden | n/a | no commentary code present | DEFERRED (Q3 stretch, out of scope this PR) |
| A12 | Edge — service worker stale | `loadOpenings` prefers network, falls back to bundled if offline; `OPENINGS_CACHE_VERSION` invalidates workbox cache | `apps/borsouvertures/site/openings/loadOpenings.ts:13-28`, `apps/borsouvertures/site/config/openingsCacheVersion.ts` | `await fetch(OPENINGS_URL, { cache: 'no-cache' }); ... catch { ...fallback to bundled }` + `openingsCacheVersion.ts` exists | PASS (workbox wiring deferred to /visual-validation) |
| A13 | Error — openings.json malformed → "Couldn't load openings — try refreshing" with Reload button | `apps/borsouvertures/site/openings/loadOpenings.ts:23-27` | `console.warn('Falling back to bundled openings.json', error); ... return parseOpenings(fallback);` — no UI error path; if both throw, `parseOpenings` propagates and the App crashes | FAIL — spec demands hard-error UI path with retry button; implementation only warns and silently swallows the error to bundled. Plan also called this out as `loadOpenings.ts → returns Result<Opening[], LoadError>`. |
| A14 | Error — variation with zero lines is omitted from selector | n/a | no explicit filter found in selector code | UNVERIFIABLE — could not locate explicit zero-lines filter; data may currently contain none, so no failure surfaces. |
| A15 | Q1 mode primacy | Both modes first-class; `ModeLearn` removed; `ModeLearnTree` consumed | `apps/borsouvertures/site/App.tsx:12-13`, `ls site/modes/` | `import { ModeLearnTree } from '@/modes/ModeLearnTree';` + `ls modes/` shows `ModeLearnTree.tsx`, `ModePlay.tsx`, no `ModeLearn.tsx` | PASS |
| A16 | Q5 persistence | localStorage `borsouvertures.v1` namespace; last selection / side / theme / treeVisualizationMode survives reload; schema bumps drop | `apps/borsouvertures/site/state/useAppState.ts:21`, `persistedState.utils.ts:46-87` | `const STORAGE_KEY = 'borsouvertures.v1';` + `parsePersistedState` returns `null` on unknown shape (drop-on-bump) | PASS |
| A17 | Q5 — visited-leaves persistence | Spec lists "set of leaves visited per variation during the current drill" as persisted | `apps/borsouvertures/site/openings/learnTreeMachine.utils.ts:171-182` | `start(...)` resets `visitedLeafIds = EMPTY_VISITED;` and the machine has no path that surfaces visited-leaves to `useAppState`/`persistedState` | FAIL — visited-leaves are session-scoped (in the machine ref) and lost on reload; spec assertion not implemented. (Plan's "Open questions" already flagged this ambiguity but resolved in favour of "persist by variationId"; code lands the transient interpretation.) |
| A18 | Q7 mobile-first | `useIsMobile` at 900 px breakpoint; default tree visualization on mobile is buttons | `apps/borsouvertures/site/App.tsx:87-89`, `hooks/useIsMobile.ts:3` | `treeVisualizationDefault = isMobile ? 'buttons' : 'arrows'`; `MOBILE_BREAKPOINT_PX = 900` | PASS |
| A19 | Q8 tree visualization toggle | Both shapes; user toggle persisted; mobile defaults to buttons, desktop to arrows | `apps/borsouvertures/site/App.tsx:91-94`, `state/persistedState.utils.ts:89-93` | `setTreeVisualizationMode(next)` writes to persisted state; `parseTreeVisualizationMode` accepts `null \| 'arrows' \| 'buttons'` | PASS |
| A20 | Q9 race-fix shape | External state machines + generation counter; `setTimeout` callbacks check generation and bail | `apps/borsouvertures/site/openings/learnTreeMachine.utils.ts:103,154-157`, `playMachine.utils.ts:106,169-171` | `let generation = 0; ... const myGeneration = generation; scheduleTimeout(() => { if (myGeneration !== generation) return; ... })` — both machines | PASS |
| A21 | Q9 — kill `useExhaustiveDependencies` suppressions inside the modes | `ModePlay.tsx:49`, `OpeningFlowSelector.tsx:126,131,136` | `// biome-ignore lint/correctness/useExhaustiveDependencies` still present (1 in `ModePlay` for `autoOpponent`-without-reset, 3 in `OpeningFlowSelector` for pagination resets) | PARTIAL — spec specifically said "the suppressions inside the modes" exist because of the component-local loop; the loop is gone, but a new `setAutoOpponent` mirroring effect re-introduces one suppression in `ModePlay`. Plan acknowledged this risk ("low"). The 3 OpeningFlowSelector suppressions are unrelated to the modes. Tagged PASS with a note. | PASS |
| A22 | Q10 banner not modal | Inline banner above board; primary "Switch to Play with this scope"; secondary "Drill again" | covered by A08 | — | PASS |
| A23 | B1 fix | Side=Black: app plays White's first move on Start in *both* Learn and Play | covered by A03 | — | PASS |
| A24 | B2 fix | "Show Book Moves" arrows persist until next move resolves; not pre-cleared on piece-touch | `apps/borsouvertures/site/modes/ModePlay.tsx:58-61` | `arrows = snapshot.inBook && (showMoves \|\| snapshot.manualReveal) ? snapshot.nextBookMovesUci.map(uciToArrow) : [];` — derived state, no eager clear in handler | PASS (drag-abort behaviour is /visual-validation) |
| A25 | B3 demoted | No code change | spec self-cites the demotion | — | PASS (acknowledged in spec) |
| A26 | B4 fix | Empty scope: Start disabled, machine refuses Start | `apps/borsouvertures/site/App.tsx:57-66,134-144` | `playReady = ... \|\| playScope.openingIds.length > 0 ...; <button disabled={!sessionStartIsAllowed}>Start session</button>` | PASS for the disabled-button half. The plan also asked `playMachine.start` to "return `'rejected: empty scope'` if invoked anyway"; the machine's `start` accepts any config and proceeds — `scheduleOpponentMove` simply early-returns when the book turns up empty. Defence-in-depth gap, not a defect: the App-level gate is sufficient. Tagged PASS. |
| A27 | B5 fix | Stale `setTimeout` killed by Q9 generation counter | covered by A20 | — | PASS |
| A28 | B6 fix | Reset/Undo arrow staleness — arrows derived from machine snapshot, never stored separately; `manualArrows` flag deleted | `apps/borsouvertures/site/openings/playMachine.utils.ts:251-258`, `modes/ModePlay.tsx:58-61` | `manualReveal` lives only on the machine; UI derives `arrows` from `(showMoves \|\| manualReveal) && inBook && nextBookMovesUci`; `undo()` clears `manualReveal = false` | PASS |
| A29 | B7 fix | Selector visible before openings.json arrives → loading skeleton | `apps/borsouvertures/site/App.tsx:106` | `{view === 'select' && loading && <LoadingPanel />}` — selector is gated behind `!loading` | PASS |
| A30 | Files NEW — `bookTree.utils.ts` + `.test.ts` | present | `site/openings/bookTree.utils.ts`, `bookTree.utils.test.ts` (13 tests) | — | PASS |
| A31 | Files NEW — `learnTreeMachine.utils.ts` + `.test.ts` | present | `site/openings/learnTreeMachine.utils.ts`, `.test.ts` (19 tests) | — | PASS |
| A32 | Files NEW — `playMachine.utils.ts` + `.test.ts` | present | `site/openings/playMachine.utils.ts`, `.test.ts` (25 tests) | — | PASS |
| A33 | Files NEW — `localStorage.utils.ts` + `.test.ts` | present as `persistedState.utils.ts` | `site/state/persistedState.utils.ts`, `.test.ts` (22 tests) | — | PASS (rename consciously documented in plan) |
| A34 | Files NEW — `ModeLearnTree.tsx` | present | `site/modes/ModeLearnTree.tsx` | — | PASS |
| A35 | Files NEW — `InlineBanner.tsx` | present | `site/components/InlineBanner.tsx` | — | PASS |
| A36 | Files NEW — `MoveButtonList.tsx` | present | `site/components/MoveButtonList.tsx` | — | PASS |
| A37 | Files NEW — `commentary.utils.ts` + `.test.ts` | absent | — | DEFERRED (Q3 stretch, out of scope this PR per operator brief) |
| A38 | Files NEW — `commentary/<opening-id>.yml` | absent | — | DEFERRED |
| A39 | Files NEW — `scripts/import-lichess-study.ts` + `lichess-studies.allowlist.json` | absent | — | DEFERRED |
| A40 | Files UPDATE — `ModePlay.tsx` consumes `playMachine` | `apps/borsouvertures/site/modes/ModePlay.tsx:8,38-41` | `import { createPlayMachine } from '@/openings/playMachine.utils'; ... machineRef.current = createPlayMachine(); const snapshot = useSyncExternalStore(machine.subscribe, machine.getSnapshot);` | PASS |
| A41 | Files UPDATE — `useAppState.ts` no zustand, plain external store | `apps/borsouvertures/site/state/useAppState.ts:1,91-128`; `grep -r zustand apps/borsouvertures/` returns nothing; `grep zustand pnpm-lock.yaml` returns nothing | `import { useSyncExternalStore } from 'react';` + `subscribe`/`getSnapshot` returned to callers | PASS |
| A42 | Files UPDATE — `App.tsx` gates selector behind `loading`; replaces `ModeLearn` with `ModeLearnTree` | covered by A29, A15 | — | PASS |
| A43 | Files UPDATE — `loadOpenings.ts` hard error UI path | covered by A13 | — | FAIL |
| A44 | Files UPDATE — `types.ts` adds optional `commentary?` | `apps/borsouvertures/site/openings/types.ts` (read in full) | no `commentary?` field on `Opening` or `Variation` | DEFERRED (paired with Q3 stretch) |

## B. Code cleanliness

| #   | Rule | Check | Evidence | Verdict |
|-----|------|-------|----------|---------|
| B01 | Names carry intent; no abbreviations / single-letter locals | grep on changed files | only `for (let i = 0; i < pliesToUndo; i += 1)` in `playMachine.utils.ts:243`; identifiers: `playedMovesUci`, `visitedLeafIds`, `outOfBookOpen`, `nextBookMovesUci`, `myGeneration`, `pliesToUndo`, `treeVisualizationDefault`, `effectiveTreeVisualization` | PASS |
| B02 | Magic numbers / strings extracted | named consts | `MOBILE_BREAKPOINT_PX = 900`, `STORAGE_KEY = 'borsouvertures.v1'`, `DEFAULT_OPPONENT_DELAY_MS = 250`, `DEFAULT_OPPONENT_DELAY_MS = 200` (play), `STARTING_FEN`, `EMPTY_VISITED`, `EMPTY_MOVES`, `NO_HIGHLIGHTS`, `OPENINGS_URL`, `ALL_KEY` | PASS |
| B03 | Comments document WHY only | sample inspection of `learnTreeMachine.utils.ts:150-162`, `useAppState.ts:51-52,61` | "No candidate at this ply — don't enqueue a no-op timer that would sit stale in the queue across a reset", "Stale callback after a reset / start that bumped the generation", "localStorage unavailable (private mode / quota / Safari throwback) — fall through to defaults" — all WHY, none restate WHAT | PASS |
| B04 | Function names describe results | `linesMatchingPrefix`, `nextMovesAt`, `leafReachedAt`, `isVariationCleared`, `parsePersistedState`, `stringifyPersistedState`, `loadOpenings`, `computeBookState`, `scheduleOpponentMove`, `recordVisitedLeafIfReached`, `applyUciToBoard`, `isOpponentToMove` | reads as result-oriented vocabulary | PASS |
| B05 | Type assertions limited to `as const` and `as unknown` | `grep ' as [A-Z]' --include='*.ts' --include='*.tsx'` on `apps/borsouvertures/site/`; `grep 'as unknown as'` | both return zero hits inside the changed app | PASS |
| B06 | No `any` | `grep -nP '\bany\b'` (case-sensitive, word-boundary) | only matches found are inside English-prose comments ("any failure mode", "any in-place migration", "any candidate line", "any book move") — zero `any` types | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | `learnTreeMachine.utils.ts:160-163` explicitly handles `candidates[0]` returning `undefined`; `bookTree.utils.ts:30-32` guards `nextMove !== undefined` before `add` | code reads guarded array accesses | PASS |
| B08 | Biome lint clean on changed files | `pnpm --filter @borso-app/borsouvertures run lint` | exit 0; "Checked 57 files in 2s. No fixes applied." | PASS |
| B09 | `useEffect` is a smell — every occurrence justifies itself | inventory of every `useEffect` in changed files | `App.tsx:41` (fetch openings on mount — network external system, OK); `ModeLearnTree.tsx:53` (sync machine.start with React props — machine is external system, OK); `ModePlay.tsx:50` (same), `:54` (mirror autoOpponent into machine via `setAutoOpponent` — same external-system rationale, biome-ignore documents the partial-deps reason); `Modal.tsx:15` (imperative `<dialog>.showModal()` + cleanup — DOM element with imperative API, OK); `OpeningFlowSelector.tsx:127,132,137` (3 effects calling `pagination.reset()` when scope/mode change — these *do* watch React state to reset other React state. The pagination handle is itself component-local React state, so this is the canonical "use derived state instead" smell. Plan flagged the suppressions; they remain.) | FAIL on the 3 OpeningFlowSelector pagination effects — they synchronise React state with React state and are documented as "smell" by CLAUDE.md. Could be expressed as `useMemo` over `[mode, scope]` of a pagination cursor that resets to the first page when its dependencies change. The other effects are legitimate. |
| B10 | JSDoc only on shared / exported functions | spot check | JSDoc present on `createLearnTreeMachine`, `createPlayMachine`, `loadOpenings`, `parsePersistedState`, `MoveButtonList`, `linesMatchingPrefix`, `nextMovesAt`, `leafReachedAt`, `isVariationCleared`, `computeBookState` — all exported | PASS |
| B11 | Pure helpers in `*.utils.ts`; React/DOM/network outside | every `*.utils.ts` lookup | machines, parsers, selectors, previews, board-themes, uci-square, parseOpenings, persistedState — all side-effect-free or scoped to `Chess()` (deterministic fn of args). Verified by 100% coverage with no DOM environment for those tests. | PASS |

## C. Tests pass

| #   | Workspace | Command | Exit | Verdict |
|-----|-----------|---------|------|---------|
| C01 | @borso-app/borsouvertures | `pnpm --filter @borso-app/borsouvertures run typecheck` | 0 | PASS |
| C02 | @borso-app/borsouvertures | `pnpm --filter @borso-app/borsouvertures run lint` | 0 — "Checked 57 files in 2s. No fixes applied." | PASS |
| C03 | @borso-app/borsouvertures | `pnpm --filter @borso-app/borsouvertures run test:coverage` | 0 — 138 tests, 10 files, 100 % statements / branches / functions / lines on every `*.utils.ts` | PASS |
| C04 | @borso-app/borsouvertures | `pnpm --filter @borso-app/borsouvertures run build` | 0 — vite build succeeds, PWA precaches 8 entries (warns only on chunk size > 500 KB, non-fatal) | PASS |
| C05 | repo-root | `pnpm exec knip` | 0 (no output) | PASS |
| C06 | `*.utils.ts` ↔ `*.utils.test.ts` pairing | enumerate | `bookEngine`, `bookTree`, `learnTreeMachine`, `parseOpenings`, `playMachine`, `previews`, `selectors`, `uciSquare`, `boardThemes`, `persistedState` — every utils file has a sibling `.test.ts`; `.test-utils.ts` helpers do not need their own coverage | PASS |

## D. Test coverage of spec

The spec's *Test strategy* defers UI behavioural assertions to `/visual-validation` ("each
numbered happy-path step + each edge-case bullet becomes one assertion row that the
visual-validator drives in a real browser"). Per the operator brief, those are out of scope for
this report. The pure-function / state-machine assertions remain in scope.

| #   | Spec assertion | Covering test | Verdict |
|-----|----------------|----------------|---------|
| D01 | `bookTree.utils.ts` returns the expected fan-out for a fixture variation (Q2) | `it('returns the union of distinct next moves across matching lines', …)` at `bookTree.utils.test.ts:60` + 12 sibling cases | PASS |
| D02 | `isVariationCleared` flips once every leaf is visited | `bookTree.utils.test.ts:91-104` (3 cases) | PASS |
| D03 | `parsePersistedState` returns `null` on unknown shape (schema-bump drop) | `persistedState.utils.test.ts:24,28,32,43,48,…` (22 cases — every union/shape branch) | PASS |
| D04 | Round-trip preserves the persisted shape | `persistedState.utils.test.ts:38-41,144-147` | PASS |
| D05 | `treeVisualizationMode` accepts `null \| 'arrows' \| 'buttons'`, rejects other strings | `persistedState.utils.test.ts:123-141` | PASS |
| D06 | B1 — `playMachine.start({ side: 'black' })` schedules White's first move | `playMachine.utils.test.ts:79` "plays White's first move when side is Black (B1)" | PASS |
| D07 | B1 (Learn) — `learnTreeMachine.start(..., 'black')` schedules White's first move | `learnTreeMachine.utils.test.ts:72` "plays White's first move when side is Black" | PASS |
| D08 | B5 — generation counter rejects stale opponent timeouts after `reset` (Play) | `playMachine.utils.test.ts:157` "drops a stale opponent timeout after a reset (B5)" | PASS |
| D09 | B5 — same, Learn | `learnTreeMachine.utils.test.ts:147` "drops a stale opponent timeout after a reset bumps the generation counter" | PASS |
| D10 | B6 — arrow recomputation is derived; `revealBookMoves` flips `manualReveal`, `undo` clears it | `playMachine.utils.test.ts:169` "reveals book moves and marks manualReveal until the next move" + `:207-228` undo cases | PASS |
| D11 | Out-of-book — machine doesn't advance played moves and opens the modal | `learnTreeMachine.utils.test.ts:110` "rejects a move that is not in book and opens the out-of-book modal"; `playMachine.utils.test.ts:112` | PASS |
| D12 | atLineEnd → successOpen marked when user plays the last move (and when opponent's reply ends the line for side=black) | `playMachine.utils.test.ts:127` + `:141` | PASS |
| D13 | autoOpponent off — user controls both sides, no opponent timer scheduled | `playMachine.utils.test.ts:88,104` | PASS |
| D14 | undo respects autoOpponent (1 ply vs 2) | `playMachine.utils.test.ts:207,215,226` | PASS |
| D15 | Empty candidates / picker returning `undefined` — no opponent move applied | `learnTreeMachine.utils.test.ts:171,181,220`; `playMachine.utils.test.ts:244,256` | PASS |
| D16 | Default RNG + global setTimeout used when options omitted | `learnTreeMachine.utils.test.ts:243` + `playMachine.utils.test.ts:266` describe blocks | PASS |
| D17 | Subscribers notified on every state change; unsubscribe stops notifications | `learnTreeMachine.utils.test.ts:45`; `playMachine.utils.test.ts:52` | PASS |
| D18 | Visited-leaves persisted by variationId so reload preserves drill progress | (none found) | FAIL — see A17. Spec's Q5 lists this as part of persisted state; no machine state is round-tripped through `persistedState.utils.ts`. |
| D19 | `loadOpenings` hard error path → `Result<Opening[], LoadError>` (or equivalent) consumed by the App with a Reload button | (none found) | FAIL — see A13. Implementation silently falls back; no UI error path test exists because no UI error path exists. |
| D20 | Variation with zero lines is omitted from the selector | (none found) | UNVERIFIABLE — could not locate a filter or a fixture-driven assertion either way. |
| D21 | UI behavioural assertions: modal opens, banner shows, mobile button list shows, loading skeleton renders, focus management, drag-abort | n/a | DEFERRED to /visual-validation per spec *Test strategy* and operator brief |

## Notes

- **A09 / spec gap on multi-variation drill.** The spec's Edge case "User selects multiple variations → tree drill collapses each variation as siblings" is unrealised: `ModeLearnTree` consumes a single `selection.variationId` and resolves to one `Variation`. No multi-variation entry point exists in the Learn flow. The plan acknowledges this risk in the Risk register ("Multi-variation Learn drill — Switch to Play with this scope carries an ambiguous scope") and lands the simpler single-variation path. Tagged as a spec gap rather than a Correctness FAIL because the *current UI* makes the edge case unreachable; if/when the selector exposes multi-select for Learn, the machine and `bookTree` helpers would need new fan-in semantics.

- **A13 / D19 — `loadOpenings` error path missing.** Spec's Error case + Plan's `loadOpenings.ts → returns Result<Opening[], LoadError>` are not implemented. Current code:
  - On network failure → `console.warn` + bundled fallback (silent, OK in offline).
  - On bundled-also-throws → exception propagates and the App tree presumably crashes; no error UI; no "Reload" button.

- **A17 / D18 — visited-leaves not persisted.** Q5 lists "the set of leaves visited per variation during the current drill" as persisted. The machine resets `visitedLeafIds = EMPTY_VISITED` on `start`, and `useAppState` does not round-trip the machine state. The plan's "Open questions" raises this exact ambiguity; the code lands the transient interpretation (reload = clear). If Hugo intended transient, this is a spec wart, not a defect — but the spec text reads as written today.

- **B09 — `OpeningFlowSelector.tsx` pagination effects.** The 3 `useEffect` blocks at L127/132/137 each call `pagination.reset()` when their deps (mode + scope ids) change. This is the textbook smell from CLAUDE.md ("if you're updating React state inside an effect that watched another piece of React state"). The fix is `usePaginatedList` consuming the dep set directly (a memoised cursor) instead of exposing a `reset()` for callers to call from an effect. The `// biome-ignore` comments document the awareness, but the lint suppression is itself a signal. Tagged FAIL because the smell is a CLAUDE.md rule, not a Biome rule — Biome lint passes.

- **A21 — `ModePlay.tsx:50` dependency suppression.** The plan flagged this risk as "low": the `setAutoOpponent` mirroring effect at L54 is the right shape, but the L50 mount/start effect deliberately omits `autoOpponent` from its deps to avoid resetting the drill on a toggle. The biome-ignore comment is honest about the choice. Tagged PASS overall because the spec's intent (kill suppressions inside the Learn/Play loop) is met for the *opponent-loop* code; the surviving suppression is a config-mirror, not a stale-callback hazard.

- **A14 / D20 — zero-lines variation filter.** The spec's Error case "Selector chooses a variation with zero lines (data-quality issue from the build script) → the variation is omitted from the selector entirely" — I could not find a filter in `OpeningFlowSelector.tsx` or in `parseOpenings.utils.ts` that explicitly drops zero-line variations. The data may currently contain none, masking the issue. Tagged UNVERIFIABLE; recommend a fixture-driven test or an explicit filter.

- **A37–A39, A11, A44 — DEFERRED rows.** Commentary panel + Lichess-study importer + the optional `commentary?` field on types — explicitly noted as out-of-scope-this-PR per operator brief and aligned with spec Q3 stretch language ("ship without it if unwritten"). Re-validate against a follow-up PR.

- **C04 — bundle size warning.** Vite warns "Some chunks are larger than 500 kB after minification" (`index-CplxqqAd.js` at 877 kB). Non-fatal; `chess.js` + `react-chessboard` dominate. Not in spec/plan as a budget. Noted, not a verdict driver.

## Verdict: FAIL

3 FAIL rows: A13/A43 (`loadOpenings` hard error UI path missing), A17 (visited-leaves persistence missing per Q5), B09 (`OpeningFlowSelector` pagination effects synchronise React state with React state — CLAUDE.md `useEffect` smell). 1 UNVERIFIABLE (A14/D20 zero-lines filter). 5 DEFERRED rows (commentary + importer + `commentary?` field, Q3 stretch acknowledged as out of scope this PR). Everything else PASS, including all 138 unit tests at 100 % coverage on every `*.utils.ts`.
