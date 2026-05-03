# Atelier — a gallery-style Mondrian generator on borso.fr

> Client / audience: degenerate as a *business* stakeholder (personal site), but visitor-facing concerns confronted in Q17–Q18 (RGPD/Google Fonts, EU privacy posture).
> Designer: visual design confronted *outside this session* via Claude Design and exported as the bundle at `mondrian-generator/`. Design-adjacent concerns the prototype didn't settle (motion / dark-mode / a11y) confronted in-session, Q19–Q21.
> Product: confronted in-session via Q5–Q14.
> Tech-lead / developer: confronted in-session via Q1–Q4 + Q15–Q16.

## Why

The current `/art/mondrian` page is a functional but plain generator (number inputs, raw HTML controls, white box, two animation modes). Reference: [`apps/borso-fr/site/art/mondrian/index.html`](../../../../../apps/borso-fr/site/art/mondrian/index.html) and [`painting.js`](../../../../../apps/borso-fr/site/art/mondrian/painting.js). The user's complaint, verbatim from the Claude Design transcript: *"I want the same feature, but with a way more artsy design. Fancy fonts (artistic), user friendly settings, maybe better animation… I just want it to be beautiful AND responsive."*

The user iterated through four rounds with Claude Design and landed on **Atelier**: a gallery-catalog UI with serif/mono typography, a left "wall label" rail of curated controls, a centered framed canvas, and four animation modes (Still / Drift / Breathe / Cascade).

**Measurable objective (single):** the page should work simultaneously as a *piece showing the user's artsy side* and as a *tool for friends to play with* — no mode toggle, no compromise on either. Operationally that means: typography & layout match the design pixel-for-pixel; the canvas is the visual hero; the page is responsive down to 380 px; both pressing space *and* tapping the canvas recompose; the seed is in the URL so a friend can share what they made.

Field observation (Gemba): the iteration history in `mondrian-generator/chats/chat1.md` *is* the field observation — the user has already used the existing tool, found it insufficient, and produced the visual target through dialogue with the design assistant.

## Result

Single page at `/art/mondrian/`, replacing the existing one. Visual reference: the design HTML at `mondrian-generator/project/Mondrian Atelier.html` (the bundle's primary file). The implementation must match that file's rendered output 1:1 for visual concerns — colors, type scale, spacing, animation amplitudes, swatch layout, segmented controls, palette presets, custom palette picker, frame shadow & vignette, responsive breakpoints (960 px, 520 px, 380 px), and the short-viewport rule (<700 px tall).

**Out-of-scope visual changes:** none. Don't redesign during port — if the design has a quirk, it's intentional.

**Out-of-scope features:** the `TweaksPanel` from the prototype (claude.ai/design's edit-mode host protocol — invisible outside that host) and its `useTweaks` persistence shim. State becomes plain `React.useState`.

**Product changes vs. design:**
- Stage header gets a *dynamic* title (not the design's static "Untitled, in primary colors").
- Brandmark in the rail header is "Borso's Atelier · Est. 1999" (not the design's "Atelier · Est. 1917").
- Seed lives in the URL (`?seed=…`), shareable; refresh restores the same composition.
- Compose pushes onto browser history (so Back returns to the previous composition).
- Mobile gets *both* tap-the-canvas and a Compose button promoted out of the drawer onto the stage.

## Use cases / edge cases

Happy path:
1. User navigates to `/art/mondrian/` (no `?seed=`) → fresh seed.
2. Page renders with default palette = Classique, complexity = 22, line weight = 6, balance = 0.5, **drift** animation. Composition rendered, dynamic title generated, seed reflected into `?seed=…` via `history.replaceState`.
3. User adjusts complexity / line weight / balance sliders → canvas updates without reshuffling the layout (only colors / line widths change on balance/lineWeight; complexity *does* reshuffle).
4. User clicks a palette segment (Classique / Muted / Nocturne / Garden / Custom) → page theme & canvas recolor; title regenerates because dominant color changes.
5. With Custom selected, user clicks any of the 5 swatches → native color picker opens, color updates live.
6. User clicks an animation mode segment → animation switches without re-triggering the inkbloom entry animation.
7. User presses **space** (desktop), **taps the canvas** (mobile or desktop), or clicks **Compose** → new seed, layout reshuffles, ink-bloom entry replays, URL updates via `history.pushState`, dynamic title regenerates.
8. User clicks browser **Back** → previous seed (and palette, if it had been changed via pushState) restored from URL, composition + title restored.
9. User clicks **Download** → PNG of the current composition (2000×2000) downloads as `mondrian-{seed}.png`.
10. User shares the URL with a friend; friend opens it; same composition renders in the same palette.

Edge cases:
- Mobile (<960 px): rail collapses to a top drawer, toggle button appears top-right; **Compose button is also rendered under the frame as a primary action** (this is mobile-only; on desktop it stays in the rail).
- Phone (<520 px): swatches/segments shrink, stage-foot stacks.
- Narrow phone (<380 px): animation segments wrap 2×2.
- Short viewport (<700 px tall, ≥961 px wide): frame size capped to fit without scroll.
- Cascade mode: a fresh seed every 5500 ms — must `clearInterval` on unmount and on mode switch. Cascade-driven seed changes use `replaceState` (not `pushState`) so the back-stack doesn't fill up with auto-cascades.
- User typing in an input: space must NOT trigger compose (handled by the prototype's `e.target.tagName` check; preserve it).
- Tap-the-canvas must not fire if the tap is on the framed-canvas overlay's edge that overlaps a control (unlikely given layout, but ensure the canvas's `<canvas>` element is the listener target, not the framed-canvas wrapper).
- Caption swap on touch devices: replace "Press space to compose new" with "Tap the painting to compose new" when `(pointer: coarse)` matches.
- `?seed=` invalid (non-hex / wrong length): fall back to a fresh seed; do NOT throw.

Error cases:
- None observable to the user. PNG download falls back silently if the browser lacks `canvas.toBlob` (basically nothing in 2026).
- Invalid `?seed` query → silently regenerate.

## Questions, Options and Decisions

### Q1 — How to port the React+Babel-CDN prototype into a static-HTML app? `[2026-05-03]`
- **Drop-in HTML with React via CDN** — zero infra change, but ships unminified Babel + does runtime JSX transform on every page load (~200 ms cold).
- **esbuild one-shot** — small dev dep, bundles a single entry; loses HMR.
- **Vite for the whole app** *(picked)* — borso-fr already needs a build step (`build` script does `cp -R`); upgrading it to a real Vite multi-page project gives clean dev/build/deploy and HMR for any future React work, at the cost of touching every page (each `.html` becomes a Vite entry).

### Q2 — Where do build outputs land? `[2026-05-03]`
- **dist-only, gitignored** *(picked)*. Vite default. CI/CD runs `pnpm build` before `cdk deploy`.
- Commit `bundle.js` into `site/` — rejected (duplication, dirty diffs).

### Q3 — Drop the TweaksPanel? `[2026-05-03]`
- **Strip it** *(picked)*. The panel only renders if a parent frame posts `__activate_edit_mode`; outside claude.ai/design it's dead code. State moves to plain `useState`.
- Keep it — rejected (dead code; ~390 lines of unused host-protocol).

### Q4 — Old helper files (canvas.js, colors.js, color-grid.js, subdivision.js, script.js, style.css, painting.js)? `[2026-05-03]`
- **Delete all** *(picked)*. None are imported after `index.html` is replaced.

### Q5 — Tool or piece? `[2026-05-03]`
- Tool — generator first.
- Piece — ambient art first.
- **Both, at the same time, like the design** *(picked)*. No mode toggle. Default mode is Drift (subtle parallax) — the page feels alive on arrival but isn't auto-recomposing; controls are visible (rail on desktop, drawer toggle on mobile); Compose and Download are primary affordances. The gallery framing/copy stays.

### Q6 — Mobile compose? `[2026-05-03]`
- Tap the canvas — discoverable via caption swap.
- Compose button moves out of the drawer onto the stage on mobile.
- **Both** *(picked)*. Tap-to-compose + visible Compose button under the frame on mobile. Belt-and-suspenders; ~10 lines.

### Q7 — What goes in the URL? `[2026-05-03]`
- Seed only.
- **Seed + palette** *(picked)*. `?seed=0DCBA3F4&palette=nocturne`. Palette is part of the piece's identity (colour *is* the painting); a friend opening the link sees the same painting in the same key. Sliders + animation mode are *curator's choices that day*, not part of the piece — they reset on refresh. Compose updates URL via `history.pushState`; palette change updates URL via `history.replaceState` (palette flip is not a separate composition). Cascade auto-replaces.
- Full state — rejected (verbose URL, animation mode is a viewing preference not a piece attribute).

### Q8 — Palette scope? `[2026-05-03]`
- **All 5: Classique, Muted, Nocturne, Garden, Custom** *(picked)*. Maximum variety, matches the design exactly.
- 3 / 2 — rejected (sharper but loses the curator's-selection feel the user values).

### Q9 — Editorial voice in the stage header? `[2026-05-03]`
- Keep the design's static "Untitled, in primary colors".
- Strip to minimal mono.
- **Dynamic title from seed** *(picked)*. Refined in Q10.

### Q10 — How is the dynamic title generated? `[2026-05-03]`
- From dominant colors only (procedural, always grounded).
- From a curated word list (delightful, but disconnected).
- **Hybrid: curated adjectives + actual color** *(picked)*. Format: `"A {adjective} {noun} in {colorName}"` where:
  - `{adjective}` is seed-keyed from the approved list: *quiet, restless, bright, hushed, slow, sudden, careful, generous, brief, patient*.
  - `{noun}` is seed-keyed from the approved list: *study, song, gesture, conversation, breath, argument*.
  - `{colorName}` is the human name of the largest non-neutral fill in the current composition (e.g. *cobalt*, *vermillion*, *saffron*) — pulled from the palette's `fills[i].name`.
  - Title regenerates whenever the seed OR the palette changes (palette change flips colour names).
  - Lists live in `titles.ts` so they're easy to extend later.

### Q11 — Brandmark? `[2026-05-03]`
- Keep "Atelier · Est. 1917".
- Drop entirely.
- **Personalise: "Borso's Atelier · Est. 1999"** *(picked)*. Same typography as the design, just different content.

### Q12 — Series ambition / shell extraction? `[2026-05-03]`
- One-off — the Atelier shell is decoration only.
- Pre-split into `/art/_shared/` now.
- **Leave room, don't pre-split** *(picked)*. Keep all code under `apps/borso-fr/site/art/mondrian/` for now. When (if) a second piece arrives, refactor the rail/stage/brandmark into a shared shell. Matches YAGNI; we accept one refactor cost later in exchange for not over-abstracting now. Naming convention noted: `/art/<artist>/` URL pattern is reserved.

### Q13 — Default animation mode? `[2026-05-03]`
- **Drift** *(picked)* — design default; tool+piece middle ground.
- Cascade — rejected (fights the controls; too aggressive on arrival).
- Still — rejected (kills the "alive on arrival" effect).

### Q14 — Compose history? `[2026-05-03]`
- No back-stack.
- **Back-stack via browser history** *(picked)*. Compose calls `history.pushState({ seed }, '', '?seed=…')`. Browser Back returns to previous seeds. Free affordance once seed-in-URL is in. Cascade uses `replaceState` so it doesn't pollute history.
- Explicit Previous button — rejected (unnecessary UI when Back works).

### Q15 — Two load-bearing implementation details from the design's round-4 debug. `[2026-05-03]`
The Claude Design transcript (`mondrian-generator/chats/chat1.md`, rounds 3–4) recorded two bugs the user already paid to find — preserve the fix in the port, don't re-introduce them:

1. **Layout vs. coloring must be memoised separately.** `generateLayout({ seed, complexity })` returns rectangles; `colorize(layout, { seed, palette, balance })` assigns fills. If they're collapsed, changing palette/balance reshuffles the composition (and replays inkbloom). Two `useMemo`s, two dep lists.
2. **The `inkbloom` entry keyframe must not touch `transform`.** The runtime animation modes (Drift / Breathe) drive `style.transform` directly; if the keyframe also animates transform with `animation-fill-mode: both`, the keyframe's final transform pins forever and the live animation looks dead. Keyframe stays on `opacity` + `filter: blur(...)` only.

### Q16 — Fonts? `[2026-05-03]`
- The design loads Playfair Display, Cormorant Garamond, JetBrains Mono from Google Fonts. **Self-host via `@fontsource/*` NPM packages** *(picked, see also Q17)* — Vite bundles the woff2 directly; no third-party request. Trades ~150 KB of bundle for clean RGPD posture and a faster first paint (no extra round-trip to fonts.googleapis.com).

### Q17 — RGPD / EU privacy posture? `[2026-05-03]`
- Personal site on a `.fr` domain → RGPD applies even without a business stakeholder. **Self-host all fonts** *(picked, see Q16)*. **No analytics, no tracking, no third-party requests at all** after the migration. The page is a purely static document. No consent banner needed because there's nothing to consent to.

### Q18 — Other RGPD considerations? `[2026-05-03]`
- No cookies set by the page (no auth, no preferences-server, no analytics).
- The seed-in-URL feature does not collect anything — it's local state mirrored into the URL, not a server request.
- `?seed=…` URLs the user shares are public by definition (they typed them); no sensitive data possible in an 8-hex seed.
- No imprint / mentions légales required for a non-commercial personal site (LCEN art. 6 III.2: pseudonymous publication permitted for non-professionals provided the host can identify them; AWS keeps the user's billing identity).

### Q19 — `prefers-reduced-motion`? `[2026-05-03]`
- Ignore the OS setting and ship the design as-is.
- **Honour it** *(picked)*. When `(prefers-reduced-motion: reduce)` matches:
  - Default animation mode flips from Drift → **Still** on first visit. User can still pick any mode from the segmented control afterward.
  - The `inkbloom` entry keyframe drops the `filter: blur(6px)` step; rects fade in via opacity only, with no per-rect stagger (all rects fade at once, ~150 ms).
  - Cascade is *not* disabled if the user explicitly selects it (their choice overrides the OS preference).

### Q20 — `prefers-color-scheme: dark`? `[2026-05-03]`
- Auto-pick Nocturne when the OS prefers dark.
- **Always Classique on first visit** *(picked)*. Cleaner mental model; the dark palette is one click away. Avoids the "why is the page dark?" / "I can't find the light version" failure modes.

### Q21 — Accessibility baseline? `[2026-05-03]`
**Picked: ship a baseline polish pass on top of the design.** Concretely:
- Visible focus rings (1 px solid `var(--ink)` + 2 px offset) on all interactive elements: rail buttons, sliders, segments, swatches, frame, mobile-Compose button.
- The framed canvas is rendered as a `<button type="button">` with `aria-label="Composition. Click to recompose."` so keyboard and screen-reader users can recompose without the keyboard shortcut. Tap-to-compose (Q6) flows through the same handler.
- An `aria-live="polite"` region announces the dynamic title on every recompose ("A quiet study in cobalt").
- Fonts use `font-display: swap` (FOUT, not FOIT) so the page renders with system fonts before the woff2 lands.
- Color contrast: spot-checked Classique and Nocturne — the design's `--ink-soft` at 0.7 opacity over `--paper` measures ≥ 4.5:1. Muted's body copy is the only borderline; left as the design specifies it (designer's call).
- Keyboard: tab order is brandmark → sliders → palette segments → custom swatches → animation segments → Compose → Download → frame.

## Changes

### Types / domain model

- `Palette { key, label, bg, line, fills: { name, hex }[] }` — preset or computed-from-tweaks.
- `Rect { x, y, w, h, depth, id, fill, fillName }` — normalised 0..1 coordinates, IDs stable across recolors.
- `Tweaks { paletteKey, complexity, lineWeight, balance, animationMode, customColor1..3, customPaper, customInk }` — flat React state; no longer a host-persisted blob.
- `Title { adjective, noun, colorName }` — derived from seed + dominant fill via `buildTitle(seed, layout, palette)`.
- URL schema: `/art/mondrian/?seed=<8-hex>&palette=<key>`; missing seed → fresh seed; missing/invalid palette → Classique; invalid seed → fresh seed (don't throw).

### Database changes

None. Site is fully client-side / static.

### Files to change

**NEW**
- `apps/borso-fr/vite.config.ts` — multi-page entries: `index`, `family/mom`, `family/les-filles`, `art/mondrian`. Build root `site/`, outDir `../dist`.
- `apps/borso-fr/tsconfig.json` — replaced. JSX `react-jsx`, lib DOM, includes `site/**/*.{ts,tsx}` and `vite.config.ts`.
- `apps/borso-fr/tsconfig.cdk.json` — kept the prior CDK-only config (NodeNext, includes `bin`).
- `apps/borso-fr/site/art/mondrian/main.tsx` — React entry: imports `App.tsx`, calls `createRoot`.
- `apps/borso-fr/site/art/mondrian/App.tsx` — the React tree from the design (palettes, RNG, generator, components) minus TweaksPanel; plus the seed-in-URL hook and tap-the-canvas handler.
- `apps/borso-fr/site/art/mondrian/styles.css` — the design's `<style>` block extracted (paper, rail, slider, segments, swatches, frame, responsive).
- `apps/borso-fr/site/art/mondrian/titles.ts` — adjective/noun lists for `buildTitle`.

**UPDATE**
- `apps/borso-fr/site/art/mondrian/index.html` — replace contents with the design's `<head>` (fonts, meta) + `<body><div id="root"></div><script type="module" src="./main.tsx"></script></body>`.
- `apps/borso-fr/package.json` — add `vite`, `@vitejs/plugin-react`, `react`, `react-dom`, `@types/react`, `@types/react-dom`. Replace `dev` (`vite`) and `build` (`vite build`); typecheck runs `tsc -p tsconfig.cdk.json --noEmit && tsc --noEmit`.

**DELETE**
- `apps/borso-fr/site/art/mondrian/canvas.js`
- `apps/borso-fr/site/art/mondrian/color-grid.js`
- `apps/borso-fr/site/art/mondrian/colors.js`
- `apps/borso-fr/site/art/mondrian/subdivision.js`
- `apps/borso-fr/site/art/mondrian/script.js`
- `apps/borso-fr/site/art/mondrian/style.css`
- `apps/borso-fr/site/art/mondrian/painting.js`

**Other apps:** untouched. The Vite config only governs `apps/borso-fr`.

### Test strategy

Static gates:
- `pnpm --filter @borso-app/borso-fr run typecheck` (TS strict on App.tsx, RNG / layout / colorize modules).
- `pnpm --filter @borso-app/borso-fr run build` — Vite build must succeed; family pages and index must remain in `dist/`.
- `pnpm exec biome lint apps/borso-fr` — Biome rules from root config (incl. `no-type-assertion-except-unknown`, `noExcessiveLinesPerFile`).
- `pnpm exec knip` — pre-push hook; new TSX entries must be declared in `knip.json`.

Local visual QA (Playwright, headed-script-as-screenshot):
1. `pnpm --filter @borso-app/borso-fr dev` (background process).
2. One-shot `npx playwright@1` script under `apps/borso-fr/scripts/screenshot.mjs` that opens Chromium at three viewports (1280×800 desktop, 720×1024 tablet, 380×800 narrow phone), navigates to `http://localhost:5173/art/mondrian/`, waits for the inkbloom entry to settle (~600 ms), and saves PNGs to `apps/borso-fr/.screenshots/{breakpoint}.png`.
3. `.screenshots/` is gitignored.
4. The user inspects the screenshots to validate the design match before approving.

Manual interaction sweep (single pass, on the local dev server, after the screenshots):
- Each animation mode visibly differs (Still / Drift / Breathe / Cascade).
- Space and clicking the canvas both recompose; URL `?seed=` updates (push), back-button returns to previous seed.
- Refresh on `?seed=X&palette=nocturne` → same composition, same palette.
- `?seed=garbage` → fresh composition, no console error.
- Download produces `mondrian-<seed>.png` at 2000×2000.
- Custom palette swatches open the OS colour picker; live recolour.
- Dynamic title changes on Compose and on palette change.

No automated visual regression (single-developer site, not worth the maintenance).

## Production strategy

- **Analytics:** none. Personal site, no telemetry today; this spec doesn't introduce any.
- **Zero-defect strategy:** the StaticSite CDK construct already serves `dist/` via CloudFront. The only new failure surface is the Vite build itself — a build failure breaks deploy CI before traffic ever sees it. No runtime alerting needed. Family pages (`mom.html`, `les-filles.html`) are pulled into the Vite multi-page graph but contain only inline `<style>` and reference local PNGs; verify they still render after build.
- **Manual smoke after deploy:** `https://borso.fr/art/mondrian/` loads, type renders (Playfair+Cormorant+JBM), palette switching re-themes, space recomposes, `?seed=` URLs are stable. Spot-check `https://borso.fr/`, `https://borso.fr/family/mom.html`, `https://borso.fr/family/les-filles.html` — none should regress from the Vite migration.
