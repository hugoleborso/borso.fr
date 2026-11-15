# Invariants of pragma, in `site/src/routes/catalog`

The rules the terms of [the vocabulary](../../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Scene view

- The transpose offset is clamped to -11 to +11 semitones, which is the
  whole range with distinct output, and the font size runs from 16 px to
  48 px in steps of 2 px, starting at 24 px (`scene-view.core.ts`).
- A tab block never wraps. It shrinks to fit its widest line, never above
  the chosen size nor below the 16 px floor, and scrolls sideways past
  that (`buildTabFontSize`).
- Transposing a chart also transposes its tab blocks
  (`transposeChordChart` in `tab-transpose.core.ts`). A run of consecutive
  staff lines is one **system**. Every fret number on a staff shifts by
  the semitones. A fret that would fall below 0 moves up an octave (+12).
  The string name, the bar lines, every technique mark and a repeat count
  such as `x2` stay as written. Where a fret gains or loses a digit, every
  string of the system is padded or trimmed with `-` at that column, so
  each note keeps its column across strings. A chord line right above a
  system has its chords transposed and moved with the columns. Any other
  line stays as written.

Held by: `site/src/routes/catalog/tab-transpose.core.test.ts` › moves a fret that would fall below the open string up an octave
Held by: `site/src/routes/catalog/tab-transpose.core.test.ts` › shifts the numbers around every technique and keeps the string names and bar lines
Held by: `site/src/routes/catalog/tab-transpose.core.test.ts` › pads every string where a fret gains a digit, so each note keeps its column
Held by: `site/src/routes/catalog/tab-transpose.core.test.ts` › trims the filler on every string where a fret loses a digit
Held by: `site/src/routes/catalog/tab-transpose.core.test.ts` › keeps the chord line above the staves column for column
Held by: `site/src/routes/catalog/scene-view.core.test.ts` › clamps below the floor
Held by: `site/src/routes/catalog/scene-view.core.test.ts` › clamps above the ceiling
Held by: `site/src/routes/catalog/scene-view.core.test.ts` › fits the widest tab line to the width, never above the chosen size nor below the floor
