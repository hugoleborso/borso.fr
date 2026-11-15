# Lineup grid transitions

## Why

The lineup grid marks every member whose instrument set differs from the song before. Adding or dropping the backing vocals counts as a change, so a song like Marcia baila after La goffa Lolita shows five marks when nobody moves (measured on the Alliance 3 setlist, 2026-11-14). The mark itself, an ink corner tick plus a highlighter bar, is hard to see and hard to read.

The operator wants to see, at a glance down the setlist, who has to pick up another instrument between two songs, and what they put down.

- **Output metric**: the operator reads the transitions of a setlist from the grid alone, without opening an entry.
- **Input metric**: on Alliance 3, Marcia baila (13) shows zero changes, and Take on me (15) shows exactly two, on Arn and Borso.

## Result

Variant I of the mockup canvas, with the app's instrument icons instead of instrument names. The canvas is at https://claude.ai/artifact/6em3tCi9pZHXdDF2BApVUF (board "I · Couloir membre pâle, plein au changement").

- Each row puts the song in a left column: position, title on one truncated line, and under it a change badge when the row has changes ("⇄ 2").
- Each member column is a continuous lane. While a member keeps the same instruments in their hands, their cells join into one bar tinted with their colour, with the glyphs faint.
- A cell where the instruments in the member's hands change from the song before is filled with the member's full colour and holds only the new glyphs. The instruments put down are read in the cell above, and the cell's label names them for a screen reader (operator, 2026-11-15, after seeing the preview).
- A row with no change at all is compact.
- A cell where the member sits out is empty, and it breaks the lane.

## Use cases / edge cases

1. The operator opens a setlist's Lineup view and scrolls down. Each row with changes carries a badge with the count. The changed cells stand out in full colour, and the stable lanes stay pale.
2. The operator taps any cell, and the entry opens as today.
3. The operator taps a column header, and the member's part opens as today.

Edge cases:

- **Voice is never a change.** An instrument whose family is `vocal` (Chant, Chœurs) is ignored when comparing two songs. All members have a mic in front of them (operator, 2026-11-15).
- A member who only sings on two songs in a row keeps a joined lane, even if they go from Chœurs to Chant.
- The first row has nothing before it. Its cells are full colour, with no change mark and no badge.
- A member who sits out, then plays: the playing cell starts a new run in full colour. It counts as a change only if it holds a hand instrument.
- A member who plays, then holds only a vocal instrument: counts as a change (they put their instrument down). The cell's label names what they put down.

## Questions, Options and Decisions

| Question | Options | Decision |
| --- | --- | --- |
| How should a change be shown? | A banner between songs, continuous lanes, handoff arrows, faded stable cells, or mixes of these | Variant I: a continuous pale lane, full colour on a change, compact unchanged rows (operator, 2026-11-15) |
| What does colour mean? | Member, instrument, or change state | Member only. A change is shown by intensity and text. The highlighter, the hue reserved for changes, marks only the row badge (`apps/pragma/VOCABULARY.md`, Member) |
| Instrument names or icons in cells | Text, icons | Icons (operator, 2026-11-15) |
| Does a voice change count? | Ignore Chœurs only, ignore every `vocal` instrument | Ignore every `vocal` instrument (operator, 2026-11-15) |

Out of scope: the transition comments strip, the per-entry lineup editor, the "my part" view.

## Changes

**Types** (`site/src/components/organisms/lineup-grid.core.ts`):

```ts
interface LineupGridInstrument { id; name; icon; position; family: InstrumentFamily }

interface LineupGridCell {
  memberId; firstName; color;
  glyphs: readonly LineupGridGlyph[];          // every instrument held, voice included
  previousGlyphs: readonly LineupGridGlyph[];  // hand instruments held on the entry before, set only when isChanged
  isPlaying: boolean;
  isChanged: boolean;     // playing, not the first row, and the set of non-vocal instruments differs from the entry before
  joinsPrevious: boolean; // same run as the cell above: both playing with the same non-vocal set, or both voice only
  joinsNext: boolean;
}

interface LineupGridRow { entryId; position; title; cells; changeCount: number; isCompact: boolean } // isCompact: not the first row and changeCount === 0
```

No API, schema or domain change. `family` already reaches the site with each instrument.

## Test strategy

- Unit (`lineup-grid.core.test.ts`). A Chœurs added or dropped is no change. Chœurs → Chant on a voice-only member is no change and joins. A swap of Basse and Piano marks both cells with their previous glyphs. Runs set `joinsPrevious` and `joinsNext`. A sit-out breaks a run. `changeCount` and `isCompact` are set per row. The first row has no change.
- Component (`SetlistLineupGrid.test.tsx`). A changed cell has full fill, only its new glyphs, a label naming the previous ones, and `data-lineup-changed`. A joined cell is tinted. The badge shows the count, and a compact row has none.
- Visual validation, at 375 px on the dev seed: a setlist with a swap shows the badge and two full cells, the stable lanes are pale and continuous, and the page has no horizontal scroll.
