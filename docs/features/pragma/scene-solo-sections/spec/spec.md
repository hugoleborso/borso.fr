# A solo stands out in Scene Mode and carries its notes

## Why

The operator asked for solos to show as their own section in Scene Mode, and for a way to put comments on them.

On stage, a musician scans the chart for where the solo starts, who takes it and how long it lasts. Today a solo is written as `{comment: Solo}`, and every comment renders as one small, dim, italic line. The solo blends into the lyrics around it.

Evidence, measured on the production catalogue on 2026-11-19: 20 of 129 songs mention a solo in their charts. 14 of them write it as a `{comment: ...Solo...}` line followed by chord rows. No chart uses `{start_of_solo}`. No chart puts a second comment directly under a solo comment.

## Result

A solo renders as a framed block with a "Solo" badge, in Scene Mode and on the song page, since both use the same chart viewer.

The block holds the solo's chord rows. Notes on the solo, such as who plays it or how many rounds, render inside the block in full-strength text, not dim italic.

A member writes a solo in the chart text in one of two ways:

1. `{comment: Solo}` (or `{c: Outro solo}`, any comment containing the word "solo"), followed by the chord rows. Any `{comment: ...}` line written directly under it, before the first chord row, is a note on the solo.
2. `{start_of_solo}` ... `{end_of_solo}`, optionally labelled as `{start_of_solo: Guitar solo}`. Every `{comment: ...}` inside is a note.

## Where the implicit solo ends

The `{comment: Solo}` form has no end marker, so the block ends at the first of:

- any directive after the first chord row (another comment, a section start or end)
- a paragraph holding lyrics, after a blank line. A lyric is a run of two letters or more outside chords and parentheses. Bar lines, `x3` and `(guitar)` are not lyrics.

The first paragraph after the heading always belongs to the solo, even when it is prose such as "Cm7 Fm7 then the bridge chords".

A `{comment: Solo}` inside a chorus, verse, bridge or tab stays a plain comment line of that section.

## Out of scope

- Solos written as `[Solo]` or as a bare "Solo" line (6 songs, measured). They keep rendering as today. The member can rewrite them as `{comment: Solo}`.
- Editing a note from Scene Mode itself. Notes are written in the chart editor.
