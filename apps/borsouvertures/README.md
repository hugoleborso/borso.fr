# `apps/borsouvertures`

Chess-openings PWA at `https://borsouvertures.borso.fr`. React + TypeScript + Vite. A daily
trainer over hand-written decks (Today, Decks), an open explorer over the shipped Lichess
openings (Explore) that adds lines to a personal deck, four board themes, and an offline-capable
service worker. Progress and the personal deck are logs of events kept in the browser's
IndexedDB, synced for one account through the API.

## Layout

Run `ls apps/borsouvertures apps/borsouvertures/site/src` to see what the app holds. File names say what they hold, and the root `CLAUDE.md` describes the layout every app shares. `pnpm run` in this folder lists the scripts.

`content/decks/<deck-id>/` holds one deck per folder. Adding or removing a folder needs no code change, only the deck's name in `site/src/i18n/en.json` and `fr.json`. The format is in `docs/features/borsouvertures/opening-trainer/plan/plan.md`, section "Deck content format".

## Local

```bash
cd apps/borsouvertures
pnpm dev          # vite on :5173
```

Rebuild the openings dataset (only needed when the family list or Lichess pin changes):

```bash
pnpm build:openings
```

Build and check the decks:

```bash
pnpm build:decks                               # prints the line and card count of each deck
pnpm check:decks                               # every deck, about 0.4 s per reader move
DECK=albin-countergambit pnpm check:decks      # one deck
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
