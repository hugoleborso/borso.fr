# Plan — Learn an opening as a tree, drill it, then play it

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md). When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either named the risk and we missed mitigating it, didn't name the risk at all (planning gap), or named it correctly and the defect comes from elsewhere.

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Q1 (mode primacy) | Learn first, Play after; both first-class | `site/App.tsx` swaps `ModeLearn` for `ModeLearnTree`; `ModePlay` retained | `ls site/modes/` lists `ModeLearnTree.tsx` + `ModePlay.tsx`; no `ModeLearn.tsx` |
| Q2 (variation shape) | Tree explorer, opponent random-picks | `site/openings/bookTree.utils.ts` builds the per-ply move set from a `Variation`'s lines; `learnTreeMachine` consumes it | unit test: `bookTree.utils.test.ts` returns the expected fan-out for the Italian fixture |
| Q3 (commentary path) | Sidecar YAML, panel hidden if absent | `site/openings/commentary/<opening-id>.yml` + `site/openings/commentary.utils.ts` (loads via `import.meta.glob('./commentary/*.yml', { as: 'raw' })`, parses with `yaml`); `<CommentaryPanel>` returns null if entry missing | unit test: missing-file fixture → `loadCommentary('foo')` returns `null` |
| Q3 (importer) | Stretch: Lichess Studies → commentary | `apps/borsouvertures/scripts/import-lichess-study.ts` reads `scripts/lichess-studies.allowlist.json`, fetches `/api/study/{id}.pgn?comments=true&variations=true`, writes `site/openings/commentary/<opening-id>.yml` | running `pnpm build:commentary` against an allow-list of one study writes the expected YAML; commit-clean on rerun |
| Q4 (no SRS) | Out of scope | No code | n/a |
| Q5 (persistence) | localStorage `borsouvertures.v1` | `site/state/localStorage.utils.ts` (typed `read`/`write` for the `v1` namespace, drop on schema bump); `useAppState` wraps Zustand `persist` middleware against this util | unit test: malformed JSON → `read` returns `null`; older `borsouvertures.v0` payload → ignored; round-trip preserves shape |
| Q6 (no auth) | Out of scope | No code | n/a |
| Q7 (mobile-first) | 380×800 viewport visual gate | `apps/borsouvertures/scripts/screenshot.mjs` mirrors `borso-fr`'s with `{ desktop, tablet, phone }` viewports; `/visual-validation` runs at phone first | every visual-validation report lists screenshots from a 380×800 viewport |
| Q8 (tree visualization) | Arrows + button list, user toggles, mobile defaults to buttons | `site/components/MoveButtonList.tsx` + reuse `BoardView`'s arrow overlay; toggle stored in `useAppState.treeVisualizationMode` (persisted); default chosen by `useIsMobile()` on first render | visual: phone-default = button list; toggle persists across reload |
| Q9 (race fix shape) | External state machines + generation counter | `site/openings/learnTreeMachine.utils.ts`, `site/openings/playMachine.utils.ts`; both expose `subscribe(listener)`, `getSnapshot()`, dispatcher methods, and an internal `generation` counter checked inside every `setTimeout` callback | unit test: dispatch `requestOpponentMove`, then `reset` before timer fires, then advance fake timer — opponent move is **not** applied |
| Q10 (banner not modal) | Inline banner over board | `site/components/InlineBanner.tsx` (small panel, no `<dialog>`); rendered in `ModeLearnTree` when `machine.getSnapshot().drillComplete` | visual: variation-cleared shows banner above board, not a centred modal |
| B1 | side=Black: app plays White's first move on Start | `playMachine.start({ side })` schedules opponent's first move via the same opponent-move pathway used at every ply; `learnTreeMachine.start({ side })` already does this | visual-validation row: pick Black, hit Start, observe opponent move within 250 ms |
| B2 | "Show Book Moves" arrows persist until next move resolves | `playMachine` derives `arrows` from `(showMoves OR manualReveal) AND inBook AND nextMoves`; the move-handler doesn't pre-clear arrows — they fall away when `playedMoves` advances | visual-validation row: tap a piece to start a drag, abort the drag → arrows still drawn |
| ~~B3~~ | Demoted (see spec) | No code | n/a |
| B4 | Empty scope: Start disabled | `App.tsx` gates the Start button on `playScopeIsNonEmpty(playScope) || lineId !== ALL_KEY`; `playMachine.start` returns `'rejected: empty scope'` if invoked anyway | visual-validation row: deselect everything → Start disabled with hint |
| B5 | Stale `setTimeout` | Killed by Q9 (generation counter) | covered by Q9 self-check |
| B6 | Reset/Undo arrow staleness | Killed by Q9: arrows are derived from current machine snapshot, never stored separately | visual-validation row: reveal book moves, hit Undo, arrows reflect new ply |
| B7 | Loading flash | `App.tsx` returns `<LoadingPanel />` while `loading === true`; selector + session views both gated | visual-validation row: throttle network to 3G in agent-browser → loading panel visible until openings.json arrives, no flash of empty selector |
| Files NEW | `bookTree.utils.ts`, `bookTree.utils.test.ts`, `commentary.utils.ts`, `commentary.utils.test.ts`, `learnTreeMachine.utils.ts`, `learnTreeMachine.utils.test.ts`, `playMachine.utils.ts`, `playMachine.utils.test.ts`, `localStorage.utils.ts`, `localStorage.utils.test.ts`, `ModeLearnTree.tsx`, `InlineBanner.tsx`, `MoveButtonList.tsx`, `LoadingPanel.tsx`, `CommentaryPanel.tsx`, `import-lichess-study.ts`, `lichess-studies.allowlist.json`, `commentary/.gitkeep` | each `*.utils.ts` ships at 100% (existing vitest gate) | `pnpm --filter @borso-app/borsouvertures run test:coverage` reports 100% over `site/**/*.utils.ts` |
| Files UPDATE | `App.tsx` (loading panel + ModeLearnTree wiring), `ModePlay.tsx` (consume `playMachine`), `useAppState.ts` (extend with persisted slices + treeVisualizationMode), `loadOpenings.ts` (hard error path returns `Result<Opening[], LoadError>`), `types.ts` (add `commentary?` optional fields), `index.html` / `vite.config.ts` (add `yaml` dependency, glob import config), `package.json` (deps: `yaml@^2.5.0`; devDep: `@types/node` already there) | typecheck + build pass | `pnpm --filter @borso-app/borsouvertures run typecheck && pnpm --filter @borso-app/borsouvertures run build` |

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
| `learnTreeMachine` and `playMachine` duplicate 70%+ of generation-counter / opponent-move logic | medium | Both consume a shared private helper inside `*.utils.ts` (e.g. `scheduleOpponentMove(machine, gen, delayMs, picker)`). Pull only when duplication shows up — no premature base class. | code-review: `git diff` shows duplicated `setTimeout` blocks across the two files |
| `useSyncExternalStore` returns stale snapshot during StrictMode double-render | medium | Snapshot is a frozen object; every dispatcher rebuilds the snapshot ref. Test under StrictMode in `App.tsx` (already enabled). | DevTools: profile a session — snapshot identity changes on every meaningful dispatch only |
| `chess.js` is mutated in place; copying state per dispatch leaks memory | medium | The machine owns one `Chess()` instance. State changes are derived (`fen`, `historyLength`) and copied into the immutable snapshot; the `Chess` itself is private. Reset rebuilds the instance. | unit test: dispatch 1000 moves + resets, snapshot identity flips each tick, heap doesn't grow unboundedly (sanity, not perf) |
| `yaml` package adds 25 KB to the bundle for an opt-in feature | low | Lazy-load via `import('yaml')` inside `commentary.utils.ts` only when a commentary glob entry exists. Falls into the route chunk, not the main chunk. | `pnpm build` size report: main chunk size unchanged when `commentary/` is empty |
| Multi-variation Learn drill (edge case) — "Switch to Play with this scope" carries an ambiguous scope | medium | `learnTreeMachine.getSnapshot().scope` returns the exact `playScope` the drill was started with; `Switch to Play` writes that into the store, not a derived scope | unit test: start drill with `{ openingIds: [a, b], variationIds: [a-main, b-main] }`, hit Switch — `useAppState.playScope` matches the input |
| `import.meta.glob('./commentary/*.yml', { as: 'raw' })` doesn't resolve when commentary folder is empty | medium | Commit a `commentary/.gitkeep`; loader treats an empty result map as "no commentary anywhere" | unit test with no fixture files: `loadCommentary('any-id')` returns `null`, no throw |
| Service-worker caches an out-of-date `openings.json` after the schema gains `commentary?` fields | medium | `OPENINGS_CACHE_VERSION` is bumped by `build:openings`; `vite-plugin-pwa` re-uses the cache key; manual bump if the importer changes the shape | After `pnpm build:openings`, diff `openingsCacheVersion.ts`; commit the bump |
| Zustand `persist` middleware crashes if `localStorage` is unavailable (private mode / SSR) | low | `localStorage.utils.ts` wraps reads/writes in try/catch; `persist` middleware uses `createJSONStorage(() => safeLocalStorage)`. Read failures fall back to in-memory. | unit test: stub `localStorage.setItem` to throw — store still functions, persistence is silently degraded |
| Generation counter races with React 18 batched state updates | medium | Counter lives in the *machine* (plain TS, not React state); it ticks before the `setTimeout` is scheduled. React batching can't reorder it. | unit test with `vi.useFakeTimers()`: schedule, increment generation, advance timers — opponent move is rejected |
| Mobile-first 380px viewport hides the move-button list under the keyboard | low | The button list is above the fold (board centred at top, list immediately below); no input fields steal focus to invoke the keyboard | visual-validation phone screenshot: list visible without scroll |
| Knip flags `import-lichess-study.ts` as unused (only run manually) | medium | Add `apps/borsouvertures/scripts/import-lichess-study.ts` as an entry in root `knip.json` | `pnpm exec knip` clean pre-push |
| `noExcessiveLinesPerFile` (300 limit) fires on `ModeLearnTree.tsx` if banner + commentary + button-list inline | medium | Banner / button-list / commentary live in their own files; `ModeLearnTree.tsx` is orchestration only | `pnpm lint` clean |
| `useExhaustiveDependencies` suppressions still needed in `ModePlay`/`ModeLearnTree` | low | Effects are `[machine.subscribe]` for snapshot wiring only; all in-effect work is dispatcher calls (stable identity) | `pnpm lint` clean with no `// biome-ignore` in modes |
| YAML parser receives malformed user input (Hugo's commentary file) | low | `commentary.utils.ts` `loadCommentary` wraps the YAML parse in try/catch; corrupt → returns `null` and logs a console.warn at startup | unit test: corrupt YAML fixture → loader returns `null`, panel hides |
| Visual-validation can't verify "every leaf visited" without inspecting machine state | medium | Expose machine snapshot on `window.__borsouvertures_debug__` only when `import.meta.env.DEV`; visual-validation queries this in dev/preview builds | the agent-browser script `eval`s the global once per assertion |

## Code-quality self-check

- [x] No `as <T>` casts; only `as const` and `as unknown` allowed by repo Biome plugin.
- [x] No `any`.
- [x] No single-letter locals outside `for (let i …)`.
- [x] Magic numbers extracted: `OPPONENT_MOVE_DELAY_MS`, `AUTO_OPPONENT_DELAY_MS`, `MOBILE_BREAKPOINT_PX`, `LOCALSTORAGE_NAMESPACE = 'borsouvertures.v1'`, `INCORRECT_HIGHLIGHT_COLOR`, `MAX_BOARD_PX`, `MIN_BOARD_PX`, `DESKTOP_BOARD_FRACTION`.
- [x] Magic strings extracted: machine state names, action types, `ALL_KEY`, `OPENINGS_URL` already extracted.
- [x] Comments document non-obvious WHY only — generation-counter rationale, `import.meta.glob` raw-mode rationale, `Result<T, E>` for `loadOpenings` rationale.
- [x] No JSDoc on internals; the two state machines' public dispatchers carry one-line JSDoc since they're consumed by sibling components and tests.
- [x] Function names describe results: `buildBookTree`, `pickRandomOpponentMove`, `loadCommentary`, `read` / `write` (in `localStorage.utils.ts`), `acceptsScope`, `dispatchPlayMove`, `dispatchReset`, `getSnapshot`.
- [x] Pure helpers in `*.utils.ts`; the two machines are themselves `*.utils.ts` because their state transitions are deterministic functions of `(state, action)` — DOM / network / React state stay outside.
- [x] No defensive code for impossible cases — generation counter eliminates the "stale callback" branch by design; Zustand `persist` errors are handled at the boundary, not inside utilities.
- [x] No generic-name variables (`current` / `next` / `result` / `data`) outside React-internal `ref.current`. Names: `nextSnapshot`, `pendingGeneration`, `playedMovesAfterOpponent`, `bookTreeAtPly`, `visitedLeafIds`.

## Pre-flight gates

Run, in order, before push:

1. `pnpm install` — `yaml@^2.5.0` lands.
2. `pnpm --filter @borso-app/borsouvertures run typecheck` — TS clean (cdk + site projects).
3. `pnpm exec biome lint` — incl. type-assertion plugin and `noExcessiveLinesPerFile`.
4. `pnpm --filter @borso-app/borsouvertures run test:coverage` — every `*.utils.ts` at 100 % statements / branches / functions / lines.
5. `pnpm --filter @borso-app/borsouvertures run build` — Vite build succeeds; `dist/` is populated; main chunk size ≤ current + 30 KB.
6. `pnpm exec knip` — no unused entries; importer script registered.
7. `/visual-validation docs/features/borsouvertures/learn-by-tree/spec/spec.md` — verdict PASS, screenshots from 380×800 phone viewport included.
8. `/technical-validation docs/features/borsouvertures/learn-by-tree/spec/spec.md` — verdict PASS.

## Open questions / unknowns

- **Commentary file format.** Spec says YAML (`<opening-id>.yml`). Plan respects that. If `yaml@2` adds non-trivial bundle weight even with lazy-load, fall back to `.md` with `?raw` import (no parser dep). Decision deferred to first build-size measurement.
- **Visited-leaves persistence scope.** Spec says "the set of leaves visited per variation during the current drill." Plan reads this as: persist visited-leaves keyed by variationId so a mid-drill reload doesn't lose progress; reset clears the set for that variation. If Hugo intended "transient, reload = clear," flag it back during step-12 of the next spec iteration.
- **`Switch to Play with this scope` for multi-variation drills.** Plan carries the exact `playScope` the drill started with. If multi-variation drill is rare, a future iteration can add a "narrow to the one I just cleared" disambiguator.
- **Lichess study importer attribution.** CC-BY-SA requires attribution; plan writes the source study URL into the YAML's `_source` field. `CommentaryPanel` shows it as a small "via Lichess study by @author" link if present. If Hugo prefers to keep attribution out of the UI, surface this in the next spec iteration.

## Missing technical skills

These would have helped; no `.claude/skills/<name>/` exists for them yet — seed them next time.

- `/vite` — multi-page input, glob imports, `?raw` imports, PWA plugin patterns, build-size budgeting.
- `/zustand` — `persist` middleware, `createJSONStorage`, slice patterns, testing with vanilla store.
- `/state-machine` — generation-counter pattern, `useSyncExternalStore` integration, fake-timer testing.
- `/agent-browser` — drilling React-driven UIs, exposing debug globals only in dev, screenshot conventions per viewport.
