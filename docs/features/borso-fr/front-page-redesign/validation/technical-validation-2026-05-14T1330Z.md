# Verdict: PASS

# Technical validation (run #2 — ADR 0003 pivot) — front-page-redesign

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md) (Revision 2 — 2026-05-14)
- ADR (accepted): [`../../../../adr/0003-react-bits-galaxy-as-react-component.md`](../../../../adr/0003-react-bits-galaxy-as-react-component.md)
- ADR (superseded): [`../../../../adr/0002-vendor-react-bits-galaxy-shader.md`](../../../../adr/0002-vendor-react-bits-galaxy-shader.md)
- Dantotsu: [`../../../../dantotsus/believed-the-bundle-readme-not-the-live-package-json.md`](../../../../dantotsus/believed-the-bundle-readme-not-the-live-package-json.md)
- Branch: `claude/tech-lead-orchestrator-skill-dVKSm`
- Base: `origin/main`
- Pivot commit: `8a155d1` (2026-05-14T13:41:46Z)
- Run at: 2026-05-14T13:30:00Z
- Touched workspaces: `apps/borso-fr` (`@borso-app/borso-fr`)

Routing note: behavioural UI assertions (HP1–HP5, burger toggle, Escape, mobile menu, reduced-motion render, WebGL-disabled fallback, broken-image scan) are routed to `/visual-validation` per the spec's Test strategy. This report covers code-quality, build, lint, typecheck, and structural conformance to the revised spec/plan + ADR 0003.

## A. Correctness vs spec / plan / ADR 0003

| # | Spec / ADR ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | ADR 0002 supersession | `Status: superseded`, `Superseded by: 0003` | `docs/adr/0002-vendor-react-bits-galaxy-shader.md:3-5` | `**Status:** superseded` / `**Date:** 2026-05-14` / `**Superseded by:** [0003](./0003-react-bits-galaxy-as-react-component.md)` | PASS |
| A02 | ADR 0002 forward-link to dantotsu | False-premise disclosure in the ADR head | `docs/adr/0002-vendor-react-bits-galaxy-shader.md:7` | `> The decision below shipped briefly. It was made on a false premise … See `docs/dantotsus/believed-the-bundle-readme-not-the-live-package-json.md`. ADR 0003 records the corrected decision.` | PASS |
| A03 | ADR index up to date | `docs/adr/README.md` lists 0002 superseded + 0003 accepted | `docs/adr/README.md:11-12` | `| [0002](./0002-vendor-react-bits-galaxy-shader.md) | Vendor … | superseded by [0003](./0003-react-bits-galaxy-as-react-component.md) | 2026-05-14 |` / `| [0003](./0003-react-bits-galaxy-as-react-component.md) | … | accepted | 2026-05-14 |` | PASS |
| A04 | ADR 0003 "Load-bearing" — MIT attribution preserved at top of `Galaxy.tsx` | License-compliance surface | `apps/borso-fr/site/components/Galaxy.tsx:1-10` | `// Galaxy — react-bits Galaxy component, ported as TSX for borso.fr.` / `//   SPDX-License-Identifier: MIT` / `//   Source:    https://github.com/DavidHDev/react-bits` / `//   Copyright (c) 2024 David Haz` / `// Do not strip this header — it is the license compliance surface for the` / `// react-bits component (see docs/adr/0003-react-bits-galaxy-as-react-component.md).` | PASS |
| A05 | Plan Rev2 self-check "ls apps/borso-fr/site/shader-bg.js returns No such file or directory" | `shader-bg.js` deleted, no orphan import | `apps/borso-fr/site/` — `test -f` returns absent; `grep -rn shader-bg apps/borso-fr` → no hits | absent (verified by Bash test + recursive grep, all remaining references are in `docs/features/.../spec/` design-* fixtures and the spec/plan history sections) | PASS |
| A06 | Plan Rev2 self-check `grep -c "from 'ogl'" Galaxy.tsx ≥ 1` | `ogl` is imported | `apps/borso-fr/site/components/Galaxy.tsx:12` | `import { Color, Mesh, Program, Renderer, Triangle } from 'ogl';` | PASS |
| A07 | `pnpm add ogl` landed in `apps/borso-fr/package.json` | `ogl` in dependencies | `apps/borso-fr/package.json:25` | `"ogl": "1.0.11",` | PASS |
| A08 | `pnpm-lock.yaml` consistent with the new dep | Lockfile updated | `pnpm-lock.yaml:41` (importer block) + `:3401, :7681` (`ogl@1.0.11` package + resolved entry) | `ogl@1.0.11: {}` resolved entry present; importer block lists `ogl`. `pnpm install` would no-op (lockfile already consistent). | PASS |
| A09 | Spec Q.O.D. "prefers-reduced-motion (corrigé impl)" — `<Galaxy disableAnimation={prefersReducedMotion} />`, matchMedia evaluated once at mount | Plumbed as a single prop | `apps/borso-fr/site/galaxy.tsx:25-30` | `const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;` / `createRoot(mountElement).render(<StrictMode><Galaxy {...GALAXY_PARAMS} disableAnimation={prefersReducedMotion} /></StrictMode>);` | PASS |
| A10 | `galaxy.tsx` is the tiny entry: `createRoot` + `StrictMode` + `<Galaxy />` + frozen PARAMS `as const` | Mount entry matches spec/plan/ADR 0003 | `apps/borso-fr/site/galaxy.tsx:1-31` | `import { StrictMode } from 'react';` / `import { createRoot } from 'react-dom/client';` / `const GALAXY_PARAMS = { starSpeed: 0.3, density: 2.2, hueShift: 205, … } as const;` / `createRoot(mountElement).render(<StrictMode><Galaxy {...GALAXY_PARAMS} disableAnimation={prefersReducedMotion} /></StrictMode>);` | PASS |
| A11 | `index.html` loads `./galaxy.tsx` (not `./shader-bg.js`) | Script entry pivot | `apps/borso-fr/site/index.html:48-49` | `<script type="module" src="./galaxy.tsx"></script>` / `<script type="module" src="./script.js"></script>` | PASS |
| A12 | `index.html` content unchanged: burger SVG (2 line-pair icons) + 5 menu links + meta + fonts + `lang="fr"` | Content preserved | `apps/borso-fr/site/index.html:2, 27-46` | `<html lang="fr">` / `<button id="burger" class="burger" …>` with `burger-icon--lines` (2 `<line>`) and `burger-icon--cross` (2 `<line>`) / `<li><a href="family/mom.html">Maman</a></li>` … `Les sœurs` … `Art` … `Demande de date` … `Les 12 travaux de Borso` (5 links) | PASS |
| A13 | `style.css` unchanged from the prior PASS visual validation (mobile-menu `left: 0` still in place from commit 7dacc07) | Pivot did not touch style.css | `git log main..HEAD -- apps/borso-fr/site/style.css` → only `7dacc07` (mobile fix) + `67914c7` (initial); commit `8a155d1` does not touch `style.css`. `apps/borso-fr/site/style.css:173-187` | `@media (max-width: 640px) {` / `.menu { left: 0; padding: 0 24px; align-items: center; justify-content: center; …` | PASS |
| A14 | `script.js` unchanged from prior implementation (burger DOM glue, named-constant stagger, `pageshow` animate-in gating) | Pivot did not touch script.js | `git log main..HEAD -- apps/borso-fr/site/script.js` → only `67914c7` (initial). `apps/borso-fr/site/script.js:1-52` | `const STAGGER_BASE_MS = 80;` / `const STAGGER_STEP_MS = 60;` / `const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;` / `window.addEventListener('pageshow', () => { if (document.visibilityState !== 'hidden' && !prefersReducedMotion) document.body.classList.add(ANIMATE_IN_CLASS); });` | PASS |
| A15 | ADR 0003: `apps/borso-fr/site/components/Galaxy.css` present (positioning the container) | Component CSS file shipped | `apps/borso-fr/site/components/Galaxy.css:1-13` | `.galaxy-container { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }` | PASS |
| A16 | ADR 0003: `prefers-reduced-motion` changes mid-session do NOT re-subscribe — by design, matchMedia evaluated once | No `addEventListener` on the media query | `apps/borso-fr/site/galaxy.tsx:25` (single matchMedia read, no `.addEventListener`) | `const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;` (no subscription) | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals (CLAUDE.md "Clean code") | Manual scan of `Galaxy.tsx` (harness), `galaxy.tsx` (entry), `script.js` (unchanged). GLSL identifiers (`p`, `c`, `K`, `m`, `gv`, `id`, etc.) are upstream verbatim and out of scope per the brief. | Harness uses descriptive names: `containerRef`, `targetMousePosition`, `smoothMousePosition`, `targetMouseActive`, `smoothMouseActive`, `animateId`, `handleMouseMove`, `handleMouseLeave`. Entry: `GALAXY_PARAMS`, `mountElement`, `prefersReducedMotion`. | PASS |
| B02 | Magic numbers extracted to named constants | `MOUSE_LERP_FACTOR = 0.05` named (Galaxy.tsx:203). `GALAXY_PARAMS` frozen `as const` block (galaxy.tsx:8-20). `STAGGER_BASE_MS`, `STAGGER_STEP_MS`, `MENU_OPEN_CLASS`, `BURGER_OPEN_CLASS`, `ANIMATE_IN_CLASS`, `LABEL_OPEN_MENU`, `LABEL_CLOSE_MENU` (script.js:1-7). | All non-GLSL magic values are named. GLSL literals (`0.05`, `1000.0`, `345.32`, etc.) are upstream verbatim and explicitly waived in the brief. | PASS |
| B03 | Comments document WHY only | `Galaxy.tsx:1-10` MIT header (license-compliance, load-bearing — required). `galaxy.tsx:5-7` explains why PARAMS are frozen (Tweaks panel out of scope, cites spec). `script.js:42-44` explains why `animate-in` is gated on `pageshow` + non-hidden (the non-obvious "title bloqué à opacity:0" risk). | No what-comments observed. JSDoc absent — fine, these are internals. | PASS |
| B04 | Function names describe result, not mechanism | `applyMenuState()` (script.js:15), `handleMouseMove`/`handleMouseLeave` (Galaxy.tsx:315/323), `resize()` (Galaxy.tsx:277), `update(timestamp)` (Galaxy.tsx:291). Entry has no functions — straight-line code. | All describe the outcome (apply state, handle mouse, resize, update frame). | PASS |
| B05 | Type assertions limited to `as const` / `as unknown` (Biome plugin `no-type-assertion-except-unknown`) | `grep -nE '\bas [A-Z][A-Za-z]+\b\|as unknown as' Galaxy.tsx galaxy.tsx` → only match is `// Galaxy — react-bits Galaxy component, ported as TSX for borso.fr.` (comment, not code). Single legitimate `as const` at `galaxy.tsx:20`. | `} as const;` (galaxy.tsx:20) — literal narrowing of the frozen PARAMS, allowed. | PASS |
| B06 | No `any` (`noExplicitAny`) | `grep -nP '\bany\b' Galaxy.tsx galaxy.tsx` → 0 hits. | clean | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | Compiler flag on in both `tsconfig.json` and `tsconfig.cdk.json` (`:7`). `tsc --noEmit` passes (exit 0). Mutable indexed assignments in `Galaxy.tsx:306-307` write to `program.uniforms.uMouse.value[0]`/`[1]` — `ogl` typing returns `Float32Array`-compatible buffers; write target, not read. No bare reads of arrays that the compiler would have flagged. | typecheck passes. | PASS |
| B08 | `pnpm exec biome lint` clean on changed files | `pnpm exec biome lint apps/borso-fr/site/components/Galaxy.tsx apps/borso-fr/site/galaxy.tsx apps/borso-fr/site/script.js apps/borso-fr/site/components/Galaxy.css` | `Checked 4 files in 1989ms. No fixes applied.` → exit 0 | PASS |
| B09 | `useEffect` justified (CLAUDE.md "useEffect is a smell" carve-out for syncing with external systems) | Single `useEffect` in `Galaxy.tsx:229-359`. External systems synchronized: WebGL renderer (`new Renderer`, `new Program`, `gl.canvas`), `window.addEventListener('resize')`, `container.addEventListener('mousemove'/'mouseleave')`, `requestAnimationFrame` lifecycle. Cleanup function (`Galaxy.tsx:332-341`) cancels rAF, removes listeners, removes the canvas, and calls `WEBGL_lose_context.loseContext()`. ADR 0003 "Consequences" explicitly tags this as the canonical legitimate `useEffect`. | This is exactly the "canvas mount + rAF + global listeners + cleanup on unmount" case the CLAUDE.md carve-out names. **Justified, not a smell.** | PASS |
| B10 | No `*.utils.ts` introduced (DOM + WebGL side-effect modules are correctly named without the suffix) | `git diff main...HEAD --name-only \| grep apps/borso-fr/.*utils\.ts` → none. | The shipped code is side-effect (`Galaxy.tsx` mounts a canvas + rAF, `galaxy.tsx` is a `createRoot` entry, `script.js` is DOM glue) — no pure helper that should have been split. | PASS |

## C. Pre-flight gates

| # | Check | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | Biome lint (changed files) | `pnpm exec biome lint apps/borso-fr/site/components/Galaxy.tsx apps/borso-fr/site/galaxy.tsx apps/borso-fr/site/script.js apps/borso-fr/site/components/Galaxy.css` | 0 | PASS |
| C02 | Build `@borso/infra` (prerequisite for borso-fr typecheck) | `pnpm --filter @borso/infra build` | 0 | PASS |
| C03 | Typecheck borso-fr (root + CDK projects) | `pnpm --filter @borso-app/borso-fr typecheck` (`tsc -p tsconfig.cdk.json --noEmit && tsc --noEmit`) | 0 | PASS |
| C04 | Build borso-fr — Vite picks up `./galaxy.tsx` from `index.html` | `pnpm --filter @borso-app/borso-fr build` | 0 | PASS |
| C05 | Bundle contains the Galaxy GLSL | `grep -l 'uStarSpeed\|StarLayer' apps/borso-fr/dist/assets/*.js` → `dist/assets/index-CUBr7O28.js` | n/a | PASS |
| C06 | Knip (repo-wide) | `pnpm exec knip` | 0 | PASS |

## D. Test coverage of spec

All behavioural assertions in this feature's spec (HP1–HP5, burger toggle, Escape, mobile-menu full-screen, reduced-motion render, WebGL-disabled fallback, broken-image scan) are explicitly routed to `/visual-validation` per the spec's Test strategy. Plan Rev2 confirms no `*.utils.ts` is introduced. There are no pure-function / non-DOM behavioural assertions in scope for this validator.

Status: **no behavioural assertions in spec for this category** — out of scope per spec routing.

## Notes

No FAIL or UNVERIFIABLE rows.

Observations (informational, no verdict impact):

- The spec's Test strategy section (spec.md:140-146) still contains the *original* Q.O.D. wording ("Aucune trace de React / Babel / JSX", "`apps/borso-fr/site/shader-bg.js` porte l'attribution MIT", "Pas de duplication de logique entre `script.js` et `shader-bg.js`"). These rows are stale relative to the corrected Q.O.D. block at spec.md:79-83 and the Plan Rev2 supersession; they survived as historical wording but contradict the accepted ADR 0003. The plan correctly flags them obsolete at plan.md:21. Recommend a follow-up tidy in the next kaizen PR to bring the Test strategy block in sync — this is a docs-housekeeping nit, not a validation FAIL (the live code is conformant with the corrected decisions, and the visual-validation contract carries the actual behavioural coverage).
- The original-revision plan rows that referenced `shader-bg.js`, `BgController`, vanilla WebGL, etc. are explicitly retained for traceability per plan.md:21 — confirmed not a regression.

## Verdict: PASS
