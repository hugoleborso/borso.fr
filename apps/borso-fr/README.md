# `apps/borso-fr`

The apex landing site at `https://borso.fr`. Plain HTML / CSS / JS for now; switches to a build tool when content needs it.

## Layout

Run `ls apps/borso-fr apps/borso-fr/site/src` to see what the app holds. File names say what they hold, and the root `CLAUDE.md` describes the layout every app shares.

A page's path under `site/` is the URL it ships at, so `site/` holds the page entry points and nothing else. `bin/app.ts` is the CDK entry point. `dist/` is the gitignored build output.

## Third-party attribution

The galaxy background is the react-bits Galaxy component, copied into this repository rather than installed ([ADR-2026-05-14T1341](../../docs/adr/2026-05-14T1341-react-bits-galaxy-as-react-component.md)). Two files carry it, and this notice is the licence compliance surface for both:

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
