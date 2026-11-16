# Visual validation — Slash chords transpose their bass note

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-16T11:52:52Z
- Tooling: agent-browser 0.41.2

All rows run at a 375 × 812 viewport, signed in through the login form as `hugo` (row 10 as `lea` in the `phone` session). The chart under test was added to the seeded song Afterglow as its third chart ("Chords 2" in the chart switcher) with the text `[Am/E]One [D/F#]two [C6/9]three [G]four`. Chord values were read from the rendered `span.text-accent` chord tokens and the stepper value from the `Transpose` group, in the same eval as each screenshot.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 00 | How to reach it | Open a song in the catalog, add a chart with the ChordPro text option, paste the chart, open it. | Songs → Afterglow → More actions → Edit → Music → Add a chart → Paste text → fill → Save → Chords tab → "Chords 2" | `./visual-validation-2026-11-16-1149/00-chart-entered.png`; after save the chart renders `[Am/E]One [D/F#]two [C6/9]three [G]four` at `+0` | PASS |
| 01 | Assertion 1 | A song whose ChordPro chart holds `[Am/E]`, transposed up two semitones with the transpose stepper, shows `Bm/F#`. | Transpose up × 2 | `./visual-validation-2026-11-16-1149/01-up2-am-e-to-bm-fsharp.png`; stepper `+2`, chords `[Bm/F#] [E/G#] [D6/9] [A]` | PASS |
| 02 | Assertion 2 | The same chart holding `[D/F#]`, transposed down two semitones, shows `C/E`. | From `+0`, Transpose down × 2 | `./visual-validation-2026-11-16-1149/02-down2-d-fsharp-to-c-e.png`; stepper `-2`, chords `[Gm/D] [C/E] [A#6/9] [F]` | PASS |
| 03 | Assertion 3 | A part after the slash that is not a note stays as written. `[C6/9]` transposed up two semitones shows `D6/9`. | Same state as row 01 | `./visual-validation-2026-11-16-1149/01-up2-am-e-to-bm-fsharp.png`; third token `[D6/9]` at `+2`, and `[A#6/9]` at `-2` (row 02), the `/9` kept both ways | PASS |
| 04 | Assertion 4 | A chord without a slash transposes as before. `[G]` up two semitones shows `A`. | Same state as row 01 | `./visual-validation-2026-11-16-1149/01-up2-am-e-to-bm-fsharp.png`; fourth token `[A]` at `+2` | PASS |
| 05 | Assertion 5 | Back at zero semitones, every chord reads exactly as typed. | From `+2`, Transpose down × 2 | `./visual-validation-2026-11-16-1149/05-back-at-zero.png`; stepper `+0`, line text equals the typed `[Am/E]One [D/F#]two [C6/9]three [G]four` | PASS |
| 06 | Assertion 5 (edge) | Back at zero from a negative transposition, every chord reads as typed. | From `-2`, Transpose up × 2 | Deterministic: stepper `+0`, chords `[Am/E] [D/F#] [C6/9] [G]` | PASS |
| 07 | Assertion 5 + 4 (edge) | A chart with no slash chords still reads as typed at zero. | Switch to the seeded "Chords" chart at `+0` | Deterministic: all nine chord lines equal the seeded ChordPro source (`[G]After the last [Em]chord decays` …) | PASS |
| 08 | Assertion 1 (edge, full screen) | The full-screen chart view transposes the bass too. | Full screen → "Chords 2" → Transpose up × 2 | `./visual-validation-2026-11-16-1149/06-fullscreen-up2.png`; `[Bm/F#]One [E/G#]two [D6/9]three [A]four` | PASS |
| 09 | Edge, 375 px | The chart and the stepper fit at 375 px wide. | `set viewport 375 812`, measure page and full-screen view | Deterministic: `scrollWidth 375 = clientWidth 375` on the song page and the full-screen view; screenshots 01, 06 show no clipping | PASS |
| 10 | Edge, touch | Tapping the stepper on a phone transposes the slash chord. | `scripts/phone.sh touch 'button[aria-label="Transpose up"]'` × 2 | `./visual-validation-2026-11-16-1149/07-phone-tap-up2.png`; both taps `isRealTouch: true`, stepper `+2`, `[Bm/F#]One [E/G#]two [D6/9]three [A]four` | PASS |
| 11 | Edge, dark scheme | The transposed slash chords stay readable with `prefers-color-scheme: dark`. | `set media dark`, "Chords 2" at `-2` | `./visual-validation-2026-11-16-1149/08-dark-down2.png`; `[Gm/D]One [C/E]two [A#6/9]three [F]four` | PASS |

Every screenshot's broken-image scan returned `[]`. `agent-browser errors` returned nothing after the song-page run.

## Notes

- No FAIL or UNVERIFIABLE row.
- Observed, outside the spec's assertions: the label "Slash test" typed into the new chart's LABEL field (visible in screenshot 00) did not appear in the chart switcher after saving, which shows "Chords 2". Not verified whether the label was saved and the switcher ignores it, or it was not saved.
- Observed, outside the spec's assertions: transposing down spells accidentals as sharps (`[A#6/9]`, not `Bb6/9`). No assertion covers spelling.

## Verdict: PASS
