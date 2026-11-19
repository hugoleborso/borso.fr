# Visual validation — Scene preferences and stage status bar

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-19T08:28:15Z
- Tooling: agent-browser 0.41.2

Signed in as `hugo`. Setlist "Set principal" (`af333805-…`), song 1 "Slow Burn" (`208463e0-…`), song 2 "Midnight Drive". Every screenshot passed the broken-image scan with an empty result.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Assertion 1 | While a setlist scene is open, every `meta[name="theme-color"]` holds the stage background colour, `rgb(13, 10, 7)` | Open `/setlists/<id>/scene`, read every theme-color meta, read the computed background of the scene `<dialog>` | `./visual-validation-2026-11-19-0825/01-setlist-scene-theme-color.png`. Both metas (light and dark media) = `rgb(13, 10, 7)`. Scene dialog background = `rgb(13, 10, 7)` | PASS |
| 02 | Assertion 1 | Same, in a song scene | Open `/catalog/<songId>/scene`, read metas | `./visual-validation-2026-11-19-0825/07-song-scene-carried-prefs.png`. Both metas = `rgb(13, 10, 7)` | PASS |
| 03 | Assertion 1 | Same, with `prefers-color-scheme: dark` | `set media dark`, open setlist scene, read metas | `matchMedia(dark)=true`, both metas = `rgb(13, 10, 7)` | PASS |
| 04 | Assertion 2 | Leaving the setlist scene restores `#f5f1e8` (light) and `#16130f` (dark) | Click "Leave", read metas on the setlist page | `./visual-validation-2026-11-19-0825/06-after-leave-paper.png`. Metas = `[light #f5f1e8, dark #16130f]` | PASS |
| 05 | Assertion 2 | Leaving the song scene restores the paper colours | Click "Back" in the song scene; separately, browser history back from the scene | `./visual-validation-2026-11-19-0825/08-song-scene-back-paper.png`. Both exits give `[light #f5f1e8, dark #16130f]` | PASS |
| 06 | Assertion 2 | Restore holds under `prefers-color-scheme: dark` | Dark media, enter then leave setlist scene | `./visual-validation-2026-11-19-0825/09-dark-after-leave.png`. Metas = `[light #f5f1e8, dark #16130f]` | PASS |
| 07 | Assertion 3 | Zoom and scroll speed chosen in a scene are shown again in another scene | Setlist scene: Zoom in x2 (chart text 24 to 28 px), Scroll faster x2 (30 to 50). Move to song 2, then open the song scene for Slow Burn | `./visual-validation-2026-11-19-0825/02-song1-zoomed-speed50-transpose-plus2.png`, `./visual-validation-2026-11-19-0825/03-song2-transpose-zero.png`, `./visual-validation-2026-11-19-0825/07-song-scene-carried-prefs.png`. Song 2 and the song scene show speed `50` and chart text at 28 px | PASS |
| 08 | Assertion 3 | Zoom and scroll speed survive a reload | Reload the setlist scene; in the song scene, Zoom out x2 then reload | `./visual-validation-2026-11-19-0825/05-after-reload-song1.png`. After reload speed `50`, chart text 28 px. Song scene after zoom out and reload: chart text 24 px, kept | PASS |
| 09 | Assertion 4 | Setlist scene: song 1 transposed to +2, song 2 shows +0 | Transpose up x2 on Slow Burn, click "02 Midnight Drive" | `./visual-validation-2026-11-19-0825/03-song2-transpose-zero.png`. Label `+0`, chords in C | PASS |
| 10 | Assertion 4 | Back on song 1 shows +2 | Click "01 Slow Burn" | `./visual-validation-2026-11-19-0825/04-back-to-song1-plus2.png`. Label `+2` | PASS |
| 11 | Assertion 4 | Per-song transposition survives a reload | Reload the setlist scene, read song 1 then song 2 | `./visual-validation-2026-11-19-0825/05-after-reload-song1.png`. Song 1 `+2`, chords Am F C G rendered as Bm G D A. Song 2 `+0` | PASS |
| 12 | Assertion 5 | The setlist scene works at 375 px wide | Viewport 375x812, open setlist scene, check document scrollWidth, scroll the chart | `./visual-validation-2026-11-19-0825/10-setlist-scene-375.png`, `./visual-validation-2026-11-19-0825/11-setlist-scene-375-lyrics.png`. scrollWidth = 375. Controls wrap under the title. Chart lines wrap with chords kept above their syllables | PASS |
| 13 | Assertion 5 | The song scene works at 375 px wide, by touch | Viewport 375x812, open song scene. `scripts/phone.sh touch '[aria-label="Zoom in"]'` in a fresh phone profile | `./visual-validation-2026-11-19-0825/12-song-scene-375.png`, `./visual-validation-2026-11-19-0825/13-phone-tap-zoom-in.png`. scrollWidth = 375. Real touch reached the target (`isRealTouch: true`). Chart text 24 to 26 px, stored | PASS |

## Notes

- No FAIL or UNVERIFIABLE rows.
- Row 13 ran in a separate browser profile with empty storage. The chart text started there at 24 px, the default, which is evidence that the persisted 28 px in rows 07 and 08 came from storage, not from a default.
- The 375 px overflow scan found 4 px differences between scrollWidth and clientWidth on the scene control buttons (40 vs 36). The document did not scroll horizontally and nothing was cut off in the screenshots. These look like the buttons' enlarged hit areas, not overflow.
- Assertion 1 compares the meta to the stage background. The scene `<dialog>` computes `rgb(13, 10, 7)`. The `<body>` under it stays at paper `rgb(245, 241, 232)`, which the scene covers fully.

## Verdict: PASS
