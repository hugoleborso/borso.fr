# Invariants — borsouvertures, `site/src/theme`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/borsouvertures/`.

## Board theme

- Four ids: `lichess`, `chesscom`, `nord`, `sand`. Each carries a `light`, a
  `dark`, a `highlight` and an `arrow` colour, plus the i18n key of its name.
- Pieces come from react-chessboard's bundled SVG set in every theme, which is
  what keeps the board drawable offline.
