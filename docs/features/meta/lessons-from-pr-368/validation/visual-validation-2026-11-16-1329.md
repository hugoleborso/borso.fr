# Visual validation — Every transpose tap counts

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-16T13:32:48Z
- Tooling: agent-browser 0.41.2

Setup: signed in as `hugo` through the login form (sets the cookie and the `pragma.session-seen` marker). Song "Last Call" (ChordPro chart in F, first chords `F Dm Bb C`) resolved through `GET /api/songs`. Setlist "Set principal" (first song "Slow Burn", first chords `Am F C G`) resolved through `GET /api/setlists`. Every double-click case starts from a fresh page load reading `+0`. The stepper value and the first four `[data-chord]` attributes were read with `agent-browser eval` before and after each action. The pixel-content scan returned `[]` after every screenshot.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Assertion 1 | On a song's chord chart, two clicks on *Transpose up* dispatched in one script move the stepper from `+0` to `+2`, and the chords move two semitones. | Open `/catalog/<Last Call>?tab=chords` at 1280 px, `b.click(); b.click();` on `button[aria-label="Transpose up"]` in one eval | `./visual-validation-2026-11-16-1329/00-chords-tab-before.png` (`+0`, `F Dm Bb C`) then `./visual-validation-2026-11-16-1329/01-double-click-up.png` (`+2`, `G Em C D`, key line shows `G`) | PASS |
| 02 | Assertion 2 | Two clicks on *Transpose down* dispatched in one script move it from `+0` to `-2`. | Reload the chords tab, two clicks on `Transpose down` in one eval | `./visual-validation-2026-11-16-1329/02-double-click-down.png` (`-2`, chords `D# Cm G# A#`, two semitones below `F Dm Bb C`) | PASS |
| 03 | Assertion 3 | One tap at a time still moves it one step each, up and down, on a phone at 375 px wide. | `scripts/phone.sh start`, sign in, open chords tab, `scripts/phone.sh touch` on up, up, down, down, down (each exit 0, `isRealTouch: true`, coarse pointer, innerWidth 375) | Readout sequence `+0 → +1 → +2 → +1 → +0 → -1`, chords `F → F# → G → F# → F → E`; `./visual-validation-2026-11-16-1329/03-phone-taps-chords-tab.png`; scrollWidth 375 = innerWidth | PASS |
| 04 | Assertion 4 (song scene, double click up) | The same holds in the full-screen chart view of a song. | Open `/catalog/<Last Call>/scene` at 1280 px, two clicks on `Transpose up` in one eval | `./visual-validation-2026-11-16-1329/04-song-scene-double-up.png` (`+2`, `G Em C D`) | PASS |
| 05 | Assertion 4 (song scene, double click down) | Same, *Transpose down*. | Reload the song scene, two clicks on `Transpose down` in one eval | `./visual-validation-2026-11-16-1329/05-song-scene-double-down.png` (`-2`, `D# Cm G# A#`) | PASS |
| 06 | Assertion 4 (setlist scene, double click up) | The same holds in the full-screen chart view of a setlist. | Open `/setlists/<Set principal>/scene` at 1280 px, two clicks on `Transpose up` in one eval | `./visual-validation-2026-11-16-1329/06-setlist-scene-double-up.png` (`+2`, `Am F C G` → `Bm G D A`) | PASS |
| 07 | Assertion 4 (setlist scene, double click down) | Same, *Transpose down*. | Reload the setlist scene, two clicks on `Transpose down` in one eval | `./visual-validation-2026-11-16-1329/07-setlist-scene-double-down.png` (`-2`, `Gm D# A# F`) | PASS |
| 08 | Assertion 4 × 3 (song scene, phone taps) | One tap at a time moves one step each, up and down, at 375 px, in the song full-screen view. | Phone session at 375 × 812, `scripts/phone.sh touch` up, up, down, down, down (each `isRealTouch: true`, exit 0) | Readout `+0 → +1 → +2 → +1 → +0 → -1`, chords `F → F# → G → F# → F → E`; `./visual-validation-2026-11-16-1329/08-phone-song-scene-taps.png`; scrollWidth 375 | PASS |
| 09 | Assertion 4 × 3 (setlist scene, phone taps) | Same, in the setlist full-screen view. | Phone session at 375 × 812, same five taps | Readout `+0 → +1 → +2 → +1 → +0 → -1`, chords `Am → A#m → Bm → A#m → Am → G#m`; `./visual-validation-2026-11-16-1329/09-phone-setlist-scene-taps.png`; scrollWidth 375 | PASS |
| 10 | Edge (premise) | Every tap counts, beyond two: five clicks in one script. | Reload the chords tab, five clicks on `Transpose up` in one eval | Deterministic: readout `+5`, chords `A# Gm D# F` (F + 5 = Bb) | PASS |
| 11 | Edge (premise) | Mixed directions in one script each count. | Reload the chords tab, `up, up, down` in one eval | `./visual-validation-2026-11-16-1329/10-mixed-up-up-down.png` (`+1`, `F# D#m B C#`) | PASS |

## Notes

- No FAIL or UNVERIFIABLE rows.
- Observation, not a spec claim. Downward transpositions spell chords with sharps (`F` − 2 renders `D#`, not `Eb`). The spec says only that the chords move two semitones, which they do. `agent-browser errors` reported nothing after any run.

## Verdict: PASS
