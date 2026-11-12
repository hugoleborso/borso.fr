# Technical validation — Talos icon and opening

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: `../plan/plan.md` (absent, see A20)
- Branch: feat/talos-phaistos-icon
- Base: origin/main (`f41c393f8c4b2675fa515ff2042e1c8f3953c39e`)
- Run at: 2026-11-12T07:54:28Z
- Round: 1
- Reviewed: 20bf60b83e52401bd4b5104068cb42eed66246ef
- Touched workspaces: @borso-app/talos (site only), docs

The spec is in the short form (Goal, Data shape, The icon, The opening, Out of scope). Categories A and D are built from its bullets, and the files come from the diff. 0 use cases routed to /visual-validation; out of scope for this report. No merge of `main` sits above the base (`git rev-list --merges origin/main..HEAD` printed nothing). HEAD did not move during the review.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Icon 1 | Manifest icons, apple-touch icon and favicons show the coin; `favicon.ico` holds 16, 32, 48; the SVG "T" files are removed | apps/talos/site/index.html:14-17; apps/talos/site/public/icons/ | `<link rel="icon" href="/icons/favicon.ico" sizes="48x48" />`. Measured with PIL: ico sizes `{(16,16),(32,32),(48,48)}`, icon-192 192x192, icon-512 512x512, maskable 512x512, apple-touch 180x180, favicon-32 32x32, favicon-16 16x16. `favicon.svg` and `icon.svg` are deleted (`D` in the diff) and no file under `apps/talos` names them (grep, measured). | PASS |
| A02 | Icon 2 | Maskable icon keeps the whole coin inside the 80% safe circle | apps/talos/site/public/icons/icon-maskable-512.png | Measured: the furthest non-background pixel lies 178.2 px from the centre; the safe circle radius is 0.4 x 512 = 204.8 px. | PASS |
| A03 | Icon 3 | The colour of the coin is not changed | apps/talos/site/public/icons/*.png vs coin-face.webp | Mean RGB of coin pixels (measured): coin-face.webp (103.7, 64.2, 28.9), icon-512 (103.1, 63.8, 29.3), maskable (102.6, 63.5, 29.2), apple-touch (102.9, 63.7, 29.2), favicon-32 (103.7, 63.9, 28.7). No tint applied between the source and the derived sizes. | PASS |
| A04 | Icon 4 | Header shows the coin face, 28 px, followed by "Talos"; it carries `data-opening-dock` | apps/talos/site/src/components/organisms/AppShell.tsx:39-49 | `src={COIN_FACE_SOURCE}` ... `width={LOGO_SIZE_PX}` ... `data-opening-dock=""` ... `className="size-7"` then `<span className="font-display text-heading text-ink">{t('app.title')}</span>`; `const LOGO_SIZE_PX = 28;` | PASS |
| A05 | Icon 5 | Service worker cache version moves to `talos-v2` | apps/talos/site/public/sw.js:1 | `const CACHE_VERSION = 'talos-v2';` | PASS |
| A06 | Icon 6 | Manifest `background_color` is `#070605` | apps/talos/site/public/manifest.webmanifest:10 | `"background_color": "#070605",` | PASS |
| A07 | Icon 7 | README credits the photo, Commons lists it as public domain | apps/talos/README.md:12 | `- Credit: Didrachme de Phaistos, Cabinet des médailles (BnF), photo Jastrow (2006), Wikimedia Commons (...). Commons lists the photo as public domain` | PASS |
| A08 | Opening 1 | Plays on a cold load once per browser session; reload and in-app navigation do not replay | apps/talos/site/src/main.tsx:23-25,37; apps/talos/site/src/lib/opening.adapter.ts:30-41 | `const playsOpening = shouldPlayOpening(hasOpeningPlayed(openingStorage), isMotionReduced());` `didRecordOpening(openingStorage);` `{playsOpening ? <OpeningOverlay /> : null}`; `return storage.getItem(PLAYED_KEY) === PLAYED_VALUE;` | PASS |
| A09 | Opening 2 | Skipped under `prefers-reduced-motion: reduce` | apps/talos/site/src/lib/opening.core.ts:38-43; opening.adapter.ts:43-45; OpeningOverlay.tsx:50 | `return !hasPlayedThisSession && !isMotionReduced;`; `return window.matchMedia(REDUCED_MOTION_QUERY).matches;`; `className="fixed inset-0 z-50 overflow-hidden motion-reduce:hidden"` | PASS |
| A10 | Opening 3, first bullet | Over about 4.2 s the coin arrives spinning twice and stops facing the screen on Talos | apps/talos/site/src/styles/tokens.css:110-112,157-160; SpinningCoin.tsx:65-66 | `opening-spin-in 2.6s 0.1s ... both, opening-dock 0.6s 3.6s ... forwards` (ends at 4.2 s); `transform: translateZ(-300px) rotateY(-720deg) rotateX(14deg);` to `transform: none;`; face layer is `coin-face.webp` at `translateZ(1px)`, back is `rotateY(180deg)` | PASS |
| A11 | Opening 3, second bullet | Raking light sweeps the relief, a bronze halo appears, "TALOS" settles under the coin | tokens.css:113-120,176-187,212-223; OpeningOverlay.tsx:65-70 | `--animate-opening-shade: opening-rake 1.8s 0.5s ...`; `opening-halo 1.6s 1.1s ease-out both`; `opening-word 1.2s 1.8s ...`; `{t('opening.word')}` with `"opening.word": "TALOS"` | PASS |
| A12 | Opening 3, third bullet | App opens in a circle growing from the coin; the coin flies onto the header logo, measured when the reveal starts and again when the flight starts | OpeningOverlay.tsx:34-38,52; opening.core.ts:44-46; tokens.css:121,231-238 | `onAnimationStart={aimAtDock}`; `setDockMove(computeDockMove(measureDockTarget(), readViewport()));`; `return animationName === REVEAL_ANIMATION \|\| animationName === DOCK_ANIMATION;`; `maskImage: 'radial-gradient(circle at 50% 42%, transparent var(--opening-hole), #000 var(--opening-hole))'` | PASS |
| A13 | Opening 4 | A tap anywhere skips it | OpeningOverlay.tsx:29-32,51 | `onPointerDown={finish}`; `hideDockTarget(false); setIsOver(true);` | PASS |
| A14 | Opening 5 | The app loads behind it and is never blocked; the overlay leaves the DOM when the coin lands | main.tsx:36-37; OpeningOverlay.tsx:27,41-42,53 | `<App />` rendered before and beside `{playsOpening ? <OpeningOverlay /> : null}`; `onAnimationEnd={finishOnLanding}`; `if (hasLanded) finish();`; `if (isOver) return null;` | PASS |
| A15 | Opening 6 | No `opacity`, `filter` or `mix-blend-mode` reaches the 3D coin or its layers | SpinningCoin.tsx:37,68; tokens.css:114-116,189-198 | The gleam layer is a child of the `transform-3d` coin: `<i className={GLEAM_LAYER_CLASS} style={GLEAM_STYLE} />` with `GLEAM_LAYER_CLASS = '... animate-opening-gleam'`. That animation is `opening-rake 1.8s 0.5s ... both, opening-sheen 1.8s 0.5s ease-in-out both`, and `@keyframes opening-sheen` animates `opacity: 0` → `opacity: 1` → `opacity: 0`. Failing case: a cold load at 0.5 s to 2.3 s, while the coin is still spinning (spin ends at 2.7 s), gives a coin layer a computed `opacity` below 1, which the spec forbids by name. | FAIL (blocking) |
| A16 | Opening 6 | The fade-in is on the wrapper that carries the perspective | OpeningOverlay.tsx:63; tokens.css:109,148-155 | `<div className="absolute inset-0 perspective-opening animate-opening-coin-wrap">`; `--animate-opening-coin-wrap: opening-appear 0.3s 0.1s ease-out both;` | PASS |
| A17 | Data shape, `DockMove` | Move from (50%, 42%, 150 px) onto the logo centre, scale = logo width / 150; `{0,0,0}` with no logo | opening.core.ts:1-2,29-35,26 | `x: target.left + target.width * HALF - viewport.width * HALF,` `y: target.top + target.height * HALF - viewport.height * OPENING_COIN_TOP_RATIO,` `scale: target.width / OPENING_COIN_SIZE_PX,`; `if (target === null) return SHRINK_IN_PLACE;` with `{ x: 0, y: 0, scale: 0 }` | PASS |
| A18 | Data shape, `DockTargetBox`, `ViewportSize` | Logo box in viewport pixels; viewport size | opening.adapter.ts:47-60 | `const { left, top, width, height } = target.getBoundingClientRect(); return { left, top, width, height };`; `return { width: window.innerWidth, height: window.innerHeight };` | PASS |
| A19 | Data shape, session flag | `sessionStorage['talos.opening-played'] = '1'` | opening.adapter.ts:5-6,22-28,34-36 | `const PLAYED_KEY = 'talos.opening-played';` `const PLAYED_VALUE = '1';` `return window.sessionStorage;` `storage.setItem(PLAYED_KEY, PLAYED_VALUE);` | PASS |
| A20 | Plan | A plan exists at `plan_path` | docs/features/talos/phaistos-icon/plan/plan.md | `git ls-tree HEAD docs/features/talos/phaistos-icon/plan/` prints nothing; the folder does not exist at the reviewed SHA. No row depended on it, because the short-form spec carries no Files-to-change list. | FAIL (non-blocking) |
| A21 | Out of scope | Drive originals are not used; derived sizes are logged for the operator | docs/operator-backlog.md:24 | `\| this PR \| Replace the derived Talos icons with the Drive originals. ... The 512 px icons are upscaled from 360 (measured).` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read the 11 changed `.ts`/`.tsx` files | none found; `(_, index)` at SpinningCoin.tsx:12 is an unused parameter placeholder | PASS |
| B02 | Lint clean | `pnpm exec oxlint --type-aware <11 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B03 | No `any` | `grep -nP '\bany\b' <changed files>` | only English prose in two test names (`'ignores any other value under the key'`, `'leaves any other request to the browser'`) | PASS |
| B04 | Type assertions only `as const` / `as unknown` | `grep -nE ' as [A-Z]'` | none; `as const` at OpeningOverlay.test.tsx:17 only | PASS |
| B05 | No prose comments | `grep -nE '//\|/\*'` | only machine-read markers: `// @FollowsBlueprint ...` (5 files) and `/** @DependsOnExternal browser-session-storage */` at opening.adapter.ts:1 | PASS |
| B06 | `useEffect` is a smell | `grep -nE '\buseEffect\('` | none found | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | read in full; `tsc --noEmit -p apps/talos/tsconfig.json` | exit 0; the only lookup is `JSDOM_PREFIXED_ANIMATION_EVENTS[kind]` keyed by `keyof typeof` | PASS |
| B08 | knip | `pnpm exec knip --workspace apps/talos` | exit 0, only a configuration hint about `.css` | PASS |
| B09 | Magic numbers extracted to named constants | read SpinningCoin.tsx and OpeningOverlay.tsx in full | `className="absolute left-1/2 top-[42%] size-[150px] -ml-[75px] -mt-[75px] ..."` at SpinningCoin.tsx:59 and `'radial-gradient(circle at 50% 42%, ...'` at OpeningOverlay.tsx:21 restate `OPENING_COIN_SIZE_PX = 150` and `OPENING_COIN_TOP_RATIO = 0.42` (opening.core.ts:1-2) as literals; `transform: 'translateZ(-11.8px) rotateY(180deg)'` at SpinningCoin.tsx:22 hard-codes `EDGE_LAYER_COUNT * EDGE_LAYER_STEP_PX + 1`. Failing case: changing the coin to 160 px in the class string and not the constant docks the coin 10/150 off scale with every test green. Introduced: this branch; Fix size: one file per literal (inline style built from the constants). | FAIL (non-blocking) |
| B10 | Standards checklist (01): "a `build…`, `project…` or `select…` returns what its verb says" and file names say what they hold; function names describe the result (CLAUDE.md) | read opening.adapter.ts in full | `export function hideDockTarget(isHidden: boolean): void` at opening.adapter.ts:62, called as `hideDockTarget(false)` at OpeningOverlay.tsx:30 to show the logo again. The name says hide; the `false` call shows. Introduced: this branch; Fix size: 3 call sites (rename to `setDockTargetHidden`, or split into `hideDockTarget`/`showDockTarget`). | FAIL (non-blocking) |
| B11 | Standards checklist: a file carrying `// @FollowsBlueprint <id>` copies that blueprint | read OpeningOverlay.tsx against `molecule-decorative-overlay` | `// @FollowsBlueprint molecule-decorative-overlay` at OpeningOverlay.tsx:22 claims a blueprint that "fills its positioned parent rather than the viewport" and "takes no pointer events". The file does neither: `className="fixed inset-0 z-50 ..."` (line 50) and `onPointerDown={finish}` (line 51), and it lives in `organisms/`, not `molecules/`. Both departures are what the spec asks (full-screen, tap to skip), so the marker is what is wrong. Introduced: this branch; Fix size: one line. | FAIL (non-blocking) |
| B12 | Standards checklist (05): a control taking a drag or slide writes nothing on `pointerdown` | read OpeningOverlay.tsx | `onPointerDown={finish}` at OpeningOverlay.tsx:51. The overlay takes no drag or slide; it is a full-screen skip target, so the bullet does not apply. A possible ghost-tap is in Notes. | PASS |
| B13 | Standards checklist (09): a key's dotted path names the screen and the element | apps/talos/site/src/i18n/fr.json:3 | `"opening.word": "TALOS",` names the opening and its word | PASS |
| B14 | Standards checklist (02): `.core.ts` vs `.utils.ts` choice; (03) untrusted input parsed | opening.core.ts, opening.adapter.ts | The dock geometry and the play decision belong to this feature, so `.core.ts` is right. The only untrusted input is the session flag, compared by equality: `storage.getItem(PLAYED_KEY) === PLAYED_VALUE` (opening.adapter.ts:31). | PASS |
| B15 | Standards checklist (10): a test name states the behaviour and the condition | read the three new test files | for example `'stands in a storage that remembers nothing where reading it throws, as a locked down browser does'` (opening.adapter.test.ts:71), `'aims again when the dock starts, for a header that arrived late'` (OpeningOverlay.test.tsx:58) | PASS |
| B16 | Standards checklist (08): a visual effect is made of what the screen already renders; more than two variants go through `cva` | read OpeningOverlay.tsx, SpinningCoin.tsx | The flight lands on the real header logo, which it hides during the flight (`hideDockTarget(true)`, OpeningOverlay.tsx:37) rather than drawing a second one. No variant set. | PASS |
| B17 | Standards checklist (01): `VOCABULARY.md` definitions still true | `git diff --name-only` | no `VOCABULARY.md` changed; `grep -i 'opening\|dock\|coin\|logo' apps/talos/VOCABULARY.md` finds no term this diff redefines | PASS |
| B18 | Standards checklist (07, 12): effect reasons and disable comments | grep | no `useEffect`, no `eslint-disable` in the diff | PASS |
| B19 | No asset loaded that the page does not use | apps/talos/site/index.html:20 | `<link rel="preload" as="image" type="image/webp" href="/icons/coin-back.webp" />` is preloaded on every load, but only `OpeningOverlay` uses it. Failing case: a second load in the same session (flag set, `playsOpening === false`) fetches `coin-back.webp` and never paints it. Chrome then logs "preloaded using link preload but not used within a few seconds" (inferred from Chrome's documented behaviour, not run here). Introduced: this branch; Fix size: one line. | FAIL (non-blocking) |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/talos (core) | `pnpm --filter @borso-app/talos exec vitest run --project core --changed f41c393f8c4b2675fa515ff2042e1c8f3953c39e --reporter=verbose --coverage` | 0. 25 files, 181 tests. The feature's own files ran: `OpeningOverlay.test.tsx` (7), `opening.adapter.test.ts` (13), `opening.core.test.ts` (11), `class-name.utils.test.ts` (including `knows text-engraved from tokens.css as a font size`), `service-worker.test.ts`. Coverage of the gated changed files: 100% statements, branches, functions and lines. | PASS |
| C02 | @borso-app/talos (back-e2e) | `pnpm --filter @borso-app/talos run test:e2e --changed f41c393f8c4b2675fa515ff2042e1c8f3953c39e` | 0. No back-e2e file is affected, because the diff touches no `api/` code. | PASS |
| C03 | @borso-app/talos (mutation) | `scripts/mutate-changed.sh f41c393f8c4b2675fa515ff2042e1c8f3953c39e apps/talos` | 0. 59 mutants killed, 0 survived: `opening.core.ts` 32, `opening.adapter.ts` 26, `class-name.utils.ts` 1. | PASS |
| C04 | @borso-app/talos (`*.utils.ts` siblings) | `ls apps/talos/site/src/components/atoms/ \| grep class-name` | The only changed `*.utils.ts`, `class-name.utils.ts`, has `class-name.utils.test.ts`, which C01 ran. | PASS |
| C05 | @borso-app/talos (typecheck) | `tsc --noEmit -p apps/talos/tsconfig.json` | 0 | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Data shape, `DockTargetBox`: the logo box in viewport pixels | `'measures the header logo in viewport coordinates'` at apps/talos/site/src/lib/opening.adapter.test.ts:95. Assertion: `expect(measureDockTarget()).toEqual({ left: 16, top: 12, width: 30, height: 28 });` | PASS |
| D02 | Data shape, `ViewportSize` | `'reads the inner size of the window'` at opening.adapter.test.ts:85. Assertion: `expect(readViewport()).toEqual({ width: window.innerWidth, height: window.innerHeight });` | PASS |
| D03 | Data shape, `DockMove`: logo centre minus the resting centre; scale = width / 150 | `'moves the coin centre onto the centre of the header logo and scales it to its width'` at opening.core.test.ts:13 (`x: 31 - 195, y: 27 - 844 * 0.42, scale: 0.2`), and `'reads the height of the logo for the vertical centre, not its width'` at opening.core.test.ts:22 | PASS |
| D04 | Data shape, `DockMove` with no logo is `{0,0,0}` | `'shrinks the coin where it stands when no header logo is on screen'` at opening.core.test.ts:27. Assertions: `expect(computeDockMove(null, PHONE)).toEqual(SHRINK_IN_PLACE);` `expect(SHRINK_IN_PLACE).toEqual({ x: 0, y: 0, scale: 0 });` | PASS |
| D05 | Data shape, session flag `'talos.opening-played' = '1'` | `'is unset in a fresh session, then set once marked'` at opening.adapter.test.ts:33. Assertion: `expect(storage.storedFlags.get('talos.opening-played')).toBe('1');` | PASS |
| D06 | Icon 1: icon files show the coin at the listed sizes; SVG files removed | **structural:** the files themselves, measured in A01 (`favicon.ico` sizes 16/32/48, every PNG at its declared size); index.html:14-17 names no SVG | PASS |
| D07 | Icon 2: maskable coin inside the 80% safe circle | **structural:** icon-maskable-512.png, content radius 178.2 px against 204.8 px (measured, A02) | PASS |
| D08 | Icon 3: colour not changed | **structural:** mean coin RGB within 1.1 of the source on every size (measured, A03) | PASS |
| D09 | Icon 4: header shows the coin face, 28 px, then "Talos", as the dock target `data-opening-dock` | (none found). No test renders `AppShell` and looks for the logo or its attribute: `grep -rn "opening-dock\|coin-face\|app.title" site/src --include=*.test.*` finds only `OpeningOverlay.test.tsx`, which mounts its own stand-in `<img data-opening-dock>` (line 8). Failing case: delete `data-opening-dock=""` at AppShell.tsx:45. Every test stays green, and on device the coin shrinks where it stands instead of landing on the logo. | FAIL (blocking) |
| D10 | Icon 5: cache version `talos-v2` | `sw.js, the worker that ships` in apps/talos/site/src/sw/service-worker.test.ts:11-12 (`const SHELL_CACHE = 'talos-v2-shell';`) with the activate test asserting `toEqual([SHELL_CACHE, DATA_CACHE, 'talos-v2-fonts'])` at lines 54-58, run against the shipped `sw.js` | PASS |
| D11 | Icon 6: manifest `background_color` `#070605` | **structural:** manifest.webmanifest:10 `"background_color": "#070605",` (static file, no logic) | PASS |
| D12 | Icon 7: README credit | **structural:** README.md:12 (static prose) | PASS |
| D13 | Opening 1: plays once per session; a reload in the same session does not replay | The pieces are covered: `'is unset in a fresh session, then set once marked'` (opening.adapter.test.ts:33) and `shouldPlayOpening` `[true, false, false]` (opening.core.test.ts:34-40). The wiring that makes a reload skip it, main.tsx:23-25, is run by no test. Failing case: delete `didRecordOpening(openingStorage);` at main.tsx:25. Every test stays green, and every reload in the session plays the 4.2 s opening again. | FAIL (blocking) |
| D14 | Opening 1: a navigation inside the app does not replay | **structural:** the overlay is mounted once at the root, outside the router (main.tsx:37), and stays `null` once `isOver` is set (OpeningOverlay.tsx:27); route changes cannot remount it | PASS |
| D15 | Opening 2: skipped under reduced motion | `shouldPlayOpening` `played false, reduced motion true: plays false` (opening.core.test.ts:34-40, `expect(shouldPlayOpening(played, reducedMotion)).toBe(expected);`) and `isMotionReduced` `'answers the reduced motion query as %s'` (opening.adapter.test.ts:86-89, `expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');`). The wiring line is the one in D13. | PASS |
| D16 | Opening 3: two spins, stop on Talos, about 4.2 s | **structural:** tokens.css:110-112 (`opening-spin-in 2.6s 0.1s`, `opening-dock 0.6s 3.6s`) and 157-160 (`rotateY(-720deg)` to `none`). jsdom runs no CSS animation; evidence frames are in `validation/opening-frames.png` | PASS |
| D17 | Opening 3: raking light, halo, "TALOS" settles | Word: `'shows the coin and the engraved name over the app'` at OpeningOverlay.test.tsx:36 (`expect(screen.getByText('TALOS')).toBeTruthy();`). Light and halo: **structural:** tokens.css:113-118,176-187,201-210 | PASS |
| D18 | Opening 3: the app opens in a circle from the coin | **structural:** OpeningOverlay.tsx:19-22 masks the night at `circle at 50% 42%` with `--opening-hole` animated from `0px` to `150vmax` (tokens.css:231-238) | PASS |
| D19 | Opening 3: logo measured when the reveal starts | `'aims the coin at the header logo once the app is revealed, and hides that logo meanwhile'` at OpeningOverlay.test.tsx:42. Assertions: `expect(coin.style.getPropertyValue('--opening-dock-scale')).toBe('0.2');` (line 54) after `opening-reveal` starts, `'0'` before it (line 46) | PASS |
| D20 | Opening 3: logo measured again when the flight starts | `'aims again when the dock starts, for a header that arrived late'` at OpeningOverlay.test.tsx:58. The logo is mounted after render, and only `opening-dock` starts. Assertion: `toBe('0.2')` at line 62 | PASS |
| D21 | Opening 4: a tap anywhere skips it | `'goes away at the first tap'` at OpeningOverlay.test.tsx:103. Assertion: `expect(screen.queryByTestId('opening')).toBeNull();` (line 108) | PASS |
| D22 | Opening 5: the app loads behind it and is never blocked | **structural:** `<App />` is rendered unconditionally beside the overlay in the same root (main.tsx:36-37), so the overlay neither wraps nor delays it | PASS |
| D23 | Opening 5: the overlay leaves the DOM when the coin lands | `'goes away when the coin has landed, and gives the header its logo back'` at OpeningOverlay.test.tsx:78. Overlay still present after `opening-word` ends (line 84); `expect(screen.queryByTestId('opening')).toBeNull();` after `opening-dock` ends (line 86) | PASS |
| D24 | Opening 6: no opacity, filter or blend on the coin or its layers | `'keeps opacity, filters and blending off the 3D coin, since each one flattens it and mirrors the back'` at OpeningOverlay.test.tsx:90 checks only class names and inline style: `expect(layer.className).not.toMatch(/opacity\|blur\|filter\|blend\|brightness/);` (line 96). It passes while the gleam layer animates `opacity` through `@keyframes opening-sheen` (A15). Failing case: the shipped code breaks the claim, and this test is green. | FAIL (blocking) |
| D25 | Opening 6: the fade-in is on the perspective wrapper | **structural:** OpeningOverlay.tsx:63 puts `perspective-opening animate-opening-coin-wrap` on the wrapper, and `opening-appear` is the only opacity keyframe aimed at it (tokens.css:109) | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Whole diff | Any database write path | `git diff origin/main...HEAD --name-only -- '*.service.ts' '*.repository.ts' '*.controller.ts'` prints nothing; the diff touches no `api/` file | PASS |
| E02 | `openingStorage`, `playsOpening` (main.tsx:23-24) | Per-process state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on the changed files finds nothing. The two module constants live in one browser tab, and the rule they hold ("once per browser session") is per tab by the spec's own definition (`sessionStorage`). No server process holds state. | PASS |

## Blocking findings

- A15 — The gleam layer inside the 3D coin animates `opacity` (`@keyframes opening-sheen`, tokens.css:189-198, applied by `animate-opening-gleam` at SpinningCoin.tsx:37). Opening 6 forbids that by name.
- D24 — The test that guards Opening 6 reads only class names and inline style, so it stays green on the A15 defect.
- D09 — No test pins the header logo or its `data-opening-dock` attribute. Removing the attribute breaks the landing with every test green.
- D13 — main.tsx:23-25, the line that records the session flag, is run by no test. Deleting `didRecordOpening(openingStorage)` replays the opening on every reload with every test green.

## Non-blocking findings

- A20 — `plan/plan.md` is absent.
- B09 — 150 px, 42% and the back-face depth `-11.8px` are written as literals beside the constants they restate.
- B10 — `hideDockTarget(false)` shows the logo. The name says the opposite of that call.
- B11 — `@FollowsBlueprint molecule-decorative-overlay` is claimed by a full-viewport overlay that takes pointer events and lives in `organisms/`.
- B19 — `coin-back.webp` is preloaded on every load, including the loads where the opening does not play.

## Notes

- A15 and D24. Per CSS Transforms 2, opacity below 1 flattens only the element that carries it. The gleam is a leaf, so it may never mirror anything on a real device (inferred, not run on a device). Two fixes meet the spec as written: drop the opacity keyframes and drive the gleam's strength through the gradient alpha with an `@property`, or amend Opening 6 to forbid these properties only on elements that have 3D children. Which one is a product call. Is the gleam's fade worth keeping at the cost of a spec amendment?
- D09 and D13 can each be closed with one small test. Render `AppShell` and assert `img[data-opening-dock]` with `width` 28. Move main.tsx:23-25 into one tested adapter function (for example `claimOpening(storage, isReduced)`) that reads, decides and records. main.tsx then only calls it.
- Does `onPointerDown={finish}` (OpeningOverlay.tsx:51) produce a ghost tap on a phone? The overlay unmounts on `pointerdown`. A touch browser then hit-tests the `click` against whatever sits under the finger, which could be a bottom tab. This needs `scripts/phone.sh touch` on the preview to settle. Not run here.
- If reduced motion switches on during the opening, `motion-reduce:hidden` makes the overlay `display: none`. No `animationend` then arrives, so the overlay stays in the DOM, invisible and inert, until the next load. Is that acceptable? It blocks nothing.
- `favicon.ico` is declared `sizes="48x48"` (index.html:14) but holds 16, 32 and 48. The separate 16 and 32 PNG links cover the smaller sizes, so nothing visible is wrong.

## Verdict: FAIL
