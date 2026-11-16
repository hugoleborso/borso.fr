# Chords above the lyrics

## Goal

A musician reading a ChordPro chart in Pragma sees each chord above the word it lands on, as ChordPro renderers draw it. Today the chart shows the source text, so `[Am]` sits inside the lyrics with its brackets.

The stored chart text does not change. Only how the chart is drawn changes.

## Where it shows

Every place that draws a ChordPro chart: the song page chart tab, the song scene view (`/catalog/<song>/scene`), the setlist scene view, and the preview under the chart field when editing a song.

In `pnpm dev`, the seeded song "Slow Burn" holds a ChordPro chart. The `[dev:db]` line prints the seeded sign-in.

## Assertions

1. No chord on a chart line shows square brackets.
2. Each chord sits on a row directly above the word that follows it in the source, left aligned with the start of that word.
3. A word with no chord has an empty space above it, and its lyric stays on the same baseline as the words that carry a chord.
4. Read as page text, a lyric line keeps single spaces between its words. Nothing is added between two words that carry no chord.
5. A line made only of chords shows its chords on one row, with no empty lyric row below them.
6. At 375 px wide, a line too long for the screen wraps between two words, each chord staying above its word, and the wrapped part is indented. The page does not scroll sideways.
7. At 1280 px wide, every line of the seeded chart fits on one row of chords over one row of lyrics.
8. Transposing up by one semitone changes every chord shown above the lyrics, and the lyrics stay in place.
9. Section headings (verse, chorus), the title and comment directives look as they did before.
10. Tab blocks still show their staff lines on one unbroken line that scrolls sideways.
