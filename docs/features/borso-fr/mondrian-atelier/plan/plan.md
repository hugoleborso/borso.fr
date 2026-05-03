# Plan — borso-fr Mondrian Atelier

> Early quality check. Not a human-review artefact: this is a self-check the implementation work is measured against. When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either (a) named the risk and we missed mitigating it, (b) didn't name the risk at all (gap in planning rigour), or (c) named it correctly and the defect comes from elsewhere. Pair with [`../spec/spec.md`](../spec/spec.md).

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Q1 | Vite multi-page for the whole app | `apps/borso-fr/vite.config.ts` (multi-input rollup), `package.json` scripts (`dev`, `build`) | `pnpm build` produces `dist/index.html`, `dist/family/*.html`, `dist/art/mondrian/index.html`, `dist/404.jpeg` |
| Q2 | dist-only, gitignored | Repo `.gitignore` already has `dist/` | `git status` shows no `dist/` after build |
| Q3 | Strip TweaksPanel | `App.tsx` uses `useState` only; no `useTweaks`, no `__edit_mode_*` postMessage | grep for `edit_mode` in `site/` returns nothing |
| Q4 | Delete legacy helpers | `apps/borso-fr/site/art/mondrian/{canvas,color-grid,colors,subdivision,script,painting}.js` and `style.css` removed | `ls site/art/mondrian/` lists only the new TS/TSX/CSS/HTML |
| Q5 | Tool + piece (no toggle) | Default mode = Drift; rail visible on desktop, drawer on mobile; both Compose button and tap-to-canvas active. Visible affordances unchanged from design. | Manual: page is alive on arrival but doesn't auto-recompose |
| Q6 | Mobile compose: tap + button | `MondrianFrame` is a `<button onClick={compose}>`. `.stage-compose` class shown on viewports ≤960 px. Caption swap via `(pointer: coarse)`. | Resize to ≤960 px → secondary Compose appears under frame; caption says "Tap the painting" |
| Q7 | Seed + palette in URL | `url-state.ts`: `readUrlState`, `buildSearch`. Compose → `pushState`. Palette change → `replaceState`. Cascade tick → `replaceState`. | Manual: change palette, refresh; same palette renders. Compose, hit Back; previous seed restored. |
| Q8 | All 5 palettes | `palettes.ts` exports `PALETTES` (4 presets) + `buildCustomPalette`. UI exposes 5 segments. | Visual: five segments visible |
| Q9–Q10 | Dynamic title from seed | `titles.ts` `buildTitle(seed, rects, palette)` → "A {adjective} {noun} in {colorName}". Adjective/noun from approved lists; color from dominant non-neutral fill. | Title changes when Compose pressed; changes when palette flipped |
| Q11 | Brandmark personalised | `App.tsx` rail header text = "Borso's Atelier · Est. 1999" | Visual |
| Q12 | One folder, no shell extraction | All TSX/TS lives under `apps/borso-fr/site/art/mondrian/` | `ls apps/borso-fr/site/art/` shows only `mondrian/` |
| Q13 | Default = Drift (or Still under reduced motion) | `useState(reducedMotion ? 'still' : 'drift')` | Manual + DevTools "emulate prefers-reduced-motion" |
| Q14 | Compose pushes history; Cascade replaces | `compose()` uses `pushState`, cascade tick uses `replaceState` | Compose 3×, Back 3× restores each prior seed; Cascade running for 30 s leaves history clean |
| Q15.1 | Layout vs colorize separate memos | `App.tsx`: `layout = useMemo([seed, complexity])`, `rects = useMemo([layout, palette, seed, balance])`. `drawKey` increments only on `layout` change. | Manual: change palette → painting recolours without inkbloom; change complexity → composition reshuffles with inkbloom |
| Q15.2 | inkbloom keyframe never touches transform | `styles.css`: `@keyframes inkbloom { from {opacity:0; filter: blur(6px)} to {…} }`. Drift sets `style.transform`; live at the same time as inkbloom's filter, no conflict. | Manual: switch to Drift mid-bloom; rectangles still drift after fade-in |
| Q16, Q17 | Self-host Google Fonts | `main.tsx` imports `@fontsource/*` woff2. `index.html` has no Google Fonts `<link>`. | DevTools network tab shows zero requests to `fonts.googleapis.com` / `fonts.gstatic.com` |
| Q18 | No cookies, no analytics | No code path sets `document.cookie`; no third-party scripts | grep `document.cookie` in `site/` returns nothing |
| Q19 | prefers-reduced-motion honoured | `usePrefersReducedMotion`; default mode flips to Still; inkbloom uses the `inkbloom-reduced` keyframe (opacity-only, no stagger, 180 ms) | DevTools "emulate prefers-reduced-motion: reduce" → default Still, fade-in is fast and unblurred |
| Q20 | Always Classique on first visit | Initial state `paletteKey = 'classic'` regardless of `prefers-color-scheme` | Visual: dark-mode user sees Classique on first load |
| Q21 | A11y baseline | Focus rings via `:focus-visible`; frame is `<button>` with aria-label; `<Announcer>` aria-live; `aria-checked` on segment radios; `aria-expanded` on rail toggle; font-display swap (default for `@fontsource/*`) | Manual: tab through controls, all visibly focused; screen reader announces title on Compose |

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
| Vite rewrites family/index inline `<script>` and breaks them | medium | `pnpm dev` smoke-test of all 4 pages before push | Playwright screenshot of `/`, `/family/mom.html`, `/family/les-filles.html` |
| 404.jpeg not copied because nothing imports it | medium | Moved to `site/public/404.jpeg`; Vite copies `publicDir` verbatim | After `pnpm build`, `ls dist/404.jpeg` succeeds |
| Inkbloom keyframe re-acquires `transform` during refactor | high | Keyframe only ever animates `opacity` + `filter`; reduced-motion variant only animates `opacity` | Manual: switch to Drift mid-fade-in; rectangles drift |
| Layout reshuffles on palette change (regression of round-3 design bug) | high | Two `useMemo`s, two dep lists; `drawKey++` only on `layout` change | Manual: change palette; same composition recolours |
| `noUncheckedIndexedAccess` causes a runtime crash | medium | Every array index has a fallback (`?? 0`, `?? fallback`, `if (!x) break`) | `pnpm typecheck` succeeds |
| Custom palette swatches' `<input type="color">` inside `<button>` (nested interactive) | medium | Custom swatches are `<label>` not `<button>` | Lighthouse a11y audit |
| Cascade history pollution | medium | Cascade uses `replaceState`, not `pushState` | Manual: leave Cascade running, hit Back, lands on prior non-cascade seed |
| Font self-hosting blows up bundle | low | `@fontsource/*` ships per-weight woff2 only; `import` only the weights actually used | `pnpm build` logs final asset sizes; check < 250 KB total fonts |
| Knip flags new TSX entries as unused | medium | Update `knip.json` to add `apps/borso-fr/site/**/*.tsx` as entries | `pnpm exec knip` passes pre-push |
| Biome `noExcessiveLinesPerFile` fires on App.tsx | low | App.tsx kept under default limit by extracting `painting.ts`, `palettes.ts`, `titles.ts`, `url-state.ts` | `pnpm lint` passes |
| `as Foo` slips in (banned by `no-type-assertion-except-unknown`) | low | Only `as const` used; type guards (`isPaletteKey`, `isAnimationMode`) for narrowing | `pnpm lint` passes |
| StrictMode double-mount breaks Cascade `setInterval` | medium | `useEffect` cleanup calls `clearInterval` | DevTools timeline: only one interval handle live |
| Frame-as-button click swallows custom-color picker click | medium | Custom palette swatches live in the rail, not the frame; no overlap | Manual: click each custom swatch, picker opens |
| Family pages' inline assets get hashed and break references | medium | Vite resolves `<img src="mom.png">` relative paths and rewrites HTML accordingly | Visual smoke of family pages after build |
| Playwright not installed in environment | low | `playwright install chromium` step in screenshot script docs; the dev dep gives the JS API | Run `pnpm screenshot` and read errors |

## Code-quality self-check

- [x] No `as <T>` casts; only `as const` and `as unknown` allowed by repo Biome plugin.
- [x] No `any`.
- [x] No single-letter locals outside `for (let i …)`.
- [x] Magic numbers extracted: `MULBERRY32_INCREMENT`, `COLORIZE_SEED_MIX`, `TITLE_SEED_MIX`, `PNG_EXPORT_SIZE_PX`, `DESIGN_FRAME_REFERENCE_WIDTH_PX`, `INKBLOOM_STAGGER_TOTAL_MS`, `INKBLOOM_RANDOM_JITTER_MS`, drift / breathe constants, `CASCADE_INTERVAL_MS`, `MIN_RECT_DIMENSION`, `MIN_TARGET_RECT_COUNT`, `MAX_GENERATOR_ITERATIONS`, `SPLIT_FRACTION_CHOICES`, `SPLIT_FRACTION_JITTER`, `ASPECT_BIAS_STRENGTH`, `AREA_WEIGHT_LARGE_RECT_BOOST`, `NEUTRAL_PROBABILITY_*`.
- [x] Magic strings extracted: animation modes, palette keys, URL param names live in named constants / typed unions.
- [x] Comments only document non-obvious WHY (focus-ring rationale, inkbloom-vs-transform note in spec). No what-comments.
- [x] No JSDoc on internals.
- [x] Function names describe results: `buildTitle`, `dominantColorName`, `pickSplitFraction`, `pickSplittableEntry`, `pickFromNonEmptyList`, `pickUniform`, `clearTransforms`, `applyDriftTransforms`, `applyBreatheTransforms`, `readUrlState`, `buildSearch`, `applyPaperTheme`, `isComposeKeyEvent`.
- [x] Pure helpers in `*.utils.ts` (`painting.utils.ts`, `palettes.utils.ts`, `titles.utils.ts`, `url-state.utils.ts`, `keyboard.utils.ts`) at 100% coverage; DOM side effects split into `palette-theme.ts` (no `.utils` suffix).
- [x] No defensive code for impossible cases — algorithm restructured (cumulative-probability bands, typed non-empty-list picker, return-by-let-variable pattern) so every branch is genuinely reachable. No `/* v8 ignore */`.
- [x] No generic-name variables (`current` / `next` / `result` / `data`) outside React-internal `ref.current`. Names: `rectBeingSplit`, `splitTargetIndex`, `cumulativeWeight`, `nextHex`, `nextPaletteKey`, `previousColors`, `candidateMode`.

## Pre-flight gates (run, in order, before push)

1. `pnpm install` — new deps land.
2. `pnpm --filter @borso-app/borso-fr typecheck` — TS clean.
3. `pnpm exec biome lint` — incl. type-assertion plugin.
4. `pnpm --filter @borso-app/borso-fr test:coverage` — every `*.utils.ts` at 100 % statements / branches / functions / lines.
5. `pnpm --filter @borso-app/borso-fr build` — Vite build succeeds; `dist/` is populated.
6. `pnpm exec knip` — no unused entries.
7. `/visual-validation docs/features/borso-fr/mondrian-atelier/spec/spec.md` — verdict PASS.
8. `/technical-validation docs/features/borso-fr/mondrian-atelier/spec/spec.md` — verdict PASS.

## Open questions / unknowns

- Does Vite's HTML pipeline produce stable hashed asset names for the family pages' inline-style background URLs? — to be confirmed empirically by step 4 above.
- Will `prefers-reduced-motion: reduce` users want `Cascade` itself blocked even if they explicitly select it? — currently no, the spec defers to user choice. Revisit if anyone ever complains.
- Should the dynamic title list grow? — out of scope for this PR; `titles.ts` is a single-file edit when needed.
