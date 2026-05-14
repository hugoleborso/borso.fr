# ADR 0003 — Mount the react-bits Galaxy as a React component on top of `ogl`

**Status:** accepted
**Date:** 2026-05-14
**Supersedes:** 0002

## Context

ADR [0002](./0002-vendor-react-bits-galaxy-shader.md) ratified vendoring the react-bits Galaxy as vanilla WebGL in `apps/borso-fr/site/shader-bg.js`, with one explicit argument: *"npm install `ogl` + the react-bits Galaxy package … forces React + a bundler into the app, taking `apps/borso-fr` from 'plain HTML' to 'React SPA' just to draw a background."*

That premise was wrong. The orchestrator had inherited a stale picture of the workspace from the Claude Design hand-off bundle's README. The live `apps/borso-fr/package.json` has had `vite@6`, `react@19`, and `react-dom@19` for two PRs, consumed by the `art/mondrian` sub-route. The architectural "cost" ADR 0002 was trying to avoid was already paid.

The dantotsu [`believed-the-bundle-readme-not-the-live-package-json.md`](../dantotsus/believed-the-bundle-readme-not-the-live-package-json.md) traces the misconception and ships the structural fix (skill standards now mandate a live-workspace cross-check). This ADR is the matching code-level correction: revise the architectural decision against the *correct* picture of the repo.

## Decision

We **install `ogl`** as an `apps/borso-fr` dependency and mount the **react-bits Galaxy component** (copied into `apps/borso-fr/site/components/Galaxy.tsx`, MIT attribution preserved) as a small React island on `#bg-canvas-wrap`. The cohabitation pattern matches `art/mondrian` (a self-contained React mini-app in the same workspace).

- `pnpm --filter @borso-app/borso-fr add ogl` adds one runtime dep (~30 KB gzipped).
- `apps/borso-fr/site/components/Galaxy.tsx` is the typed port of the upstream component; the GLSL is *not* re-typed — it stays as a template string. The MIT attribution block (David Haz / react-bits) sits at the top of the file.
- `apps/borso-fr/site/galaxy.tsx` is the tiny entry: `createRoot(document.getElementById('bg-canvas-wrap'))` then renders `<Galaxy {...PARAMS} disableAnimation={prefersReducedMotion} />`.
- `apps/borso-fr/site/shader-bg.js` is deleted.
- `apps/borso-fr/site/index.html` swaps `<script type="module" src="./shader-bg.js">` for `<script type="module" src="./galaxy.tsx">` — Vite handles the TSX as part of its existing multi-entry build (`vite.config.ts` already lists `site/index.html`).

## Consequences

**Easier.** Upstream fixes to the react-bits Galaxy propagate by re-copying the file (or by `pnpm dlx shadcn@latest add @react-bits/Galaxy-JS-CSS` if we adopt the shadcn registry pattern later) — the GLSL surface is no longer load-bearing in our repo. Architectural coherence with `art/mondrian` improves: the apex landing and the Mondrian sub-route share React + Vite + the same `pnpm dev` loop. `prefers-reduced-motion` is now plumbed as a single prop (`disableAnimation`) handled by the component itself, instead of a custom early-return in our harness.

**Harder.** `ogl` becomes a third-party we depend on at runtime. The bundle gains ~30 KB minified (uncompressed: ~80 KB) for `ogl` plus ~10 KB for the component. The React island carries the usual cost: a `createRoot` call, a `useEffect` for the WebGL lifecycle (justified — synchronising React with an external WebGL system, the canonical legitimate `useEffect` from CLAUDE.md). License compliance moves from "attribution in our source" to "MIT attribution in our copied component + `ogl`'s own `node_modules/ogl/LICENSE`".

**Load-bearing.** The MIT attribution at the top of `apps/borso-fr/site/components/Galaxy.tsx` must stay — same license discipline as ADR 0002, just relocated. The Galaxy component's prop defaults are NOT our truth; the truth is the `PARAMS` block in `galaxy.tsx` (the entry), which mirrors what Hugo specified in the design chat (`starSpeed: 0.3`, `density: 2.2`, `hueShift: 205`, etc.). If `prefers-reduced-motion: reduce` changes mid-session, the component is re-mounted on next page load — we do not subscribe to media-query changes at runtime, by design.
