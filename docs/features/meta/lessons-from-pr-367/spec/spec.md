# A seed chart with every kind of line

## Goal

A validator checking how Pragma draws a ChordPro chart finds every kind of line on the seeded song "Slow Burn". PR #367's validators had to type a probe chart by hand for three assertions, because the seed held no chord-only line, no comment directive and no tab block.

## Assertions

1. The seeded "Slow Burn" chart holds a comment directive, a line made only of chords, and a tab block, beside its verse, chorus and bridge.
2. A test fails when the chart loses any of those kinds of line.
3. `pnpm dev` and a preview's `basic-band` seed both load the new chart, since both read the same fixture.
4. Every other seeded song, and every other seeded field of "Slow Burn", is unchanged.
5. The fixture file stays under the 300-line limit.
