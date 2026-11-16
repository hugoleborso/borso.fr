# Visual validation — The review fix that deleted the copy the cache read

- Spec: [`../../../../dantotsus/the-review-fix-that-deleted-the-copy-the-cache-read.md`](../../../../dantotsus/the-review-fix-that-deleted-the-copy-the-cache-read.md) (its User impact table, plus the four assertions in the validation brief; there is no feature spec)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-16T10:08:04Z
- Tooling: agent-browser 0.41.2

Setup: signed in as `lea`, viewport `375 × 812` (`window.innerWidth` read back as 375). The session was launched with an init script, kept in the scratchpad, that wraps `window.fetch` and delays every non-GET `/api/songs` request by 6 s (rows 01 to 02) or 10 s (rows 06 onward), logging each one in `window.__writes` with its body, status and timing. Song under test is "Slow Burn" (`0efb8bd1-…`). Chart 1 keeps its original ChordPro text, chart 2 was added as ChordPro. Both are assigned to Guitare only. The pill texts below are the `textContent` of the chart tabs (`[role=tab]`), read with `eval`. Every screenshot was followed by the broken-image scan, and every scan returned `[]`.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | User impact row 1 / brief 1 | Saving a song whose chart has no label, before the API answers, shows the pill "Guitare", not "Guitare · " | Edit Slow Burn: chart 1 is Guitare with an empty label, chart 2 is Guitare with " Solo ". Save with the PUT held for 6 s, open Chords | `./visual-validation-2026-11-16-1004/01-pill-blank-label-before-api.png`. `__writes` pending = 1 before and after the shot. PUT body labels `[null, "Solo"]`. Tabs `"Guitare"`, `"Guitare · Solo"` | PASS |
| 02 | Brief 1 | The same pill reads "Guitare" after the API answers | Read the tabs once the PUT returned (200, 6020 ms) | `./visual-validation-2026-11-16-1004/02-pills-after-api.png`. Tabs `"Guitare"`, `"Guitare · Solo"` | PASS |
| 03 | Brief 1, 2 | After a reload, the pills read "Guitare" and "Guitare · Solo" | `reload` on `?tab=chords` | `./visual-validation-2026-11-16-1004/03-pills-after-reload.png`. Snapshot tabs `"Guitare"` and `"Guitare · Solo"`. `GET /api/songs/<id>` labels `[null, "Solo"]` | PASS |
| 04 | Brief 2 | A label typed as " Solo " (`get value` shows ` Solo $`) shows as "Guitare · Solo" after the save | Same save as row 01 | Rows 01 to 03. Payload label `"Solo"`, with no surrounding spaces | PASS |
| 05 | Brief 4 | Reopening the edit form shows the trimmed label, and an empty field for a blank one | Open `/edit`, Music tab, `get value` on both LABEL fields | `./visual-validation-2026-11-16-1004/04-edit-form-trimmed-labels.png` (chart 2 = `Solo$`). `./visual-validation-2026-11-16-1004/05-edit-form-blank-label.png` (chart 1 = `$`, placeholder "Solo, intro…" visible) | PASS |
| 06 | Brief 3 | A label made only of spaces is saved as no label, and the pill reads "Guitare" before the API answers | Type `"   "` in chart 1's label (`get value` = `   $`), Save with the PUT held for 10 s, open Chords | `./visual-validation-2026-11-16-1004/06-pill-spaces-label-before-api.png`. Pending = 1 before and after the shot. Payload labels `[null, "Solo"]`. Tabs `"Guitare"`, `"Guitare · Solo"` | PASS |
| 07 | Brief 3 | The same spaces-only label after the API answers and after a reload | Wait for the 200, then `reload` | `./visual-validation-2026-11-16-1004/07-pill-spaces-label-after-reload.png`. Tabs `"Guitare"`, `"Guitare · Solo"` both times | PASS |
| 08 | Brief 4 | Reopening the form after the spaces-only save shows an empty field | Open `/edit`, Music tab, read both label inputs | Deterministic check. Values `""` and `"Riff"` (after row 10's save) | PASS |
| 09 | Countermeasure (API calls `normalizeChartLabel`) | The API stores a blank or padded label normalised even when the site's normalisation is bypassed | Send a raw `PUT /api/songs/<id>` from the page with labels `"   "` and `"  Solo  "`, then GET | Deterministic check. Status 200. Stored labels `[null, "Solo"]` | PASS |
| 10 | User impact row 2 | The same save while offline shows "Guitare", not "Guitare · " | `set offline on` (`navigator.onLine` = false). Chart 1 blank, chart 2 `"  Riff  "`. Save, open Chords | `./visual-validation-2026-11-16-1004/09-pills-offline-save.png`. Tabs `"Guitare"`, `"Guitare · Riff"`. No request left the page while offline (`__writes` = `[]`) | PASS |
| 11 | User impact row 2 | After reconnecting, the queued save is sent and the pills stay correct after a reload | `set offline off`, wait 3 s, `reload` | `./visual-validation-2026-11-16-1004/10-pills-after-reconnect-reload.png`. The queued PUT was sent with labels `[null, "Riff"]` and answered 200. Tabs `"Guitare"`, `"Guitare · Riff"` | PASS |
| 12 | Brief 1, create path (POST) | A new song with two Guitare charts, one blank and one " Solo ", shows "Guitare" and "Guitare · Solo" | `/catalog/new` "Label Probe", two charts, Save with the POST held for 10 s, then Chords, then `reload` | `./visual-validation-2026-11-16-1004/08-created-song-pills-after-api.png`. POST labels `[null, "Solo"]`, status 201. Tabs `"Guitare"`, `"Guitare · Solo"` after the API answered and after the reload | PASS |

## Notes

- Row 12 checks the pill on the create path only after the API answered. The create form stays on `/catalog/new` with Save disabled until the POST returns, so no pill can be seen before then. The POST body already carried `label: null`, and that body is what the optimistic cache stores.
- This run left a song titled "Label Probe" in the local dev database. Slow Burn now has a second Guitare chart, and its labels are `null` and "Riff". Both are local seed data only.

## Verdict: PASS
