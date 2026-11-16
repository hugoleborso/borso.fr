# Invariants of pragma, in `site/src/components/organisms`

The rules the terms of [the vocabulary](../../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Lineup grid

- A column exists only for a member who holds an instrument in at least
  one entry; a member who plays nowhere in the setlist has no column.
- Each row starts with a title column: the position, the title on one
  truncated line, and under it a badge with the row's change count when it
  has changes.
- Voice is never a change. An instrument of the `vocal` family (Chant,
  Chœurs) is ignored when two songs are compared, because every member has a
  mic in front of them. A cell is changed when its member plays, the row is
  not the first, and the set of hand instruments differs from the entry
  before. Putting a hand instrument down to only sing is a change; coming
  back from a sit-out on voice alone is not (`buildLineupGrid`).
- A run is consecutive cells where the member plays with the same hand
  instruments, or only sings. A cell that starts a run is filled with the
  member's stored colour; a cell that joins the run above is a pale tint of
  it, drawn over the row gap so the run reads as one bar, with faint glyphs.
- A changed cell always starts a run, so it is filled in full with only
  the new glyphs. The instruments put down are read in the cell above, and
  the cell's label names them for a screen reader. A change is shown by
  intensity, never by another hue: the colour means the member and nothing
  else.
- A cell where the member sits out is empty and breaks the run.
- A row with no change is compact, except the first row, which has nothing
  before it and so no change and no badge.

Held by: `site/src/components/organisms/lineup-grid.core.test.ts` › keeps a column only for the members who play in the setlist, in the order given
Held by: `site/src/components/organisms/lineup-grid.core.test.ts` › marks a played cell whose hand instruments differ from the entry before, and only that
Held by: `site/src/components/organisms/lineup-grid.core.test.ts` › ignores a Chœurs added then dropped, so the lane stays one run and the rows are compact
Held by: `site/src/components/organisms/lineup-grid.core.test.ts` › joins a member who only sings, from Chœurs to Chant
Held by: `site/src/components/organisms/lineup-grid.core.test.ts` › counts putting a hand instrument down to only sing as a change
Held by: `site/src/components/organisms/lineup-grid.core.test.ts` › breaks a run where the member sits out, and a voice-only return is no change
Held by: `site/src/components/organisms/lineup-grid.core.test.ts` › starts the first row with full cells and no change, no badge and no compaction
Held by: `site/src/components/organisms/SetlistLineupGrid.test.tsx` › fills a changed cell in full with only its new glyphs, and names what came before in its label
Held by: `site/src/components/organisms/SetlistLineupGrid.test.tsx` › tints a cell that joins the run above, pulled up over the row gap, with faint glyphs
Held by: `site/src/components/organisms/SetlistLineupGrid.test.tsx` › badges a row with its change count and keeps a row with none compact and bare

## Opening screen

- Shows only when no band query holds data: a first open, a cache older
  than 7 days, or the open right after sign-in. A warm open renders the
  cached screen at once.
- The route mounts beneath it, inert and hidden, so the session probe and
  the route's reads leave in one read batch.
- Ends when one band query holds data. When nothing is in flight and a
  read failed or paused offline, it shows the failure and a retry that
  refetches every active query in one batch.
- The mark plays "the downbeat" (keys pressed in an arpeggio, the notes
  swinging in), and stays still under reduced motion and on failure.

Held by: `site/src/components/organisms/session-gate.core.test.ts` › counts a read paused offline as failed, so an offline cold open never waits forever
Held by: `site/src/components/organisms/RequireSession.test.tsx` › mounts the route inert beneath the opening screen, so the probe and its read leave in one batch
Held by: `site/src/components/organisms/RequireSession.test.tsx` › shows the failure when the first batch fails, and retries every read in one batch

## Setlist row

- A song row is one title line and one line under it. It grows only by the
  entry's note and tonight's lineup change. The transition marker drawn
  above it belongs to the pair of songs, not to the row. Nothing else about the song,
  such as a task, is drawn in it: the screen exists to keep as many songs as
  possible in view.

Held by: `site/src/components/organisms/SetlistEntryRow.test.tsx` › grows by the note and tonight’s change only, so the list keeps its songs on screen

## Brush-up

- A song row's menu offers **To revise** only when a next session exists,
  the task list has loaded and the signed-in member holds no task on that
  song for that session, ticked or not (`selectSessionToBrushUp`, reading
  `indexBrushUpTasksBySong`).
- The task is assigned to the member who asked, and due on the session's
  date (`buildBrushUpTask`).

Held by: `site/src/components/organisms/brush-up.core.test.ts` › offers nothing once the member has one, even ticked and beside another member’s
Held by: `site/src/components/organisms/brush-up.core.test.ts` › offers nothing while the task list has not arrived
Held by: `site/src/components/organisms/brush-up.core.test.ts` › groups the tasks of the next session by song, done ones included
Held by: `site/src/components/organisms/brush-up.core.test.ts` › assigns the member and dates the task on the session
