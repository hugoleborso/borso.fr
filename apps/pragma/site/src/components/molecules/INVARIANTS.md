# Invariants — pragma, `site/src/components/molecules`

The rules the terms of [the vocabulary](../../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Lineup slot

- A song draws one slot per instrument held, so two singers draw two
  microphones. An instrument nobody holds on that song draws nothing;
  there is no empty slot.
- Slots are ordered by the instrument's `position`, then by its name, then
  by member order for a shared instrument (`buildLineupColumn`).
- The whole lineup is drawn when the row has room. What the width drops
  is counted as `+N`, whose title names the instruments that fell off.
  The column yields; the song title never truncates to make room for it.

Held by: `site/src/components/molecules/lineup-slots.core.test.ts` › draws one slot per instrument held, ordered by the stored position, never by name
Held by: `site/src/components/molecules/lineup-slots.core.test.ts` › leaves out every instrument nobody holds on this song
Held by: `site/src/components/molecules/lineup-slots.core.test.ts` › draws a slot per holder when two members share one instrument, in member order
Held by: `site/src/components/molecules/lineup-slots.core.test.ts` › counts the slots the width dropped and names them for the tooltip
