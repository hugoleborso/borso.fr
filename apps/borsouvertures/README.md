# `apps/borsouvertures`

Chess-openings PWA at `https://borsouvertures.borso.fr`. React + TypeScript + Vite. A daily
trainer over hand-written decks (Today, Decks), an open explorer over the shipped Lichess
openings (Explore) that adds lines to a personal deck, four board themes, and an offline-capable
service worker. Progress and the personal deck are logs of events kept in the browser's
IndexedDB, synced for one account through the API.

## Layout

- `site/` — the Vite root, holding `index.html` and nothing else.
- `site/src/` — source. React app (`main.tsx` → `routes/OpeningTrainerPage.tsx`). Components are
  split into `components/atoms`, `components/molecules` and `components/organisms` by what each
  one imports; `i18n/` holds the English and French catalogues; `lib/` holds the viewport and
  pagination hooks; `openings/` holds the book engine and the session machines; `state/` holds
  the persisted application store. Pure helpers live in `*.utils.ts` and `*.core.ts` siblings and
  ship at 100% test coverage (see `docs/standards/`).
- `site/public/` — static assets served at the site root: `openings.json` (the bundled book),
  `decks.json` (built, gitignored), `stockfish/` (three vendored files, see
  `THIRD_PARTY_NOTICES.md`), PWA icons, favicon, the 404 image used by CloudFront error responses.
- `content/decks/<deck-id>/` — one deck per folder: `deck.json` (the lines), `ideas.en.md` and
  `ideas.fr.md` (one idea per reader move). Adding or removing a folder needs no code change,
  only the deck's name in `site/src/i18n/en.json` and `fr.json`. The format is in
  `docs/features/borsouvertures/opening-trainer/plan/plan.md`, section "Deck content format".
- `domain/` — rules the site reads today and the API will read: the review event, the position
  key and the calendar day (`@domain/*`).
- `bin/app.ts` — CDK entry point. Builds a `StaticSite` from `@borso/infra`.
- `scripts/build-openings.ts` — fetches the Lichess `chess-openings` TSVs, filters the families
  we care about, converts PGNs to SAN/UCI via `chess.js`, and emits `openings.json` plus a fresh
  `openingsCacheVersion.ts` so the service worker invalidates its cache.
- `scripts/build-decks.setup.ts` — reads every `content/decks/*/` folder, checks legality, the one
  reader move per position, the ideas and the catalogue keys, and writes `site/public/decks.json`.
  It runs before `pnpm dev` and `pnpm build`, and fails naming the deck, the line and the ply.
- `scripts/check-decks.setup.ts` — asks the vendored Stockfish, at depth 16, whether any reader move
  loses more than 100 centipawns against the engine's best move. A move over the margin needs an
  entry in its deck's `engineExceptions`, and none passes over 250. `DECK=<deck-id>` limits the
  run to one deck. It runs in the `deck-content` job of CI, not on a commit.
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
