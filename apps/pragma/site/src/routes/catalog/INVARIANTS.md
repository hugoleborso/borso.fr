# Invariants of pragma, in `site/src/routes/catalog`

The rules the terms of [the vocabulary](../../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Scene view

- The transpose offset is clamped to -11 to +11 semitones, which is the
  whole range with distinct output, and the font size runs from 16 px to
  48 px in steps of 2 px, starting at 24 px (`scene-view.core.ts`).

Held by: `site/src/routes/catalog/scene-view.core.test.ts` › clamps below the floor
Held by: `site/src/routes/catalog/scene-view.core.test.ts` › clamps above the ceiling
