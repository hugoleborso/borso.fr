# ADR 0002 — Vendor the react-bits Galaxy WebGL shader instead of installing it

**Status:** superseded
**Date:** 2026-05-14
**Superseded by:** [0003](./0003-react-bits-galaxy-as-react-component.md)

> The decision below shipped briefly. It was made on a false premise — `apps/borso-fr` was already on Vite + React, contradicting this ADR's first argument. See [`docs/dantotsus/believed-the-bundle-readme-not-the-live-package-json.md`](../dantotsus/believed-the-bundle-readme-not-the-live-package-json.md). ADR 0003 records the corrected decision.

## Context

The `borso-fr/front-page-redesign` feature replaces the apex landing's
gradient canvas with a galaxy starfield WebGL shader. Hugo specified the
exact effect by linking the [react-bits Galaxy
component](https://www.reactbits.dev/) (MIT, © David Haz) — same hue
shift, density, mouse repulsion, twinkle parameters. The shader's
fragment program is a few hundred lines of GLSL plus a thin JS harness.

`apps/borso-fr` is **plain HTML / CSS / JS today** (see [`apps/borso-fr/
README.md`](../../apps/borso-fr/README.md)): `pnpm dev` is
`python3 -m http.server`, `pnpm build` is `cp -R site dist`, there is no
bundler. The package has zero runtime dependencies.

We had three options to consume the effect:

1. **npm install `ogl` + the react-bits Galaxy package**, render via
   React. Forces React + a bundler (Vite/Astro) into the app, taking
   `apps/borso-fr` from "plain HTML" to "React SPA" just to draw a
   background.
2. **Rewrite the shader from scratch.** Re-invents a well-tuned effect,
   risks visual drift from the reference Hugo picked, and the GLSL is the
   complicated bit anyway.
3. **Vendor the shader as vanilla WebGL.** Lift the GLSL + minimal JS
   harness into `apps/borso-fr/site/shader-bg.js`, keep MIT attribution
   in the file header, no npm dependency.

## Decision

We **vendor** the shader as `apps/borso-fr/site/shader-bg.js`, with an
MIT attribution block at the top crediting David Haz / react-bits as the
GLSL source. The harness around the shader is rewritten in vanilla
WebGL (no OGL, no React) so the app stays plain HTML / CSS / JS.

- Frozen parameters live as a `PARAMS` const at the top of the file;
  the Tweaks panel is out of scope for production (Q.O.D. row "Tweaks
  panel").
- No new npm dependency; `apps/borso-fr/package.json` does not gain
  `ogl` or `react`.
- Future raffinement: if mobile perf regresses, tune `density` / DPR
  cap inside `shader-bg.js` rather than reaching back for the upstream
  React component.

## Consequences

**Easier.** `apps/borso-fr` keeps its "open file, refresh browser" dev
loop — no Vite, no React, no bundler, no `node_modules` for the apex
landing. The shader is a single file we can grep, profile, and
modify without leaving the workspace. ADR 0001's commitment to *not*
forcing a build tool into every app holds for the apex landing.

**Harder.** Upstream fixes to the react-bits Galaxy component won't
auto-propagate. If the upstream shader gains a relevant fix, we have to
notice and port it manually. Cost is bounded: the file is ~300 lines and
the upstream is on GitHub. The MIT attribution must stay in the file
header — removing it is a license violation.

**Load-bearing.** The MIT attribution at the top of
`apps/borso-fr/site/shader-bg.js` is the license compliance surface; do
not strip it during cleanup passes. The frozen `PARAMS` block is the
single point of truth for the shader's visual identity — changes there
are visual changes and should ship through `/visual-validation`.
