# Technical validation — Atelier, a gallery-style Mondrian generator on borso.fr

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: `claude/implement-mondrian-atelier-dHGN3`
- Base: `origin/main`
- Run at: 2026-05-03T21:27:08Z
- Touched workspaces: `apps/borso-fr` (feature), `infra/cdk` + `infra/shared` (unrelated DSQL refactor in-flight on the same branch), repo root (skills, dantotsus, knowledge, biome, hooks)

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Q1 | Vite multi-page, four entries (`index`, `family/mom`, `family/les-filles`, `art/mondrian`) | `apps/borso-fr/vite.config.ts:13-20` | `input: { index: …'./site/index.html', mom: …'./site/family/mom.html', lesFilles: …'./site/family/les-filles.html', mondrian: …'./site/art/mondrian/index.html' }` | PASS |
| A02 | Q1 / build gate | `pnpm build` produces all four HTML entries + `404.jpeg` in `dist/` | `apps/borso-fr/dist/{index.html, family/mom.html, family/les-filles.html, art/mondrian/index.html, 404.jpeg}` (verified by `ls`) | build OK; entries present | PASS |
| A03 | Q2 | dist gitignored | `.gitignore` (root) — already had `dist/`; `git status` shows no `dist/` after build | n/a | PASS |
| A04 | Q3 | TweaksPanel + `useTweaks` stripped, plain `useState` only | `apps/borso-fr/site/art/mondrian/App.tsx:77-86` | `const [paletteKey, setPaletteKey] = useState<PaletteKey>(…); const [seed, setSeed] = useState<number>(…); const [customColors, setCustomColors] = useState<CustomColors>(CUSTOM_DEFAULTS); …` | PASS |
| A05 | Q4 | Legacy helpers deleted | `git diff --name-status`: `D canvas.js`, `D color-grid.js`, `D colors.js`, `D subdivision.js`, `D script.js`, `D style.css`, `D painting.js` | All seven files removed | PASS |
| A06 | Q5 / Q13 | Default mode = Drift (Still under reduced-motion) | `App.tsx:83-85` | `useState<AnimationMode>(reducedMotion ? 'still' : 'drift')` | PASS |
| A07 | Q6 | Tap-to-canvas via `<button>` framing | `components.tsx:122-129` | `<button type="button" className="frame" … onClick={onCompose} aria-label="Composition. Click to recompose.">` | PASS |
| A08 | Q6 | Mobile-only secondary Compose under the frame | `App.tsx:349`, `styles/stage.css:93-95` (`display: none`), `styles/responsive.css:41-43` (`@media (max-width: 960px) { .stage-compose { display: inline-block; } }`) | Mobile-only via CSS | PASS |
| A09 | Q6 | Caption swap on coarse pointer | `App.tsx:177` `composeHint = coarsePointer ? 'Tap the painting to compose anew' : 'Press space to compose'`; `App.tsx:355-358` foot also swaps | n/a | PASS |
| A10 | Q7 | URL = `?seed=…&palette=…`; Compose pushes, palette flip replaces, Cascade tick replaces | `App.tsx:122` (`pushState`), `App.tsx:132` (`replaceState` on palette change), `App.tsx:110-114` (`replaceState` on cascade tick); `url-state.ts:36-41` builds `seed`+`palette` | `window.history.pushState({ seed: nextSeed, paletteKey }, '', buildSearch({ seed: nextSeed, paletteKey }))` for compose; `replaceState(…)` for palette + cascade | PASS |
| A11 | Q7 | popstate restores prior seed + palette | `App.tsx:141-149` | `const restored = readUrlState(window.location.search, { paletteKey: 'classic' }); setSeed(restored.seed); setPaletteKey(restored.paletteKey);` | PASS |
| A12 | Q8 | All 5 palette segments (Classique / Muted / Nocturne / Garden / Custom) | `App.tsx:29-35` | `PALETTE_OPTIONS` lists all five with the spec's labels | PASS |
| A13 | Q9 / Q10 | Dynamic title `"A {adjective} {noun} in {colorName}"`, lists in `titles.ts`, dominant non-neutral fill | `titles.ts:4-17` (lists), `titles.ts:29-34` (template), `titles.ts:39-64` (`dominantColorName` excludes `palette.bg` and `palette.line`) | `return \`A ${adjective} ${noun} in ${colorName.toLowerCase()}\`` | PASS |
| A14 | Q10 | Title regenerates on seed OR palette change | `App.tsx:170` | `const title = useMemo(() => buildTitle(seed, rects, palette), [seed, rects, palette]);` | PASS |
| A15 | Q11 | Brandmark "Borso's Atelier · Est. 1999" | `App.tsx:193` | `<span>Borso&rsquo;s Atelier · Est. 1999</span>` | PASS |
| A16 | Q12 | All code under `apps/borso-fr/site/art/mondrian/` | `ls apps/borso-fr/site/art/mondrian/` shows only `App.tsx`, `components.tsx`, `download.ts`, `index.html`, `main.tsx`, `painting.ts`, `palettes.ts`, `styles/`, `titles.ts`, `url-state.ts`, `use-animation.ts` | n/a | PASS |
| A17 | Q14 | Compose pushes; Cascade replaces (no history pollution) | `App.tsx:122` (`pushState` in `compose`), `App.tsx:110` (`replaceState` in cascade interval) | n/a | PASS |
| A18 | Q15.1 | `generateLayout` and `colorize` live in separate memos with separate dep lists | `App.tsx:93-97` | `const layout = useMemo(() => generateLayout({ seed, complexity }), [seed, complexity]); const rects = useMemo(() => colorize(layout, { seed, palette, balance }), [layout, palette, seed, balance]);` | PASS |
| A19 | Q15.1 | `drawKey` (used to retrigger inkbloom) keys off layout-changing inputs only | `App.tsx:99` | `const drawKey = \`${seed}-${complexity}\`;` — palette and balance are excluded so recolor doesn't replay | PASS |
| A20 | Q15.2 | `inkbloom` keyframe never animates `transform` (only `opacity` + `filter: blur`) | `styles/responsive.css:126-135` | `@keyframes inkbloom { from { opacity: 0; filter: blur(6px); } to { opacity: 1; filter: blur(0); } }` | PASS |
| A21 | Q19 | `inkbloom-reduced` keyframe is opacity-only | `styles/responsive.css:137-144` | `@keyframes inkbloom-reduced { from { opacity: 0; } to { opacity: 1; } }` | PASS |
| A22 | Q19 | Reduced-motion: stagger removed (delay forced to 0) | `components.tsx:132-135` | `const animationDelayMs = reducedMotion ? 0 : (rectIndex / rects.length) * INKBLOOM_STAGGER_TOTAL_MS + Math.random() * INKBLOOM_RANDOM_JITTER_MS;` | PASS |
| A23 | Q16 / Q17 | Self-host fonts via `@fontsource/*`; no Google Fonts `<link>` | `main.tsx:1-10` (imports woff2 CSS); `index.html` has no `fonts.googleapis.com` link; build emits hashed local woff2 assets (`playfair-display-latin-400-normal-*.woff2`, etc.) | `import '@fontsource/playfair-display/400.css';` etc. | PASS |
| A24 | Q21 | `font-display: swap` honoured | `@fontsource/playfair-display/400.css` carries `font-display: swap` (verified in node_modules) | n/a | PASS |
| A25 | Q20 | Always Classique on first visit (no auto-flip on `prefers-color-scheme: dark`) | `App.tsx:72-77` | `readUrlState(window.location.search, { paletteKey: 'classic' })` — default is unconditional `'classic'` | PASS |
| A26 | Q21 | Frame is `<button>` with the spec's aria-label | `components.tsx:122-129` | `<button type="button" className="frame" … aria-label="Composition. Click to recompose.">` | PASS |
| A27 | Q21 | `aria-live="polite"` Announcer of dynamic title | `components.tsx:13-19`, `App.tsx:363` | `<div className="visually-hidden" aria-live="polite" aria-atomic="true">{message}</div>` and `<Announcer message={title} />` | PASS |
| A28 | Q21 | Custom swatches use `<label>` (not nested-button) | `components.tsx:51-62` | `<label className="swatch editable" …>… <input type="color" …/></label>` | PASS |
| A29 | Use cases / edge: invalid `?seed=` falls back to fresh | `url-state.ts:18-23`, `url-state.ts:30-31` | `if (!SEED_HEX_PATTERN.test(input)) return null;` then `seed: seedParam ?? freshSeed()` | PASS |
| A30 | Use cases / edge: invalid `palette` falls back to defaults | `url-state.ts:29` | `paletteKey = paletteParam && isPaletteKey(paletteParam) ? paletteParam : defaults.paletteKey` | PASS |
| A31 | Use cases / edge: typing in input — Space must NOT compose | `App.tsx:152-160` | `if (target instanceof HTMLElement) { if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return; } if (event.code === 'Space') { event.preventDefault(); compose(); }` | PASS |
| A32 | Use cases: Cascade `clearInterval` on unmount/mode switch | `App.tsx:105-117` | `return () => window.clearInterval(intervalHandle);` cleanup; effect deps `[animationMode, paletteKey]` so a mode switch retears | PASS |
| A33 | Files-to-change: `vite.config.ts` NEW | new file at `apps/borso-fr/vite.config.ts` | n/a | PASS |
| A34 | Files-to-change: `tsconfig.json` replaced (jsx react-jsx, lib DOM, includes site/**) | `apps/borso-fr/tsconfig.json:14-18` | `"jsx": "react-jsx", "lib": ["ES2022", "DOM", "DOM.Iterable"], … "include": ["site/**/*.ts", "site/**/*.tsx", "vite.config.ts"]` | PASS |
| A35 | Files-to-change: `tsconfig.cdk.json` kept for CDK-only build | `apps/borso-fr/tsconfig.cdk.json` (NodeNext, includes `bin`) | `"module": "NodeNext", … "include": ["bin"]` | PASS |
| A36 | Files-to-change: `main.tsx` NEW | `apps/borso-fr/site/art/mondrian/main.tsx` | `createRoot(rootElement).render(<StrictMode><App /></StrictMode>)` | PASS |
| A37 | Files-to-change: `App.tsx` NEW | `apps/borso-fr/site/art/mondrian/App.tsx` (366 lines) | n/a | PASS |
| A38 | Files-to-change: spec lists single `styles.css`; impl ships split `styles/{base,rail,controls,stage,responsive}.css` | `apps/borso-fr/site/art/mondrian/styles/*.css` | Five CSS files instead of one | UNVERIFIABLE |
| A39 | Files-to-change: `titles.ts` NEW | `apps/borso-fr/site/art/mondrian/titles.ts` | n/a | PASS |
| A40 | Files-to-change: `index.html` updated to design `<head>` + root div + module script | `apps/borso-fr/site/art/mondrian/index.html:1-16` | `<title>Atelier — A Mondrian Generator</title>`, `<div id="root"></div>`, `<script type="module" src="./main.tsx"></script>`. Spec said "the design's `<head>` (fonts, meta)"; here fonts are loaded entirely from `main.tsx` rather than via head links. Behaviourally equivalent (woff2 still preloaded by Vite via the bundled CSS) but a deviation from the literal spec text. | UNVERIFIABLE |
| A41 | Files-to-change: `package.json` adds vite + react deps; replaces `dev` and `build` scripts; `typecheck` runs both tsconfigs | `apps/borso-fr/package.json:7-37` | `"dev": "vite", "build": "vite build", "typecheck": "tsc -p tsconfig.cdk.json --noEmit && tsc --noEmit"`; deps include `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom` | PASS |
| A42 | Files-to-change: PNG download = `mondrian-{seed}.png`, 2000×2000 | `download.ts:5`, `download.ts:73` | `const PNG_EXPORT_SIZE_PX = 2000;` and `rasterizeAndDownload(serializedSvg, \`mondrian-${seedToHex(args.seed)}.png\`)` | PASS |
| A43 | Spec NEW file: `apps/borso-fr/vitest.config.ts` for `coverage.provider: 'v8'` with `coverage.thresholds.100: true` scoped to `**/*.utils.ts` | not present anywhere in the diff | `find apps/borso-fr -name 'vitest.config*'` → no results | FAIL |
| A44 | Spec: `package.json` should gain `"test": "vitest run"` and `"test:coverage": "vitest run --coverage"` | `apps/borso-fr/package.json:6-17` | `"scripts"` block contains no `test` and no `test:coverage` entry | FAIL |
| A45 | Spec: pure-function modules end in `*.utils.ts` (`painting.utils.ts`, `titles.utils.ts`, `url-state.utils.ts`, `palettes.utils.ts`, plus `palette-theme.ts` for the DOM side effect) | `ls apps/borso-fr/site/art/mondrian/` shows `painting.ts`, `titles.ts`, `url-state.ts`, `palettes.ts` (no `*.utils.ts`); `applyPaperTheme` lives inside `palettes.ts:144`, not split into a sibling `palette-theme.ts` | n/a | FAIL |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Biome lint clean across changed files | `pnpm exec biome lint apps/borso-fr` | `Checked 21 files in 818ms. No fixes applied.` (exit 0) | PASS |
| B02 | Knip clean (no unused exports/files/deps) | `pnpm exec knip` | exit 0; only configuration hints printed (`tsx`, `vite` ignore-list redundancies); no unused-files / -exports / -deps errors | PASS |
| B03 | Typecheck clean | `pnpm --filter @borso-app/borso-fr typecheck` | exit 0 — `tsc -p tsconfig.cdk.json --noEmit && tsc --noEmit` succeeds | PASS |
| B04 | Vite build succeeds; all four HTML entries + 404.jpeg in dist | `pnpm --filter @borso-app/borso-fr build` | exit 0; `dist/{index.html, family/mom.html, family/les-filles.html, art/mondrian/index.html, 404.jpeg}` present; `mondrian-DhnosNUb.js 160.44 kB / gzip 52.30 kB` | PASS |
| B05 | No `any` in changed code | `grep -nP '\bany\b' apps/borso-fr/site/art/mondrian/*.{ts,tsx}` | no matches | PASS |
| B06 | No `as <T>` casts (only `as const`/`as unknown` allowed) | `grep -nE ' as [A-Z]' apps/borso-fr/site/art/mondrian/*.{ts,tsx}` | no matches | PASS |
| B07 | Inkbloom keyframe never touches `transform` (load-bearing detail Q15.2) | `grep -nE "@keyframes inkbloom"` and reading the body in `styles/responsive.css:126-144` | only `opacity` and `filter` are animated; `transform` is the live-animation surface only | PASS |
| B08 | `noUncheckedIndexedAccess` honoured — every array access has a fallback | sampled changed files: `painting.ts:57` `weights[i] ?? 0`; `painting.ts:69` `SPLIT_FRACTION_CHOICES[choiceIndex] ?? 0.5`; `painting.ts:188` `candidates[Math.floor(…)] ?? 0`; `painting.ts:190-193` `if (!chosenFill) { return … }`; `titles.ts:26` `list[Math.floor(nextRandom() * list.length)] ?? fallback`; `titles.ts:56` `palette.fills[0]?.name ?? FALLBACK_COLOR_NAME` | n/a | PASS |
| B09 | Magic numbers extracted to named consts | `painting.ts:17,18,31-37,158-161`, `titles.ts:19`, `download.ts:5-7`, `use-animation.ts:3-15`, `App.tsx:17-27`, `components.tsx:6-9` — `MULBERRY32_INCREMENT`, `COLORIZE_SEED_MIX`, `MIN_RECT_DIMENSION`, `SPLIT_FRACTION_CHOICES`, `NEUTRAL_PROBABILITY_BASE`, `TITLE_SEED_MIX`, `PNG_EXPORT_SIZE_PX`, `DESIGN_FRAME_REFERENCE_WIDTH_PX`, `DRIFT_*`, `BREATHE_*`, `CASCADE_INTERVAL_MS`, `INKBLOOM_*` etc. | n/a | PASS |
| B10 | Function names describe results | `buildTitle`, `dominantColorName`, `chooseSplitFraction`, `pickSplittableRectIndex`, `clearTransforms`, `applyDriftTransforms`, `applyBreatheTransforms`, `readUrlState`, `buildSearch`, `applyPaperTheme`, `buildCustomPalette`, `isPaletteKey`, `isAnimationMode`, `freshSeed`, `seedToHex`, `parseSeedHex`, `downloadCompositionPng`, `buildSvgDocument`, `rasterizeAndDownload` | n/a | PASS |
| B11 | No single-letter locals outside loop counters | `palettes.ts:91` defines `buildCustomPalette(c: CustomColors)` — single-letter parameter `c` (used 7×); flagged | minor | FAIL |
| B12 | Comments document WHY, not WHAT | sample: `styles/responsive.css:92` `/* Mobile-only secondary Compose button under the frame (Q6). */` (good — references decision); no what-comments observed in TS files | n/a | PASS |
| B13 | StrictMode mount: Cascade `setInterval` cleaned up | `App.tsx:105-117` | effect returns `() => window.clearInterval(intervalHandle)` so React 18 StrictMode double-invoke can't leak | PASS |
| B14 | App.tsx under `noExcessiveLinesPerFile` | `wc -l apps/borso-fr/site/art/mondrian/App.tsx` → 366 | within Biome default limit (700) — biome lint passes | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | `@borso-app/borso-fr` typecheck | `pnpm --filter @borso-app/borso-fr typecheck` | 0 | PASS |
| C02 | `@borso-app/borso-fr` build | `pnpm --filter @borso-app/borso-fr build` | 0 | PASS |
| C03 | `@borso-app/borso-fr` Biome lint | `pnpm exec biome lint apps/borso-fr` | 0 | PASS |
| C04 | Repo-wide knip | `pnpm exec knip` | 0 | PASS |
| C05 | `@borso-app/borso-fr` Vitest unit suite (spec §"Test strategy / 2. Unit tests on pure utilities") | no `test` script in `apps/borso-fr/package.json`; no `vitest.config.ts`; no `*.test.*` files under `apps/borso-fr` | not runnable | FAIL |
| C06 | `@borso-app/borso-fr` Vitest 100%-coverage gate on `**/*.utils.ts` | no `test:coverage` script; no `*.utils.ts` files | not runnable | FAIL |

## D. Test coverage of spec

The spec's "Test strategy" enumerates two pipelines: (2) Vitest unit tests on `*.utils.ts` modules at 100% coverage, and (3) UI behavioural assertions handled by `/visual-validation`. Category D below tracks (2). UI cases routed to (3) are tagged "deferred to /visual-validation" per the spec's own routing.

| # | Spec case | Covering test | Verdict |
|---|---|---|---|
| D01 | `mulberry32` determinism + uniformity bounds (spec §"Test strategy / 2") | none — no `painting.utils.test.ts` exists | FAIL |
| D02 | `generateLayout` ≥ N rects, no overlaps, depth bounded | none | FAIL |
| D03 | `colorize` neutrality probability bounded by `balance` | none | FAIL |
| D04 | `pickSplittableRectIndex` stays within unsplittable threshold | none | FAIL |
| D05 | `buildTitle` shape + determinism + dominant-color-picks-largest-non-neutral | none — no `titles.utils.test.ts` | FAIL |
| D06 | `parseSeedHex` rejects non-hex / over-length input | none — no `url-state.utils.test.ts` | FAIL |
| D07 | `seedToHex` round-trips with `parseSeedHex` | none | FAIL |
| D08 | `readUrlState` handles missing / invalid params | none | FAIL |
| D09 | `buildSearch` round-trips with `readUrlState` | none | FAIL |
| D10 | `buildCustomPalette` shape | none | FAIL |
| D11 | `isPaletteKey` accepts the five keys, rejects garbage | none | FAIL |
| D12 | `PALETTES` keyed by every `PaletteKey` except `'custom'` | none | FAIL |
| D13 | Happy path 1–10 (default render → custom swatches → animation modes → compose → back-restore → download → URL share) | spec routes UI behaviour to `/visual-validation`; no Vitest row required | deferred to /visual-validation |
| D14 | Edge: mobile drawer + secondary Compose under frame at ≤960 px | routed to `/visual-validation` | deferred to /visual-validation |
| D15 | Edge: phone (≤520 px) + narrow phone (≤380 px) reflow | routed to `/visual-validation` | deferred to /visual-validation |
| D16 | Edge: short viewport (<700 px tall, ≥961 px wide) frame cap | routed to `/visual-validation` | deferred to /visual-validation |
| D17 | Edge: Cascade interval cleared on unmount and mode-switch | spec lists this under §"edge cases"; no unit test of the React effect, no `/visual-validation` row, no integration test. The implementation in `App.tsx:105-117` has the cleanup but it is only verified by reading. | UNVERIFIABLE |
| D18 | Edge: typing in `<input>` — Space must NOT compose | similar — listed as edge case; `App.tsx:152-160` has the guard but no automated assertion | UNVERIFIABLE |
| D19 | Edge: `?seed=` invalid → fresh seed, no throw | spec lists this under `/visual-validation` ("Invalid `?seed=garbage`: fresh composition, no console error"); the `parseSeedHex` rejection path also belongs in `url-state.utils.test.ts` per §"Test strategy / 2" | FAIL (Vitest row missing); deferred to /visual-validation for the UI half |
| D20 | Edge: caption swap on `(pointer: coarse)` | routed to `/visual-validation` | deferred to /visual-validation |
| D21 | `prefers-reduced-motion: reduce` → default Still + opacity-only inkbloom | routed to `/visual-validation` | deferred to /visual-validation |
| D22 | `prefers-color-scheme: dark` → still Classique on first visit | routed to `/visual-validation` | deferred to /visual-validation |

## Notes

- **A38 (UNVERIFIABLE).** Spec §"Files to change / NEW" lists a single `styles.css`; implementation ships `styles/{base,rail,controls,stage,responsive}.css` (5 files, 713 lines total). Behaviourally equivalent and arguably cleaner, but it diverges from the literal spec. Either update the spec to allow a `styles/` directory or consolidate. Not a behavioural defect.
- **A40 (UNVERIFIABLE).** Spec §"Files to change / UPDATE" said `index.html` should carry "the design's `<head>` (fonts, meta)" alongside the root div + script. Implementation drops fonts entirely from `<head>` and loads them all via `import '@fontsource/.../*.css'` inside `main.tsx`. Functionally equivalent (Vite still inlines a font-CSS preamble at build time, woff2 still hashed and served from `dist/assets/`), but the literal `<head>` is shorter than the spec implied. Decide whether to amend the spec or move the imports.
- **A43 / A44 / A45 / C05 / C06 / D01–D12, D19 (FAIL).** The whole Vitest pipeline named in spec §"Test strategy / 2" is absent. No `vitest.config.ts`, no `test` / `test:coverage` scripts in `apps/borso-fr/package.json`, no rename of the pure modules to `*.utils.ts`, no extraction of `applyPaperTheme` into a `palette-theme.ts` sibling, no `*.utils.test.ts` files. The spec is explicit ("Repo rule … pure-function modules end in `*.utils.ts` and ship at 100% statement / branch / function / line coverage") — and the spec also pre-empts this gap under `.claude/skills/specification/SKILL.md`'s "Frontend apps don't need tests" failure mode. The pure logic that should be tested (`mulberry32`, `generateLayout`, `colorize`, `pickSplittableRectIndex`, `buildTitle`, `dominantColorName`, `parseSeedHex`, `seedToHex`, `readUrlState`, `buildSearch`, `buildCustomPalette`, `isPaletteKey`) is all present and correct on inspection, but none of it is automated; a future regression in any of these is undetectable until visual validation catches a downstream symptom. This is the load-bearing failure of the implementation.
- **B11 (FAIL).** `palettes.ts:91` declares `function buildCustomPalette(c: CustomColors): Palette` with a single-letter parameter `c` referenced 7× in the body. CLAUDE.md "Clean code" forbids single-letter locals outside trivial loop scopes. Rename to `customColors` or `colors`.
- **D17 / D18 (UNVERIFIABLE).** The Cascade-cleanup edge case and the typing-in-input Space-suppression edge case are listed in spec §"Use cases / edge cases" but neither the Vitest pipeline (which would need a React-Testing-Library / jsdom layer the spec doesn't mandate) nor the `/visual-validation` plan explicitly covers them. The implementation has the right shape; nothing automated guards it.
- **Plan present and used.** No rows tagged UNVERIFIABLE because of plan absence.
- **Cross-cutting observation.** Beyond the feature, the same branch contains an apparently-unrelated DSQL refactor (`infra/cdk/src/constructs/dsql-cluster-stack.ts` NEW, `previewable-app.ts` MODIFIED, two new test files, plus a large knowledge-base / dantotsu / skills landing). Those are out of this validator's scope; they each deserve their own validation pass before merge.

## Verdict: FAIL

Aggregation: 35 PASS, 2 UNVERIFIABLE, and 14 FAIL rows across categories A, B, C, D. The dominant failure cluster is the missing Vitest pipeline (spec §"Test strategy / 2" and §"Repo rule … `*.utils.ts` at 100% coverage"), which alone disqualifies the branch under the spec's own gate ("Verdict must be PASS before push"). Secondary defect: B11 single-letter parameter in `palettes.ts`. Spec/file deviations A38 and A40 are recoverable by either an amend or a small refactor.
