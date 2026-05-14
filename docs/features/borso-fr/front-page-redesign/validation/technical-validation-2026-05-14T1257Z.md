# Technical validation — Redesign de la front page borso.fr — galaxie WebGL + Major Mono Display

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- ADR: [`docs/adr/0002-vendor-react-bits-galaxy-shader.md`](../../../../adr/0002-vendor-react-bits-galaxy-shader.md)
- Branch: `claude/tech-lead-orchestrator-skill-dVKSm`
- Base: `origin/main`
- Run at: 2026-05-14T12:57Z
- Touched workspaces: `@borso-app/borso-fr` (uncommitted working-tree changes — see Note 0)

## Note 0 — Diff source

The committed diff against `origin/main` on this branch contains the
`tech-lead-orchestrator` skill work only and **does not** touch
`apps/borso-fr/site/`. The implementation for *front-page-redesign* lives
as **uncommitted working-tree changes** (5 modified + 3 untracked files,
per `git status`). Per the orchestrator brief, this report validates the
working tree as if it were the diff, not the committed history. If the
committed branch is what merges, this validation does **not** apply —
the working-tree changes must be committed first. Validated surface:

```
~ apps/borso-fr/site/index.html
~ apps/borso-fr/site/script.js
~ apps/borso-fr/site/style.css
+ apps/borso-fr/site/shader-bg.js
~ knip.json
+ docs/adr/0002-vendor-react-bits-galaxy-shader.md
+ docs/features/borso-fr/front-page-redesign/
```

73 UI behavioural assertions routed to `/visual-validation`; out of
scope for this report (galaxy renders, font computed value, burger
toggles, Escape close, viewport < 640 px menu, reduced-motion emulation,
WebGL-disabled fallback). Category D below covers only the
non-DOM/non-runtime claims the spec makes.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Q.O.D. "État par défaut burger" → fermé | `<body>` has no `menu-open` at load; `<nav>` has `aria-hidden="true"`; `<button>` has `aria-expanded="false"` | `apps/borso-fr/site/index.html:17,27,38` + `script.js:13` | `<body>` open tag, `let menuOpen = false;`, `aria-hidden="true"` on `<nav>`, `aria-expanded="false"` on burger | PASS |
| A02 | Q.O.D. "prefers-reduced-motion" → respecter | CSS `@media (prefers-reduced-motion: reduce)` disables animation + JS short-circuits rAF after first sync `drawArrays` | `style.css:188-202`, `shader-bg.js:259-268`, `script.js:45-51` | `@media (prefers-reduced-motion: reduce) { body.animate-in .welcome, body.animate-in .title { animation: none; opacity: 1; } … }` + `if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }` after sync `drawArrays` + `if (… && !prefersReducedMotion) document.body.classList.add(ANIMATE_IN_CLASS);` | PASS |
| A03 | Q.O.D. "Mobile shader" → identique | No viewport branching in shader, DPR cap kept at 2 | `shader-bg.js:153,238` | `const DPR_CAP = 2;` and `const pixelRatio = Math.min(window.devicePixelRatio || 1, DPR_CAP);` | PASS |
| A04 | Q.O.D. "Police du titre" → Major Mono Display | Google Fonts loaded; `.title` uses `--font-display` | `index.html:10-13`, `style.css:6,69-70` | `family=Major+Mono+Display&family=Space+Mono` link; `--font-display: 'Major Mono Display', ui-monospace, monospace;` then `.title { font-family: var(--font-display); }` | PASS |
| A05 | Q.O.D. "Fallback WebGL" → rien (body bg) | `init()` early-returns on missing `gl`, body bg `#05070d` stays visible | `shader-bg.js:176-181`, `style.css:1-2,13-14` | `if (!gl) { console.warn('WebGL unavailable'); return; }` + `:root { --bg: #05070d; } html, body { background: var(--bg); }` | PASS |
| A06 | Q.O.D. "Source du shader" → vendor + MIT header (ADR 0002 load-bearing) | MIT attribution block at top of shader-bg.js | `shader-bg.js:1-12` | `// Galaxy background — vanilla WebGL fragment shader.` then `// SPDX-License-Identifier: MIT`, `// Source:   https://github.com/DavidHDev/react-bits`, `// Copyright (c) 2024 David Haz`, `// Do not strip this header` | PASS |
| A07 | Q.O.D. "Tweaks panel" → supprimé | No `BgController` export anywhere | grep | `grep -rn BgController apps/borso-fr/site/` → **0 hits** | PASS |
| A08 | Q.O.D. "Tracking analytics" → aucun | No plausible, gtag, GA, or analytics snippet in HTML | `grep` on `index.html` | `grep -n 'plausible\|gtag\|analytics' apps/borso-fr/site/index.html` → 0 hits | PASS |
| A09 | Q.O.D. "Build pipeline" — spec says "garder `cp -R site dist`" | Implementation uses Vite | `apps/borso-fr/package.json:8` shows `"build": "vite build"`; implementation report explicitly notes spec/realit drift | The drift is documented in the implementation report ("DÉRIVE SPEC/RÉALITÉ"). The app was already on Vite before this PR (pre-existing for `art/mondrian` React subroute). Vanilla JS files are consumed unchanged by Vite (it bundles them, but they are vanilla JS source). No new dependency was added. Functional outcome equivalent. | PASS_EXCEPT_UNVERIFIABLE |
| A10 | Q.O.D. "Test runner" → skipper (no `*.utils.ts`) | No new util module under `apps/borso-fr/site/` outside `art/mondrian/` | `find apps/borso-fr/site -maxdepth 1 -type f` → 4 files: `index.html`, `style.css`, `script.js`, `shader-bg.js` — no `.utils.ts` | PASS |
| A11 | Files to change — index.html UPDATE | 5 nav links present, correct hrefs, `lang="fr"`, scripts at end | `index.html:2,38-46,48-49` | `<html lang="fr">`, `<a href="family/mom.html">Maman</a>`, `<a href="family/les-filles.html">Les sœurs</a>`, `<a href="art/mondrian/">Art</a>`, `mailto:hugo.borsoni@gmail.com…Demande de date</a>`, `…dQw4w9WgXcQ">Les 12 travaux de Borso</a>`, `<script type="module" src="./shader-bg.js">` then `./script.js` | PASS |
| A12 | Files to change — style.css full rewrite | CSS variables, `.stage`, `.welcome`, `.title`, `.burger`, `.menu`, staggered transition, `body.menu-open` dim+scale, < 640 px media, reduced-motion media | `style.css:1-8,46-90,92-117,118-186,188-202` | `--bg`, `--fg`, `--font-display`; `body.menu-open .stage { opacity: 0.32; transform: scale(0.94); }`; `@media (max-width: 640px) { .menu { backdrop-filter: blur(12px); } }`; `@media (prefers-reduced-motion: reduce)` block | PASS |
| A13 | Files to change — script.js port vanilla | Vanilla JS, no React, named constants, burger toggle, Escape close, `body.menu-open`, staggered `transitionDelay`, `animate-in` on `pageshow` visible | `script.js:1-7,15-28,30-33,35-40,42-51` | Constants at top; `applyMenuState()` toggles classes + aria + transition-delay; Escape branch; `pageshow` adds `animate-in` only if visible AND not reduced-motion | PASS |
| A14 | Files to change — shader-bg.js NEW | File exists, vanilla WebGL (no React, no OGL), no npm dep added, MIT header, `init()` respects reduced-motion | `shader-bg.js:1-305`, `package.json` | File is 305 lines vanilla WebGL; no `import` of npm packages; package.json deps unchanged for shader (no `ogl`); MIT header at lines 1-12; reduced-motion early-return at lines 264-268 | PASS |
| A15 | Vendored locals renamed (plan code-quality row) | `cw`/`ch`/`U` renamed to `pixelWidth`/`pixelHeight`/`uniforms` | `shader-bg.js:210,238-249` | `const uniforms = {};`, `const pixelWidth = …; const pixelHeight = …;` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals (outside `for (let i = 0; …)`) | Read of `script.js` + `shader-bg.js` JS harness | `applyMenuState`, `menuItems`, `prefersReducedMotion`, `pointerTarget`, `pointerSmooth`, `vertexBuffer`, `pixelRatio`, `compileShader` are all descriptive. GLSL helpers `Hash21`, `tri`, `Star`, `StarLayer` are upstream verbatim (load-bearing per ADR 0002). | PASS |
| B02 | Magic numbers / strings extracted to named constants | grep on `script.js` and `shader-bg.js` | `script.js`: `STAGGER_BASE_MS = 80`, `STAGGER_STEP_MS = 60`, `MENU_OPEN_CLASS`, `BURGER_OPEN_CLASS`, `ANIMATE_IN_CLASS`, `LABEL_OPEN_MENU`, `LABEL_CLOSE_MENU`. `shader-bg.js`: `PARAMS` block (frozen shader settings), `DPR_CAP = 2`, `MOUSE_LERP = 0.05`. | PASS |
| B03 | Comments document the WHY only | Read | `script.js:42-44` comments WHY pageshow gate (hidden tabs would freeze title at 0). `shader-bg.js:1-12` MIT attribution (load-bearing per ADR 0002), `:257-258` WHY synchronous first draw, `:264-265` WHY reduced-motion early return. No WHAT-comments. | PASS |
| B04 | Function names describe the result | Read | `applyMenuState` (vs `toggle`), `compileShader`, `pushUniforms`, `resize`, `frame` — all describe outcome. | PASS |
| B05 | Type assertions limited to `as const`/`as unknown` | N/A — no TS in changed files | Vanilla JS only. | PASS |
| B06 | No `any` | `grep -nP '\bany\b' apps/borso-fr/site/script.js apps/borso-fr/site/shader-bg.js` | 0 hits | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | N/A — no TS | Vanilla JS. | PASS |
| B08 | Biome lint clean on changed files | `pnpm exec biome lint apps/borso-fr/site/{index.html,style.css,script.js,shader-bg.js}` | `Checked 4 files in 2s. No fixes applied.` exit 0. One `// biome-ignore lint/correctness/useHookAtTopLevel` on `gl.useProgram(program)` — justified inline (WebGL API name collision with React hook regex). | PASS |
| B09 | No `useEffect` (smell) | `grep -nE '\buseEffect\(' apps/borso-fr/site/*.js` | 0 hits (vanilla JS — no React in scope) | PASS |
| B10 | No React/JSX/Babel in vanilla port | `grep -in 'react\|babel\|jsx' apps/borso-fr/site/script.js apps/borso-fr/site/shader-bg.js` | Only 3 hits, all in the MIT attribution comment header of `shader-bg.js` referencing "react-bits" upstream — load-bearing per ADR 0002. `script.js` is clean. | PASS |
| B11 | No removed selectors lingering | `grep -rn 'gradient-canvas\|BgController\|nav-icon\|nav-menu' apps/borso-fr/site/` | 0 hits | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | `@borso/infra` build (prerequisite for borso-fr typecheck) | `pnpm --filter @borso/infra run build` | 0 | PASS |
| C02 | `@borso-app/borso-fr` typecheck | `pnpm --filter @borso-app/borso-fr typecheck` | 0 | PASS |
| C03 | `@borso-app/borso-fr` build | `pnpm --filter @borso-app/borso-fr build` | 0 — `vite build` produced `dist/index.html` + Vite-bundled assets. `family/mom.html` and `family/les-filles.html` also emitted. | PASS |
| C04 | `@borso-app/borso-fr` tests | `pnpm --filter @borso-app/borso-fr test` | 0 — 5 test files, 73 tests passing (`url-state`, `titles`, `painting`, `palettes`, `keyboard` utils — all from `art/mondrian/`, untouched by this PR) | PASS |
| C05 | Repo lint | `pnpm exec biome lint apps/borso-fr/site/*` | 0 | PASS |
| C06 | Repo knip (dead exports / files) | `pnpm exec knip` | 0 (clean — `knip.json` had `"ignore": ["docs/**"]` added so that `spec/design-*.js{x}` reference files don't trigger false positives) | PASS |
| C07 | `*.utils.ts` coverage | `find apps/borso-fr/site/ -name '*.utils.ts'` → 5 files all under `art/mondrian/`, each with a sibling `.utils.test.ts`. No `.utils.ts` introduced by this PR. | Per spec Q.O.D. "Test runner" the front-page-redesign work introduces zero `.utils.ts` (DOM glue + WebGL setup are side-effect-only, not pure). The gate continues to hold on the unrelated `art/mondrian/` utils. | PASS |

## D. Test coverage of spec

Per the spec's *Test strategy* section, **all** behavioural assertions
for this feature are routed to `/visual-validation` (HP1–HP5, mobile,
reduced-motion, WebGL-disabled, broken-image scan). `/technical-validation`
is explicitly scoped to: no React/Babel/JSX in the vanilla port, no
forbidden type-assertion patterns, MIT attribution present, no
duplication between `script.js` and `shader-bg.js`, scripts loaded in
correct order. Those are covered in categories A and B above.

The spec further states **"Pas de `*.utils.ts` ⇒ pas de gate coverage"** —
no behavioural unit-test assertion is routed to this validator.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | HP1–HP5 happy path (title visible, font loaded, burger toggle, Escape, link nav) | Routed to `/visual-validation` per spec | Out of scope for this report |
| D02 | Edge: `prefers-reduced-motion` honored | Routed to `/visual-validation` (emulated reduced-motion); structural double-coverage (CSS + JS) verified in A02 | Out of scope for runtime; structurally PASS via A02 |
| D03 | Edge: WebGL disabled fallback | Routed to `/visual-validation`; structural early-return verified in A05 | Out of scope for runtime; structurally PASS via A05 |
| D04 | Edge: tab hidden at load — title not stuck at `opacity:0` | Routed to `/visual-validation`; structural `pageshow`+`visibilityState` gate verified in A02 / `script.js:47-51` | Out of scope for runtime; structurally PASS |
| D05 | Edge: ResizeObserver absent — fallback to window resize | Routed to vendored code; structural verification | `shader-bg.js:251-254` — `window.addEventListener('resize', resize); if (window.ResizeObserver) { new ResizeObserver(resize).observe(wrap); }` — PASS |

## Notes

- A09 (PASS_EXCEPT_UNVERIFIABLE) — Spec Q.O.D. "Build pipeline" says
  "garder `cp -R site dist`", but the workspace already used Vite
  before this PR (because `apps/borso-fr/site/art/mondrian/` is a React
  app). The implementer did not switch back. Effectively, `script.js`
  and `shader-bg.js` are still vanilla source files (no React, no JSX),
  Vite simply bundles them — the spirit of the Q.O.D. (no React in the
  apex landing source) is preserved, but the letter (vanilla `cp -R`
  build) is violated. The implementation report documents this drift
  explicitly. Operator must decide whether to (a) accept the drift and
  update the spec, or (b) revert Vite for the apex page. **Surface the
  drift in the PR description.**
- Note 0 — The diff against `origin/main` on the current branch contains
  meta-skills work only. The front-page-redesign code lives as
  uncommitted working-tree changes. This validation applies to the
  working tree, not to the committed branch. **Working-tree changes
  must be committed before merge.**
- Implementation report mentions a `// biome-ignore` on
  `gl.useProgram(program)` (B08) — verified in place, justified inline,
  and the lint passes clean. The `useHookAtTopLevel` rule is a known
  source of false positives on identifiers starting with `use*` outside
  React; the biome-ignore is the correct mitigation here.

## Verdict: PASS_EXCEPT_UNVERIFIABLE

All correctness, code-cleanliness, and tooling gates pass. One
UNVERIFIABLE row (A09 — Vite build pipeline drift vs spec) requires
operator disclosure in the PR description. One operational caveat
(Note 0 — working-tree-only implementation) requires committing the
working tree before merge; otherwise this report does not apply to the
merged code.
