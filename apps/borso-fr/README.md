# `apps/borso-fr`

The apex landing site at `https://borso.fr`. Plain HTML / CSS / JS for now; switches to a build tool when content needs it.

## Layout

- `site/` — source. Hand-written HTML, CSS, JS (modules). The Mondrian generator under `site/art/mondrian/` is a self-contained mini-app.
- `bin/app.ts` — CDK entry point. Reads `STAGE` + `PR_NUMBER` env, builds a `StaticSite` from `@borso/infra`.
- `dist/` — build output. Gitignored. The `build` script (`pnpm build`) produces it via `cp -R site dist`. Trivial today; swappable for Vite/Astro later.

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
