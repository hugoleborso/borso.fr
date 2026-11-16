# Every transpose tap counts

A musician who taps the transpose stepper expects each tap to move the chart one semitone. Before this change, two taps that landed before the page rendered moved it by one.

## Assertions

1. On a song's chord chart, two clicks on *Transpose up* dispatched in one script move the stepper from `+0` to `+2`, and the chords move two semitones.
2. Two clicks on *Transpose down* dispatched in one script move it from `+0` to `-2`.
3. One tap at a time still moves it one step each, up and down, on a phone at 375 px wide.
4. The same holds in the full-screen chart view of a song and of a setlist.

## How to reach it

Sign in with the seeded account the dev server prints. Open a song with a ChordPro chart in the catalog, then its chords tab. Dispatch two clicks in one `agent-browser eval`, for example `const b = document.querySelector('button[aria-label="Transpose up"]'); b.click(); b.click();`.
