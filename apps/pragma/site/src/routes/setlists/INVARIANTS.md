# Invariants of pragma, in `site/src/routes/setlists`

The rules the terms of [the vocabulary](../../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Order screen

- One bar per entry, its height the entry's energy, read from the entry,
  then from its song, then the default level drawn muted
  (`buildEnergyBars`).
- While a row is lifted, its bar is drawn in the action blue and the curve
  follows the order the drop would give (`projectOrder`).
- The order is written on each drop, through the setlist's reorder route.
- A practice reaches it from **Order songs** on its Songs tab, carrying
  `back=/sessions/:id`, and its back link and **Done** return there
  (`selectOrderExitPath`). The practice's songs are first written into a
  setlist only that practice carries, as **Choose songs** does
  (`planPracticeSongsSave`), so ordering a practice never reorders a
  concert's setlist.

Held by: `site/src/routes/sessions/SessionDetailPage.test.tsx` › copies the songs of a concert setlist into its own before ordering, keeping the concert setlist untouched
Held by: `site/src/components/molecules/energy-curve.utils.test.ts` › reads the entry energy first, then the song energy, then the default level unstored
Held by: `site/src/components/molecules/energy-curve.utils.test.ts` › moves the lifted row to the place of the row it is over, downwards and upwards
