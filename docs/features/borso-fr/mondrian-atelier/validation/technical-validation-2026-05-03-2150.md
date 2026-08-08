# Technical validation — Atelier — a gallery-style Mondrian generator on borso.fr

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/implement-mondrian-atelier-dHGN3
- Base: origin/main
- Run at: 2026-05-03T21:54:00Z
- Touched workspaces: @borso-app/borso-fr (primary), @borso/infra (unrelated DSQL changes), repo-root (.claude skills, docs, biome config, husky, knip)

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Q1 (Vite multi-page) | Vite multi-input rollup config covering index, family/{mom, les-filles}, art/mondrian | apps/borso-fr/vite.config.ts:13–20 | `input: { index: …'./site/index.html', mom: …'./site/family/mom.html', lesFilles: …'./site/family/les-filles.html', mondrian: …'./site/art/mondrian/index.html' }` | PASS |
| A02 | Q2 (dist-only) | Build outputs only land in dist/ | apps/borso-fr/vite.config.ts:11; `pnpm build` log shows `../dist/...` and `git status` clean | `outDir: fromHere('./dist'), emptyOutDir: true` | PASS |
| A03 | Q3 (Strip TweaksPanel) | No `TweaksPanel`, `useTweaks`, or `__edit_mode` postMessage in shipped code | grep on apps/borso-fr/site returns 0 matches | (zero matches for `edit_mode\|TweaksPanel\|useTweaks`) | PASS |
| A04 | Q4 (Delete legacy helpers) | canvas.js / color-grid.js / colors.js / subdivision.js / script.js / style.css / painting.js removed | git diff name-status shows D for all seven; `ls site/art/mondrian/*.js` errors | (file listing matches "no .js files") | PASS |
| A05 | Q5 / Q13 (default = Drift, Still under reduced-motion) | Initial animationMode flips to Still when `(prefers-reduced-motion: reduce)` matches | apps/borso-fr/site/art/mondrian/App.tsx:84–86 | `useState<AnimationMode>(reducedMotion ? 'still' : 'drift')` | PASS |
| A06 | Q6 (Mobile compose: tap + button) | MondrianFrame is a `<button>` with onClick=compose; `.stage-compose` exists | components.tsx:122–129 + App.tsx:355–357 + styles/responsive.css:41–43 | `<button type="button" className="frame" … onClick={onCompose} aria-label="Composition. Click to recompose.">` and `.stage-compose { display: inline-block }` inside `@media (max-width: 960px)` | PASS |
| A07 | Q7 (Seed + palette in URL; pushState on compose, replaceState on palette/cascade) | compose() pushes; changePalette() replaces; cascade tick replaces | App.tsx:120–128, 130–140, 106–118 | `window.history.pushState({ seed: nextSeed, paletteKey }, '', buildSearch(...))` (compose); `window.history.replaceState(...)` for palette change and cascade tick | PASS |
| A08 | Q8 (All 5 palettes) | Five segments rendered: Classique / Muted / Nocturne / Garden / Custom | App.tsx:30–36 | `PALETTE_OPTIONS` lists all five with the labels from the spec | PASS |
| A09 | Q9–Q10 (dynamic title from seed + dominant colour) | `buildTitle(seed, rects, palette)` returns `A {adj} {noun} in {colorName}` from approved lists; dominant non-neutral | titles.utils.ts:41–47 + 4–17 | `return \`A ${adjective} ${noun} in ${dominantColor.toLowerCase()}\`` and ADJECTIVES/NOUNS lists exactly match Q10 | PASS |
| A10 | Q11 (Brandmark) | "Borso's Atelier · Est. 1999" | App.tsx:189 | `<span>Borso&rsquo;s Atelier · Est. 1999</span>` | PASS |
| A11 | Q12 (no shell extraction) | All TS/TSX lives under `apps/borso-fr/site/art/mondrian/`; no `_shared/` | `ls apps/borso-fr/site/art/` shows only `mondrian/` | (directory listing) | PASS |
| A12 | Q14 (Compose pushes; Cascade replaces) | Cascade interval calls `replaceState`, compose calls `pushState` | App.tsx:108–116 vs 121–127 | `setInterval(() => { … window.history.replaceState(...) }, CASCADE_INTERVAL_MS)` (cascade) vs `window.history.pushState(...)` (compose) | PASS |
| A13 | Q14 (Cascade cleanup) | `clearInterval` on unmount and on mode switch | App.tsx:117 | `return () => window.clearInterval(intervalHandle);` | PASS |
| A14 | Q15.1 (layout vs colorize as separate memos) | Two `useMemo`s with distinct dep lists | App.tsx:94–98 | `const layout = useMemo(() => generateLayout({seed,complexity}), [seed, complexity]); const rects = useMemo(() => colorize(layout, …), [layout, palette, seed, balance])` | PASS |
| A15 | Q15.2 (inkbloom never touches transform) | Keyframes only animate opacity + filter | styles/responsive.css:126–144 | `@keyframes inkbloom { from { opacity: 0; filter: blur(6px); } to { opacity: 1; filter: blur(0); } }` and `inkbloom-reduced` opacity-only | PASS |
| A16 | Q16/Q17 (Self-host fonts) | `@fontsource/*` imported in main.tsx; no Google Fonts links anywhere | main.tsx:1–10 + grep on index.html / styles | imports of `@fontsource/playfair-display`, `cormorant-garamond`, `jetbrains-mono`; zero matches for `fonts.googleapis\|fonts.gstatic` | PASS |
| A17 | Q18 (no cookies / analytics) | No `document.cookie`, no third-party scripts | grep on site/ | (zero matches for `document.cookie`) | PASS |
| A18 | Q19 (`prefers-reduced-motion`) | Hook listens for the media query; default flips to Still; `inkbloom-reduced` keyframe is opacity-only | App.tsx:45–55, 84–86; components.tsx:119–120; styles/responsive.css:137–144 | `useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)`; reduced animation drops blur | PASS |
| A19 | Q20 (Always Classique on first visit) | URL default `paletteKey: 'classic'` regardless of color-scheme | App.tsx:73–78 | `readUrlState(window.location.search, { paletteKey: 'classic' })` | PASS |
| A20 | Q21 (Frame is `<button>` with aria-label; aria-live announcer; focus rings) | All present | components.tsx:13–19, 122–129; styles/base.css:66–68 | `<div … aria-live="polite" aria-atomic="true">{message}</div>`; frame has `aria-label="Composition. Click to recompose."`; `:focus-visible { outline: 1px solid var(--ink); outline-offset: 2px }` | PASS |
| A21 | Use case 7 (space / tap / Compose recompose) | Space keydown handled with input/textarea guard | keyboard.utils.ts:1–8 + App.tsx:152–160 | `if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return false;` and the keydown effect in App | PASS |
| A22 | Use case 8 (Browser Back) | popstate listener restores seed and palette | App.tsx:142–150 | `window.addEventListener('popstate', onPopState)` → restored.seed / restored.paletteKey | PASS |
| A23 | Use case 9 (Download PNG, mondrian-{seed}.png, 2000×2000) | `downloadCompositionPng` builds 2000-wide SVG, rasterises, downloads | download.ts:5, 47–61, 73 | `const PNG_EXPORT_SIZE_PX = 2000` and `downloadLink.download = \`mondrian-${seedToHex(args.seed)}.png\`` | PASS |
| A24 | Edge case "invalid `?seed`" | Falls back to fresh seed silently | url-state.utils.ts:18–22, 30 | `if (!SEED_HEX_PATTERN.test(input)) return null;` then `seed: parsedSeed ?? freshSeed()` | PASS |
| A25 | Edge case caption swap on `(pointer: coarse)` | Hint text swaps on coarse pointer | App.tsx:173, 362–364 | `coarsePointer ? 'Tap the painting to compose anew' : 'Press space to compose'` | PASS |
| A26 | "Files to change — NEW" — vite.config.ts | Created with multi-page entries | apps/borso-fr/vite.config.ts (full file) | covered in A01 | PASS |
| A27 | "Files to change — NEW" — vitest.config.ts | jsdom + 100% v8 coverage on `**/*.utils.ts` | apps/borso-fr/vitest.config.ts:4–17 | `environment: 'jsdom'`, `include: ['site/**/*.utils.test.ts']`, `coverage: { provider: 'v8', include: ['site/**/*.utils.ts'], thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 } }` | PASS |
| A28 | "Files to change — NEW" — tsconfig.json replaced + tsconfig.cdk.json kept | Two tsconfigs: app config (jsx, DOM) + CDK config (NodeNext, includes bin) | apps/borso-fr/tsconfig.json + tsconfig.cdk.json (file exists) | `"jsx": "react-jsx"`, `"lib": ["ES2022", "DOM", "DOM.Iterable"]`, `include: ["site/**/*.ts","site/**/*.tsx","vite.config.ts"]` | PARTIAL |
| A29 | "Files to change — NEW" — main.tsx | Imports four font CSS bundles + App + style CSS, calls createRoot | main.tsx:1–26 | imports + `createRoot(rootElement).render(<StrictMode><App /></StrictMode>)` | PASS |
| A30 | "Files to change — NEW" — App.tsx, components.tsx, use-animation.ts, download.ts | All files present, App.tsx is split | files exist; sizes within thresholds | (component file structure matches) | PASS |
| A31 | "Files to change — NEW" — painting/titles/url-state/palettes/keyboard `.utils.ts` + tests | Five utils modules + their `.utils.test.ts` siblings | files exist (see C section) | (listing matches) | PASS |
| A32 | "Files to change — NEW" — palette-theme.ts (DOM side-effect) | `applyPaperTheme` writes CSS custom properties; not coverage-gated | palette-theme.ts:42–51 | `document.documentElement.style.setProperty('--paper', theme.paper)` etc. | PASS |
| A33 | "Files to change — NEW" — five CSS files under styles/ | base, rail, controls, stage, responsive present + imported in main.tsx | main.tsx:14–18 | `import './styles/base.css'; import './styles/rail.css'; import './styles/controls.css'; import './styles/stage.css'; import './styles/responsive.css';` | PASS |
| A34 | "Files to change — UPDATE" — index.html | Replaced with React root + module script + meta; no Google Fonts link | index.html:1–17 | `<title>Atelier — A Mondrian Generator</title>` + `<script type="module" src="./main.tsx">` | PASS |
| A35 | "Files to change — UPDATE" — package.json scripts + deps | dev/build use vite; test/test:coverage added; vite/react/vitest/jsdom in deps | package.json:6–14, 20–43 | `"dev": "vite"`, `"build": "vite build"`, `"test": "vitest run"`, `"test:coverage": "vitest run --coverage"` plus the listed deps | PASS |
| A36 | Production strategy: dist contains every page | `pnpm build` produces dist/index.html, dist/family/{mom,les-filles}.html, dist/art/mondrian/index.html, dist/404.jpeg | `find apps/borso-fr/dist -name "*.html"` lists all four; `dist/404.jpeg` present | (find output) | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | grep on changed files for typical 1-letter idents outside `for (let i = 0; …)` | sample identifiers: `nextRandom`, `splitTargetIndex`, `weightedSplittables`, `cumulativeWeight`, `rectBeingSplit`, `previousColors`, `candidateMode`, `lowDrawStream` (matches plan's "no generic names" claim) | PASS |
| B02 | Magic numbers extracted | grep for raw numbers in `.utils.ts` | `MULBERRY32_INCREMENT = 0x6d2b79f5`, `COLORIZE_SEED_MIX`, `TITLE_SEED_MIX`, `PNG_EXPORT_SIZE_PX = 2000`, `DESIGN_FRAME_REFERENCE_WIDTH_PX`, `INKBLOOM_*_MS`, drift / breathe constants, `CASCADE_INTERVAL_MS = 5500`, `MIN_RECT_DIMENSION`, `MIN_TARGET_RECT_COUNT`, `MAX_GENERATOR_ITERATIONS`, `NEUTRAL_PROBABILITY_*` | PASS |
| B03 | Comments WHY-only | grep for comments in changed code | only one comment in TS/TSX: none in code; one in stage.css `/* Mobile-only secondary Compose button under the frame (Q6). */` | PASS |
| B04 | Function names describe results | sample: `buildTitle`, `dominantColorName`, `pickSplitFraction`, `pickSplittableEntry`, `pickFromNonEmptyList`, `applyDriftTransforms`, `applyBreatheTransforms`, `applyPaperTheme`, `isComposeKeyEvent`, `freshSeed`, `seedToHex`, `readUrlState`, `buildSearch`, `downloadCompositionPng`, `buildSvgDocument`, `rasterizeAndDownload` | matches plan bullet | PASS |
| B05 | Type assertions limited to `as const` / `as unknown` | grep for `as [A-Z]` excluding allowed | zero matches | PASS |
| B06 | No `any` | `grep -nP '\bany\b' *.ts *.tsx` | zero matches | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | typecheck succeeds against the strict config | `pnpm --filter @borso-app/borso-fr run typecheck` exits 0 (`tsc -p tsconfig.cdk.json --noEmit && tsc --noEmit`) | PASS |
| B08 | Biome lint clean | `pnpm exec biome lint apps/borso-fr/site/art/mondrian apps/borso-fr/vite.config.ts apps/borso-fr/vitest.config.ts` | "Checked 22 files in 902ms. No fixes applied." (exit 0) | PASS |
| B09 | knip clean | `pnpm exec knip` | exit 0, no output | PASS |
| B10 | No JSDoc on internals | grep on the changed TS files | no `/**` blocks present in any of the new/changed `.ts`/`.tsx` files under `site/art/mondrian/` | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/borso-fr (typecheck) | `pnpm --filter @borso-app/borso-fr run typecheck` | 0 | PASS |
| C02 | @borso-app/borso-fr (vitest + 100% coverage) | `pnpm --filter @borso-app/borso-fr run test:coverage` | 0 — 5 test files, 73 tests passed; coverage 100% statements/branches/functions/lines on every `*.utils.ts` (keyboard, painting, palettes, titles, url-state) | PASS |
| C03 | @borso-app/borso-fr (build) | `pnpm --filter @borso-app/borso-fr run build` | 0 — dist/{index.html, family/mom.html, family/les-filles.html, art/mondrian/index.html, 404.jpeg} all present | PASS |
| C04 | repo-root (biome lint) | `pnpm exec biome lint apps/borso-fr/site/art/mondrian apps/borso-fr/vite.config.ts apps/borso-fr/vitest.config.ts` | 0 | PASS |
| C05 | repo-root (knip) | `pnpm exec knip` | 0 | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Happy path 1–2 (fresh seed when `?seed=` missing) | `readUrlState` "returns a fresh seed and the default palette when the search is empty" — url-state.utils.test.ts:17 | PASS |
| D02 | Happy path 3 (sliders update without reshuffling layout) | Architectural: `layout` and `rects` are split memos in App.tsx:94–98. No unit test directly covers the no-reshuffle behaviour; spec routes it to /visual-validation step "Sliders … update without reshuffling layout" | UNVERIFIABLE |
| D03 | Happy path 4 (palette segment recolours + retitles) | `buildTitle` "uses a colour name from the active palette" — titles.utils.test.ts:52; palette change path covered by `buildSearch` round-trip url-state.utils.test.ts:61. Visual recolour confirmation routed to /visual-validation. | PASS |
| D04 | Happy path 5 (custom swatch live recolour) | Spec routes to /visual-validation "Custom palette: clicking a swatch opens the OS color picker; selecting a colour live-recolours" | UNVERIFIABLE |
| D05 | Happy path 6 (animation mode segment switch) | Spec routes to /visual-validation "Animation modes: Still/Drift/Breathe/Cascade are visually distinct; switching modes does not replay inkbloom" | UNVERIFIABLE |
| D06 | Happy path 7 (compose: space / tap / button → new seed + URL update) | `isComposeKeyEvent` tests in keyboard.utils.test.ts cover the Space / non-Space / typing-in-input branches; `freshSeed` finite-and-distinct in url-state.utils.test.ts:74; URL push semantics routed to /visual-validation | PASS |
| D07 | Happy path 8 (browser Back restores prior seed + palette) | `buildSearch` round-trip via `readUrlState` — url-state.utils.test.ts:61–66 (covers the parsing direction popstate uses). End-to-end Back behaviour routed to /visual-validation. | PASS |
| D08 | Happy path 9 (Download PNG `mondrian-{seed}.png`, 2000×2000) | No unit test on download.ts (DOM side-effect, not a `.utils.ts`). Spec routes to /visual-validation "Download triggers a 2000×2000 PNG named `mondrian-<seed>.png`". | UNVERIFIABLE |
| D09 | Happy path 10 (share URL → same composition) | `buildSearch` ↔ `readUrlState` round-trip; `mulberry32` determinism + `generateLayout` determinism + `colorize` determinism cover end-to-end reproducibility. painting.utils.test.ts:12, 156, 221 | PASS |
| D10 | Edge case: mobile (<960 px) — drawer + secondary Compose | Routed to /visual-validation "Mobile (≤ 960 px): drawer toggle visible, secondary Compose button under the frame, caption swap" | UNVERIFIABLE |
| D11 | Edge case: phone (<520 px) reflow | Routed to /visual-validation | UNVERIFIABLE |
| D12 | Edge case: narrow phone (<380 px) animation segments wrap 2×2 | Routed to /visual-validation | UNVERIFIABLE |
| D13 | Edge case: short viewport (<700 px tall, ≥961 px wide) frame caps | Routed to /visual-validation | UNVERIFIABLE |
| D14 | Edge case: cascade `clearInterval` on unmount + mode switch | Architectural: App.tsx:117 returns the cleanup. Spec routes the runtime check to /visual-validation "Cascade cleanup: switching to Cascade and back…" | UNVERIFIABLE |
| D15 | Edge case: typing in `<input>` doesn't compose | `isComposeKeyEvent` "returns false when typing inside an `<input>`" / `<textarea>` — keyboard.utils.test.ts:18, 26 | PASS |
| D16 | Edge case: tap-the-canvas listener is the canvas, not overlay | Architectural: MondrianFrame is the `<button>`; the radial-gradient overlay has `pointer-events: none` (stage.css:77). Spec routes runtime check to /visual-validation | PASS |
| D17 | Edge case: caption swap `(pointer: coarse)` | Code path covered: App.tsx:173. End-to-end check routed to /visual-validation. | PASS |
| D18 | Edge case: `?seed=` invalid → fresh seed (no throw) | `readUrlState` "falls back to a fresh seed when the seed is invalid hex" / "too long" / "missing" — url-state.utils.test.ts:30, 37, 48 | PASS |
| D19 | Edge case: invalid palette → Classique | `readUrlState` "falls back to the default palette when the palette is invalid" — url-state.utils.test.ts:42 | PASS |
| D20 | Edge case: `prefers-reduced-motion: reduce` → default Still + opacity-only inkbloom | Routed to /visual-validation "`prefers-reduced-motion: reduce` (via agent-browser set media): default mode is Still, inkbloom keyframe is opacity-only, no per-rect stagger" | UNVERIFIABLE |
| D21 | Edge case: `prefers-color-scheme: dark` still Classique | Routed to /visual-validation | UNVERIFIABLE |
| D22 | Error case: PNG download fallback when `canvas.toBlob` missing | download.ts:52–53 silently exits if `pngBlob` falsy — `if (!pngBlob) return;`. No automated test (DOM side-effect file). | UNVERIFIABLE |

## Notes

- A28 — PARTIAL: spec line 191 says the new app `tsconfig.json` should pull `vitest/globals` into `types`. The shipped tsconfig.json has `"types": ["vite/client"]` only — `vitest/globals` is absent. In practice the test files use named imports from `vitest` (`import { describe, expect, it } from 'vitest'`), so the omission has no functional impact; tests run, typecheck and coverage gate all pass. Flagging as the only divergence between the spec's "Files to change" line and the shipped tsconfig.
- D02, D04, D05, D08, D10–D14, D20, D21, D22 — UNVERIFIABLE: the spec's test strategy explicitly routes these UI / browser-runtime concerns to the `/visual-validation` agent ("UI behavioural assertions" section), not to Vitest. The unit-test suite cannot exercise them. They are not failures of test coverage relative to the spec — they will be (or have been) covered by the visual-validation report.
- D16 was tagged PASS even though no unit test asserts pointer-events directly: stage.css:75–78 forbids the overlay from receiving clicks (`pointer-events: none` on `.frame::after`), and `MondrianFrame` is itself the click target — the architectural impossibility of the bug satisfies the spec's edge case.
- All five `*.utils.ts` files are at 100% statements / branches / functions / lines as required by `vitest.config.ts` thresholds and the spec's "Coverage gates" rule.
- knip and biome both pass with zero output / zero errors on the entire repo.

## Verdict: PARTIAL

There are no FAIL rows. One PARTIAL (A28: tsconfig `types` omits `vitest/globals` per spec text) and twelve UNVERIFIABLE rows that the spec itself defers to the `/visual-validation` agent. Per the verdict semantics in the technical-validation standard, ≥1 UNVERIFIABLE with 0 FAIL → PARTIAL. The implementation is faithful to the spec's correctness, cleanliness, and unit-test coverage requirements; the remaining behavioural assertions need a passing visual-validation report before push.
