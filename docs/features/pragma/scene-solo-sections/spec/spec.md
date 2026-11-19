# A solo stands out in Scene Mode and carries its notes

## Why

The operator asked for solos to show as their own section in Scene Mode, and for a way to put comments on them.

On stage, a musician scans the chart for where the solo starts, who takes it and how long it lasts. Today a solo is written as `{comment: Solo}`, and every comment renders as one small, dim, italic line. The solo blends into the lyrics around it.

Evidence, measured on the production catalogue on 2026-11-19: 20 of 129 songs mention a solo in their charts. 14 of them write it as a `{comment: ...Solo...}` line followed by chord rows. No chart uses `{start_of_solo}`. No chart puts a second comment directly under a solo comment.

## Result

A solo renders as its own section under an outlined "Solo" badge, in Scene Mode and on the song page, since both use the same chart viewer. The operator asked for it to stand out a little less than a filled frame.

Every section of a chart alternates between the plain background and a slightly lighter one, starting with the second section, so the reader tells sections apart at a glance. The operator liked this on the solo and asked for it everywhere.

A row of chords between bar lines, such as `| [Dm] | [G] | x2`, keeps its chords on the same line as the bars. A line that holds chord names written without brackets and no lyric, such as `Am F#m Cmaj7 | x3`, draws those names in the chord colour.

The block holds the solo's chord rows. Notes on the solo, such as who plays it or how many rounds, render inside the block in full-strength text, not dim italic.

A member writes a solo in the chart text in one of two ways:

1. `{comment: Solo}` (or `{c: Outro solo}`, any comment containing the word "solo"), followed by the chord rows. Any `{comment: ...}` line written directly under it, before the first chord row, is a note on the solo.
2. `{start_of_solo}` ... `{end_of_solo}`, optionally labelled as `{start_of_solo: Guitar solo}`. Every `{comment: ...}` inside is a note.

## Where the implicit solo ends

The `{comment: Solo}` form has no end marker, so the block ends at the first of:

- any directive after the first chord row (another comment, a section start or end)
- a paragraph holding lyrics, after a blank line, even when the paragraph opens on a chords-only row. A lyric is a run of two letters or more outside chords and parentheses. Bar lines, `x3`, `(guitar)` and chord names written without brackets, such as `Am F#m Cmaj7`, are not lyrics.

The first paragraph after the heading always belongs to the solo, even when it is prose such as "Cm7 Fm7 then the bridge chords".

A solo drops its trailing blank lines, and every other section keeps its own as before.

A `{comment: Solo}` inside a chorus, verse, bridge or tab stays a plain comment line of that section.

## Swiping between songs

The operator asked to swipe between songs in Scene Mode.

- A swipe to the left on the chart opens the next song of the setlist, a swipe to the right the previous one, as the arrow keys and the transport buttons do.
- A swipe counts when it travels at least 64 px sideways and at least one and a half times as far sideways as down, so scrolling the chart never changes the song.
- A swipe that starts inside a tab block, which scrolls sideways itself, never changes the song.
- The first and last songs hold, as with the arrow keys.

## The transition to the next song

The operator asked to see transitions in Scene Mode, and picked mockup B opening into mockup A at the bottom of the chart.

- A one-line strip above the transport names the next song, its key and, when the gap is risky, the warn icon. Tapping it opens a popup over the chart with the lineup as icons and the full note. The operator found the first strip too large before the end of the chart.
- Each member who plays the next song shows as their avatar followed by instrument glyphs, never as words. A member who keeps an instrument shows the avatar and that glyph. A member who changes shows the avatar, the glyphs they keep, the glyphs they put down in a dimmer tone, an arrow, and the glyphs they pick up. A glyph held on both songs is never drawn on either side of the arrow. A member who joins shows the avatar, an arrow and the glyphs they pick up.
- When nobody keeps an instrument across the gap, as the setlist editor's risky flag says, the popup and the card show the warn icon and its "risky" label.
- Once the reader scrolls to the end of the chart, the popup's content shows as a card below the last line, and the strip hides. Moving to another song closes the popup. Scrolling back up shows the strip again.
- The last song of the setlist has no strip and no card.

## Out of scope

- Solos written as `[Solo]` or as a bare "Solo" line (6 songs, measured). They keep rendering as today. The member can rewrite them as `{comment: Solo}`.
- A member who plays the current song and not the next one shows nothing.
- Editing a transition note from Scene Mode. The note is written in the setlist editor.
- Editing a note from Scene Mode itself. Notes are written in the chart editor.
