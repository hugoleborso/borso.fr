# Invariants — borsouvertures, `site/src/openings`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/borsouvertures/`.

## ECO code

- A line carries exactly one, as `eco`. An opening carries `ecoCodes`, the
  distinct codes of every row folded into it, in first-seen order.
- Both are plain strings to the parser, which checks the type and nothing about
  the format.

## Line

- `id`, `name`, `eco`, `movesSan` and `movesUci` are all required, and the
  parser rejects the dataset when any of them has the wrong type.
- `movesSan` and `movesUci` are the same moves in the two notations, produced
  from one `chess.js` history, so they index together.
- `id` is `buildLineId(name, movesUci)`: the slug of the name, a hyphen, then a
  64-bit FNV fingerprint of the moves joined by spaces, in base 36. The name
  alone is not an identifier, because the upstream dataset reuses one name
  across several move sequences.
- `assertUniqueLineIds` fails the build on a repeated `opening/variation/line`
  triple. Lines are sorted by `name.localeCompare` inside their variation.
- The shipped dataset holds 2313 lines.

## Move

- UCI is what the machines, the book, the events and the arrows speak: two squares, each
  matching `/^[a-h][1-8]$/`, plus an optional promotion piece, one of `q`, `r`,
  `b`, `n`. `toSquare` throws on anything else.
- SAN is for reading. The explorer and the decks get it by replaying the UCI
  moves through `chess.js`. The board asks for the promotion piece and names
  it in the UCI move. A move without one still promotes to a queen in the
  explorer and the deck game.

## Opening

- `id`, `name`, `ecoCodes` and `variations` are all required. `id` is
  `toSlug(name)`: lower case, apostrophes dropped, runs of anything else folded
  to a hyphen, edge hyphens trimmed.
- A source row joins the first name in the build script's `FAMILIES` list that
  its own name starts with, so the list is ordered most specific first and the
  build fails when any entry wins no row. Twenty families are listed and twenty
  ship.

## Openings dataset

- `fetchOpeningsDocument` is the only outbound call in the site. A refusal, a
  network failure and a malformed body all collapse to `null`, because the
  caller acts the same way on all three.
- `loadOpenings` uses the fetched document when it parses to a non-empty list,
  and the copy bundled into the JS chunks otherwise. Failure on both paths is
  reported as `{ ok: false, error }`, which `selectOpeningsLoad` flattens to the
  status `failed`.
- `readOpeningsRequest` memoises the promise in a module-level holder, so a
  component reading it with React's `use` resumes rather than refetches.
- The service worker caches `/openings.json` cache-first under
  `openings-cache-<OPENINGS_CACHE_VERSION>`, and the build script rewrites that
  version constant every time it regenerates the file.

## Preview

- A deck previews its first line after at most 6 plies of SAN, and a deck line
  its last position. Replay stops at the first move `chess.js` refuses.
- A book move in Explore previews the position after it.

## Variation

- `id`, `name` and `lines` are all required.
- The name comes from the source row's title: the text between the colon and the
  first comma, and `Main Line` when the title has no colon. `id` is the slug of
  that name.
- In Explore it is the middle level a book move names, read as
  `Family: Variation`.
- The shipped dataset holds 587 variations.
