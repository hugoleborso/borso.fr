# Technical validation — Talos icon and opening

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: `../plan/plan.md` (absent, see R05)
- Branch: feat/talos-phaistos-icon
- Base: origin/main (round 2 diffs from `20bf60b83e52401bd4b5104068cb42eed66246ef`)
- Run at: 2026-11-12T08:05:18Z
- Round: 2
- Reviewed: aad17fe98bdaf559c60e02febd3f8040f7977802
- Touched workspaces: @borso-app/talos (site only), docs

Round 2 reads `git diff 20bf60b8..aad17fe9`, one fix commit touching 7 files under `apps/talos/site/src` and the spec. The fix commit carries no new scope, so no file round 1 never read is walked. The spec is in the short form. Opening 4 and Opening 6 were amended in this diff, and category A grades the amended text. 0 use cases routed to /visual-validation; out of scope for this report. No merge of `main` sits above the base (`git rev-list --merges origin/main..HEAD` printed nothing). HEAD did not move during the review.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Opening 4 (amended) | A tap anywhere skips it. The skip runs on `click`, so the tap is spent on the overlay | apps/talos/site/src/components/organisms/OpeningOverlay.tsx:51 | `onClick={finish}` replaces `onPointerDown={finish}`; `finish` calls `setDockTargetHidden(false); setIsOver(true);` (lines 29-32) | PASS |
| A02 | Opening 6 (amended) | No `opacity`, `filter` or `mix-blend-mode` reaches the element holding `preserve-3d`; layers are flat leaves; the gleam may fade its own opacity | SpinningCoin.tsx:59,62-68; tokens.css (lines 110-112, 157-174 of the file) | The coin `className="... transform-3d animate-opening-coin"` runs `opening-spin-in` and `opening-dock`, whose keyframes hold only `transform`. Every layer is a childless `<i ... />`. The gleam leaf runs `opening-sheen` (`opacity: 0` → `1` → `0`), which the amended text allows. | PASS |
| A03 | Opening 1 | Plays once per browser session; a reload does not replay | apps/talos/site/src/main.tsx:17; apps/talos/site/src/lib/opening.adapter.ts:43-47 | `const playsOpening = shouldOpenThisLoad(readSessionStorage(), isMotionReduced());` and `const hasPlayed = hasOpeningPlayed(storage); didRecordOpening(storage); return shouldPlayOpening(hasPlayed, isMotionReducedNow);` | PASS |
| A04 | Opening 2 | Skipped under reduced motion | opening.adapter.ts:46; main.tsx:17 | `return shouldPlayOpening(hasPlayed, isMotionReducedNow);` with `isMotionReduced()` passed by main.tsx | PASS |

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A15 (blocking): the gleam layer animates `opacity`, which Opening 6 forbade on "the 3D coin or its layers" | `aad17fe9` docs/features/talos/phaistos-icon/spec/spec.md:34 amends Opening 6 to forbid the properties only on the `preserve-3d` element and to allow the leaf gleam its opacity. The code is unchanged, and against the amended text it passes (A02). The amendment rests on the leaf having no children, which `'carries the 3D context on one element, its layers being flat leaves'` (SpinningCoin.test.tsx:41) asserts with `expect(layer.children).toHaveLength(0);`. Who decided the amendment is in Notes. | PASS |
| R02 | D24 (blocking): the Opening 6 test read only class names and inline style | `aad17fe9` apps/talos/site/src/components/atoms/SpinningCoin.test.tsx:33-39, `'animates its 3D element with keyframes that touch neither opacity, filters nor blending, ...'`. It reads the names in `--animate-opening-coin` from tokens.css, asserts `toEqual(['opening-spin-in', 'opening-dock'])`, and asserts `expect(readKeyframes(name)).not.toMatch(FLATTENING_PROPERTIES);`. Measured here on a scratch copy of tokens.css: planting `opacity: 0.9;` in `opening-spin-in` or `filter: blur(1px);` in `opening-dock` makes the regex match, so the test fails on either. | PASS |
| R03 | D09 (blocking): no test pinned the header logo or `data-opening-dock` | `aad17fe9` apps/talos/site/src/App.test.tsx:175-177: `tree.container.querySelector('header img[data-opening-dock]')`, `expect(headerLogo?.getAttribute('src')).toBe('/icons/coin-face.webp');`, `expect(headerLogo?.nextElementSibling?.textContent).toBe('Talos');`. Deleting `data-opening-dock=""` (AppShell.tsx:45) now makes `headerLogo` null and fails line 176. The 28 px size is still unpinned (Notes). | PASS |
| R04 | D13 (blocking): main.tsx recorded the session flag in code no test ran | `aad17fe9` opening.adapter.ts:43-47 moves read, record and decide into `shouldOpenThisLoad`; main.tsx:17 only calls it. `'plays on the first load of a session and never again on a reload'` (opening.adapter.test.ts:64-69) asserts `toBe(true)`, then `storedFlags.get('talos.opening-played')` is `'1'`, then `toBe(false)` on the second call. Deleting `didRecordOpening(storage);` fails lines 67 and 68. Mutation of opening.adapter.ts: 27 killed, 0 survived (C03). | PASS |
| R05 | A20 (non-blocking), dismissed: "the change is one overlay and static assets, and the spec names the data shape" | Checked: spec.md:7 is `## Data shape`, naming `DockMove`, `DockTargetBox`, `ViewportSize` and the session flag. The code is one overlay, one coin atom, one core, one adapter and static assets (round-1 file list). The claim holds. | PASS |
| R06 | B09 (non-blocking), dismissed: "150 px, 42% and 11.8 px literals in class strings: dismissed, Tailwind only generates classes it finds as literal strings" | Checked: the reason holds for the Tailwind class at SpinningCoin.tsx:59 (`size-[150px] ... top-[42%]`). It does not hold for the other two literals round 1 cited, which are inline style strings Tailwind never reads: `transform: 'translateZ(-11.8px) rotateY(180deg)',` at apps/talos/site/src/components/atoms/SpinningCoin.tsx:22 and `'radial-gradient(circle at 50% 42%, transparent var(--opening-hole), #000 var(--opening-hole))',` at apps/talos/site/src/components/organisms/OpeningOverlay.tsx:19. Failing case: set `EDGE_LAYER_COUNT = 14` (SpinningCoin.tsx:9). The deepest edge layer moves to `translateZ(-12.6px)` while the back face stays at `-11.8px`, inside the edge stack, and every test stays green. The false reason is what ships in the history. Fix size: two lines (build both strings from `EDGE_LAYER_COUNT * EDGE_LAYER_STEP_PX + 1` and `OPENING_COIN_TOP_RATIO`), or a dismissal reason that is true for them. | FAIL (blocking) |
| R07 | B11 (non-blocking), dismissed: "it is the closest canonical overlay" | Checked: `grep -n -i overlay .claude/skills/blueprint/blueprint-index.md` finds only `molecule-decorative-overlay` and `core-optimistic-overlay`, which is a data structure. No organism overlay blueprint exists. The claim holds. | PASS |
| R08 | B19 (non-blocking), dismissed: "the worker serves /icons/ cache-first, so a later load costs no network" | Checked: apps/talos/site/public/sw.js:30 `return pathname.startsWith('/assets/') \|\| pathname.startsWith('/icons/');` routes to `event.respondWith(cacheFirst(request));` (lines 132-134), and `cacheFirst` returns the cached response before any `fetch`. The claim holds. | PASS |
| R09 | B10 (non-blocking), fixed: `hideDockTarget(false)` showed the logo | `aad17fe9` opening.adapter.ts:68 `export function setDockTargetHidden(isHidden: boolean): void`; `grep -rn hideDockTarget apps/talos/site` finds nothing. | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware <7 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B02 | No `any`; assertions only `as const` / `as unknown`; no `useEffect`; no prose comments | `grep -nP '\bany\b\|\bas [A-Z]\|useEffect\(\|//\|/\*'` on the changed files | Only English prose in two test names, and the machine-read markers `// @FollowsBlueprint ...` and `/** @DependsOnExternal browser-session-storage */` | PASS |
| B03 | Typecheck, `noUncheckedIndexedAccess` | `tsc --noEmit -p apps/talos/tsconfig.json` | exit 0. The new index read `pattern.exec(TOKENS)?.[1]` (SpinningCoin.test.tsx:15) is checked against `undefined` on line 16. | PASS |
| B04 | Function names describe the result (CLAUDE.md "Clean code") | read opening.adapter.ts in full | `export function shouldOpenThisLoad(storage: OpeningStorage, isMotionReducedNow: boolean): boolean` at apps/talos/site/src/lib/opening.adapter.ts:43 reads as a question and writes the session flag (`didRecordOpening(storage);`, line 45). Failing case: a caller that asks it twice in one load, for a log line and then the decision, gets `true` and then `false`, and the opening never plays. Introduced: this branch; Fix size: 2 call sites (a name such as `claimOpeningForThisLoad`). | FAIL (non-blocking) |
| B05 | Standards checklist (10): a test name states the behaviour and the condition | read the new tests | `'plays on the first load of a session and never again on a reload'` (opening.adapter.test.ts:64), `'does not play under reduced motion, and still records the session'` (line 71), `'goes away at the first tap, taking the click so it never reaches the app beneath'` (OpeningOverlay.test.tsx:103) | PASS |
| B06 | Standards checklist (05): a control taking a drag or slide writes nothing on `pointerdown` | OpeningOverlay.tsx:51 | `onClick={finish}`; nothing is written on `pointerdown` | PASS |
| B07 | Standards checklist (01): `VOCABULARY.md` still true | `git diff --name-only 20bf60b8..HEAD` | no `VOCABULARY.md` changed | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/talos (core) | `pnpm --filter @borso-app/talos exec vitest run --project core --changed 20bf60b83e52401bd4b5104068cb42eed66246ef --reporter=verbose --coverage` | 0. 4 files and 34 tests, all of them this diff's: `SpinningCoin.test.tsx` (3), `OpeningOverlay.test.tsx` (7), `opening.adapter.test.ts` (15), `App.test.tsx` (9). Coverage of the gated changed files is 100% statements (31/31), branches (6/6), functions (11/11) and lines (29/29). | PASS |
| C02 | @borso-app/talos (back-e2e) | `pnpm --filter @borso-app/talos run test:e2e --changed 20bf60b83e52401bd4b5104068cb42eed66246ef` | 0. No back-e2e file is affected, because the diff touches no `api/` file. | PASS |
| C03 | @borso-app/talos (mutation) | `scripts/mutate-changed.sh 20bf60b83e52401bd4b5104068cb42eed66246ef apps/talos` | 0. 60 killed, 0 survived: `opening.adapter.ts` 27, `opening.core.ts` 32, `class-name.utils.ts` 1. | PASS |
| C04 | @borso-app/talos (typecheck) | `tsc --noEmit -p apps/talos/tsconfig.json` | 0 | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Opening 4 (amended): the skip runs on `click` | `'goes away at the first tap, taking the click so it never reaches the app beneath'` at OpeningOverlay.test.tsx:103. It fires `fireEvent.click(...)`, and the assertion that fails if the handler moves off `click` is `expect(screen.queryByTestId('opening')).toBeNull();` (line 108). | PASS |
| D02 | Opening 6 (amended): the `preserve-3d` element's animations touch no flattening property | SpinningCoin.test.tsx:33-39, `expect(readKeyframes(name)).not.toMatch(FLATTENING_PROPERTIES);`, seen failing on a planted property (R02). Class and inline style are held by OpeningOverlay.test.tsx:90-100 (`expect(layer.className).not.toMatch(/opacity\|blur\|filter\|blend\|brightness/);`). | PASS |
| D03 | Opening 6 (amended): the layers are flat leaves | `'carries the 3D context on one element, its layers being flat leaves'` at SpinningCoin.test.tsx:41. `expect(layer.children).toHaveLength(0);` and `expect(layer.className).not.toContain('transform-3d');` | PASS |
| D04 | Opening 1: once per session; a reload does not replay | opening.adapter.test.ts:64-69, `expect(shouldOpenThisLoad(storage, false)).toBe(false);` on the second load (line 68) | PASS |
| D05 | Opening 2: skipped under reduced motion, and the session is still recorded | `'does not play under reduced motion, and still records the session'` at opening.adapter.test.ts:71. `expect(shouldOpenThisLoad(storage, true)).toBe(false);` and `expect(hasOpeningPlayed(storage)).toBe(true);` | PASS |
| D06 | Opening 3: the coin flies with the dock move the keyframes read | `'carries the dock move as custom properties the dock keyframes read'` at SpinningCoin.test.tsx:54. `toBe('-164px')` for `--opening-dock-x`, and `expect(readKeyframes('opening-dock')).toContain('var(--opening-dock-x)');` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Whole diff | Any database write path | `git diff 20bf60b8..HEAD --name-only -- '*.service.ts' '*.repository.ts' '*.controller.ts'` prints nothing; the diff touches no `api/` file | PASS |
| E02 | `playsOpening` (main.tsx:17) | Per-process state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on the changed files finds nothing. `playsOpening` is one tab's constant, and the rule it holds is per tab by the spec's own `sessionStorage` definition. No server process holds state. | PASS |

## Blocking findings

- R06 — The B09 dismissal says the literals are in class strings that Tailwind must see whole. Two of the three are inline style strings Tailwind never reads: `translateZ(-11.8px)` at SpinningCoin.tsx:22 and `circle at 50% 42%` at OpeningOverlay.tsx:19. Either build those two from the constants or give a reason that holds for them.

## Non-blocking findings

- B04 — `shouldOpenThisLoad` (opening.adapter.ts:43) is named as a question and writes the session flag, so a second call answers differently.

## Notes

- R01. Round 1 called the choice between dropping the gleam's fade and amending Opening 6 a product call. The fix commit amended the spec, citing "the validated prototype". Did the operator approve the amendment? The technical premise matches CSS Transforms 2 (opacity flattens only the element that carries it, and the gleam has no children), and D03 pins that premise. The device evidence is the existing `validation/opening-frames.png`, which this diff does not change.
- R03. Spec Icon 4 says the header coin is 28 px. The new App.test.tsx assertions pin the attribute, the source and the "Talos" sibling, not the size. Changing `LOGO_SIZE_PX` (AppShell.tsx) would ship a different logo size with every test green. The dock still lands correctly, because the flight measures the logo at run time. Should a `width` assertion join the three lines added at App.test.tsx:175-177?
- D02. The guard reads only the animation the `animate-opening-coin` token names. A second `animate-*` class added to the coin's `className` would put another animation on the 3D element that neither test reads. Is that worth pinning, given that Tailwind's `animate-*` classes replace one another rather than stack?
- `scripts/mutate-changed.sh 20bf60b8 apps/talos` also mutated `opening.core.ts` and `class-name.utils.ts`, which this round's diff does not touch. All of them were killed, so nothing is wrong, but the script's base is evidently not the SHA it was given.

## Verdict: FAIL
