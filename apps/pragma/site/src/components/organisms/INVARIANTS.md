# Invariants — pragma, `site/src/components/organisms`

The rules the terms of [the vocabulary](../../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Lineup grid

- A column exists only for a member who holds an instrument in at least
  one entry; a member who plays nowhere in the setlist has no column.
- A cell where the member plays is filled with their stored colour and
  holds their instrument glyphs; a cell where they sit out shows a dot
  of that colour on the column's tint.
- A cell is marked as changed when its member plays and holds another set
  of instruments than on the entry before. The mark is a highlighter bar
  and an ink corner tick, never another fill: the colour means the member
  and nothing else (`buildLineupGrid`).

Held by: `site/src/components/organisms/lineup-grid.core.test.ts` › keeps a column only for the members who play in the setlist, in the order given
Held by: `site/src/components/organisms/lineup-grid.core.test.ts` › marks a played cell whose instruments differ from the entry before, and only that
Held by: `site/src/components/organisms/SetlistLineupGrid.test.tsx` › marks a cell that changed from the song before, without changing its fill

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
