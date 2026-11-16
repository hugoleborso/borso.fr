# Slash chords transpose their bass note

A musician who transposes a ChordPro chart in Pragma expects every note of a chord to move, the bass after the slash included. Before this change `[Am/E]` transposed up two semitones read `Bm/E`. The root moved and the bass did not.

## Assertions

1. A song whose ChordPro chart holds `[Am/E]`, transposed up two semitones with the transpose stepper, shows `Bm/F#`.
2. The same chart holding `[D/F#]`, transposed down two semitones, shows `C/E`.
3. A part after the slash that is not a note stays as written. `[C6/9]` transposed up two semitones shows `D6/9`.
4. A chord without a slash transposes as before. `[G]` up two semitones shows `A`.
5. Back at zero semitones, every chord reads exactly as typed.

## How to reach it

Sign in with the seeded account `pnpm dev` prints. Open a song in the catalog, add a chart with the ChordPro text option, and paste a chart such as:

```
[Am/E]One [D/F#]two [C6/9]three [G]four
```

Then open the chart and use the transpose stepper.
