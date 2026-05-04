# `apps/borsouvertures`

Chess-openings PWA at `https://borsouvertures.borso.fr`. React + TypeScript + Vite. Two modes
(Learn an opening, Play within an opening), four board themes, and an offline-capable service
worker that caches the openings dataset.

## Layout

- `site/` — source. React app (`main.tsx` → `App.tsx`), components, hooks, openings book engine,
  board theming, Zustand store. Pure helpers live in `*.utils.ts` siblings and ship at 100% test
  coverage (see `CLAUDE.md` → Clean code).
- `site/public/` — static assets served at the site root: `openings.json` (the bundled book),
  PWA icons, favicon, the 404 image used by CloudFront error responses.
- `bin/app.ts` — CDK entry point. Builds a `StaticSite` from `@borso/infra`.
- `scripts/build-openings.ts` — fetches the Lichess `chess-openings` TSVs, filters the families
  we care about, converts PGNs to SAN/UCI via `chess.js`, and emits `openings.json` plus a fresh
  `openingsCacheVersion.ts` so the service worker invalidates its cache.
- `dist/` — Vite build output. Gitignored. Populated by `pnpm build`; the deploy script chains it.

## Local

```bash
cd apps/borsouvertures
pnpm dev          # vite on :5173
```

Rebuild the openings dataset (only needed when the family list or Lichess pin changes):

```bash
pnpm build:openings
```

## Deploy

Driven by CI; the manual paths mirror `apps/borso-fr`:

```bash
# preview (per-PR)
STAGE=preview PR_NUMBER=123 \
CDK_DEFAULT_ACCOUNT=$(aws --profile borso-admin sts get-caller-identity --query Account --output text) \
  pnpm run deploy

# prod
STAGE=prod \
CDK_DEFAULT_ACCOUNT=$(aws --profile borso-admin sts get-caller-identity --query Account --output text) \
  pnpm run deploy
```

`pnpm run deploy` chains `pnpm build` so `dist/` is always fresh.
