# Invariants of pragma, in `site/src/routes/catalog`

The rules the terms of [the vocabulary](../../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Opening chart

- A song with charts opens on the first chart naming an instrument the
  member holds, else on the first chart for every instrument, else on the
  first chart (`selectOpeningChartIndex`). Until the member is known, the
  first chart shows.
- The song page and the song scene read the song's default lineup. The
  setlist entry sheet and the setlist scene read the lineup the entry
  resolves to (`resolveLineup`).
- The scene views list the ChordPro charts only, and choose the opening
  chart among them (`selectChordProCharts`).
- A tapped pill holds for the visit only. Moving to another setlist entry
  in the scene opens that entry on its own opening chart.
- A pill reads the chart's instrument names in instrument order, joined by
  " + ", or "All instruments" when no name is left, then " · " and the
  label (`describeChordChartTitle`).

Held by: `site/src/routes/catalog/opening-chart.core.test.ts` › opens on a chart naming an instrument the member holds
Held by: `site/src/routes/catalog/opening-chart.core.test.ts` › ranks a chart naming the instrument above a chart for every instrument
Held by: `site/src/routes/catalog/opening-chart.core.test.ts` › opens on the first matching chart in order
Held by: `site/src/routes/catalog/opening-chart.core.test.ts` › matches either instrument of a member holding two
Held by: `site/src/routes/catalog/opening-chart.core.test.ts` › opens on the first chart for every instrument when no chart names the member
Held by: `site/src/routes/catalog/opening-chart.core.test.ts` › opens on the first chart when none matches and none is for every instrument
Held by: `site/src/routes/catalog/opening-chart.core.test.ts` › answers no chart for an empty list
Held by: `site/src/routes/catalog/opening-chart.core.test.ts` › opens on the first chart while the member is not known yet
Held by: `site/src/routes/catalog/chart-title.utils.test.ts` › reads All instruments when no name is left
Held by: `site/src/routes/setlists/SetlistScenePage.test.tsx` › opens the next entry on its own opening chart after a pill was tapped

## Scene view

- The transpose offset is clamped to -11 to +11 semitones, which is the
  whole range with distinct output, and the font size runs from 16 px to
  48 px in steps of 2 px, starting at 24 px (`scene-view.core.ts`).
- A tab block never wraps. It shrinks to fit its widest line, never above
  the chosen size nor below the 16 px floor, and scrolls sideways past
  that (`buildTabFontSize`).
- Transposing a chart also transposes its tab blocks
  (`transposeChordChart` in `tab-transpose.core.ts`). Inside a tab block a
  staff needs one dash (`isTabBlockStaffLine`), so a single-dash tab
  transposes too; detecting pasted staves still needs two. A run of
  consecutive staff lines is one **system**. Every fret number on a staff shifts by
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
Held by: `site/src/routes/catalog/tab-transpose.core.test.ts` › transposes a tab written with single dashes inside a tab block
Held by: `site/src/routes/catalog/scene-view.core.test.ts` › clamps below the floor
Held by: `site/src/routes/catalog/scene-view.core.test.ts` › clamps above the ceiling
Held by: `site/src/routes/catalog/scene-view.core.test.ts` › fits the widest tab line to the width, never above the chosen size nor below the floor
