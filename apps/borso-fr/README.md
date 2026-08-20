# `apps/borso-fr`

The apex landing site at `https://borso.fr`. Plain HTML / CSS / JS for now; switches to a build tool when content needs it.

## Layout

- `site/` — the Vite root. It holds the page entry points and nothing else, because a page's path under the root is the URL it ships at: `index.html`, `12-travaux/index.html`, `art/mondrian/index.html`, `family/*.html`.
- `site/src/` — the TypeScript and React source, laid out like the other applications: `components/{atoms,molecules,organisms}/`, `i18n/`, `labours/`, `styles/`, `theme/`, plus a folder per extra page holding its `main.tsx`. The Mondrian generator under `site/src/art/mondrian/` is a self-contained mini-app.
- `site/public/` — static assets served at the site root.
- `bin/app.ts` — CDK entry point. Reads `STAGE` + `PR_NUMBER` env, builds a `StaticSite` from `@borso/infra`.
- `dist/` — build output. Gitignored. The `build` script (`pnpm build`) produces it via `cp -R site dist`. Trivial today; swappable for Vite/Astro later.

## Third-party attribution

The galaxy background is the react-bits Galaxy component, copied into this repository rather than installed ([ADR-0003](../../docs/adr/0003-react-bits-galaxy-as-react-component.md)). Two files carry it, and this notice is the licence compliance surface for both:

- `site/src/components/organisms/galaxy-shaders.ts` — the GLSL, byte for byte as upstream wrote it.
- `site/src/components/organisms/Galaxy.tsx` — the harness, retyped as TSX.

```
SPDX-License-Identifier: MIT
Source: https://github.com/DavidHDev/react-bits (components/Backgrounds/Galaxy/Galaxy.jsx)
Copyright (c) 2024 David Haz
```

## Local

```bash
cd apps/borso-fr
pnpm dev          # python3 -m http.server on :5173
```

Open `http://localhost:5173/` for the apex; `http://localhost:5173/art/mondrian/` for the generator.

## Deploy

Driven by CI (Phase 4 workflows). Manual paths if you ever need them:

```bash
# preview (per-PR)
STAGE=preview PR_NUMBER=123 \
CDK_DEFAULT_ACCOUNT=$(aws --profile borso-admin sts get-caller-identity --query Account --output text) \
  pnpm deploy

# prod
STAGE=prod \
CDK_DEFAULT_ACCOUNT=$(aws --profile borso-admin sts get-caller-identity --query Account --output text) \
  pnpm deploy
```

`pnpm deploy` chains `pnpm build` so `dist/` is always fresh.
