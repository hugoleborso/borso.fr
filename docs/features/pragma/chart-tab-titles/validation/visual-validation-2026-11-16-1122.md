# Visual validation — Chart pills named in one word

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-16T11:26:30Z
- Tooling: agent-browser 0.41.2

Fixtures were five songs posted to `POST /api/songs` as `hugo` (PDF charts carry a fake `s3Key`, because no upload bucket runs under `pnpm dev`). Each label below was set on purpose so its absence from the pill is observable.

- VV A: ChordPro for Chant + Guitare, label "Version live". PDF for Basse, label "Tab basse".
- VV B: ChordPro for every instrument, no label. PDF for every instrument, label "Partition".
- VV C: three ChordPro charts for Basse, labels "Intro", "Outro" and none.
- VV D: ChordPro for Chant + Guitare + Clavier + Batterie + Chœurs, label "Accords complets version longue". ChordPro for Chant + Guitare + Basse, label "Autre".
- VV E: one ChordPro chart for Basse, label "Seul".

Pill texts were read from each `[role=tablist]` after the page's own Info / Chords / Takes tablist. Locale was switched with `localStorage['pragma.locale']`.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Assertions 1 | A song with a ChordPro chart for Chant and Guitare and a PDF chart for Basse shows two pills, "Chords" and "Basse" (English UI). | Open VV A `?tab=chords` at 1280 px, locale en | `./visual-validation-2026-11-16-1122/01-chordpro-and-bass-pdf-en.png`. Pills = `["Chords","Basse"]` | PASS |
| 02 | Assertions 2 | A song with two charts for every instrument, one ChordPro and one PDF, shows "Chords" and "Ensemble". | Open VV B `?tab=chords`, locale en | `./visual-validation-2026-11-16-1122/02-everyone-chordpro-and-pdf-en.png`. Pills = `["Chords","Ensemble"]` | PASS |
| 03 | Assertions 3 / Rule 3 | A song with two charts for the same single instrument shows its name, then its name followed by " 2" ("Basse", "Basse 2", "Basse 3"). | Open VV C `?tab=chords`, locale en | `./visual-validation-2026-11-16-1122/03-same-single-instrument-ranked-en.png`. Pills = `["Basse","Basse 2","Basse 3"]` | PASS |
| 04 | Rule 1 | A chart for exactly one instrument reads that instrument's name, such as "Basse". | Same as rows 01 and 03 | PDF Basse pill reads "Basse" (01). ChordPro Basse pills read "Basse" (03) | PASS |
| 05 | Rule 2 | Several or every instrument reads "Accords" in French, "Chords" in English for ChordPro, "Ensemble" in both languages for PDF or image. | Open VV A and VV B `?tab=chords`, locale fr | `./visual-validation-2026-11-16-1122/04-chordpro-and-bass-pdf-fr.png` pills = `Accords, Basse`. `./visual-validation-2026-11-16-1122/05-everyone-chordpro-and-pdf-fr.png` pills = `Accords, Ensemble`. English side in rows 01 and 02 | PASS |
| 06 | Rule 3 | A title already on an earlier pill gets its rank, also for the group title. | Open VV D `?tab=chords` at 375 px, locale en | `./visual-validation-2026-11-16-1122/09-375-two-multi-instrument-charts.png`. Pills = `Chords, Chords 2` | PASS |
| 07 | Rule 4 | The chart label no longer shows on the pill. It stays in the edit form. | Check pill text and `body.innerText` on VV A, B, C for every label. Open VV A `/edit`, Music tab | No label text anywhere on the Chords tab (`innerText.includes(...)` = false for all five labels). Edit form inputs hold `["Version live","Tab basse"]`, `./visual-validation-2026-11-16-1122/16-edit-form-keeps-labels.png` | PASS |
| 08 | Rule 5 | A song with one chart shows no switcher, as before. | Open VV E `?tab=chords`, locale fr | `./visual-validation-2026-11-16-1122/06-single-chart-no-switcher-fr.png`. Chart tablists after the page's own = `[]` | PASS |
| 09 | Assertions 4 | Every pill fits on one line at 375 px wide for a song with two charts. | `set viewport 375 812`, open VV A, B, D `?tab=chords`. Count the line boxes of each pill's text node, and compare the right edges with the tablist | `./visual-validation-2026-11-16-1122/07-375-chordpro-and-bass-pdf.png`, `./visual-validation-2026-11-16-1122/08-375-everyone-chordpro-and-pdf.png`, `./visual-validation-2026-11-16-1122/09-375-two-multi-instrument-charts.png`. Every pill = 1 line box, height 44 px. Last pill right edge at 203, 228 and 222 px, tablist right edge at 359 px. `documentElement.scrollWidth` = 375 | PASS |
| 10 | Assertions 4 (extra) | Three pills fit on one line at 375 px. | Open VV C at 375 px | `./visual-validation-2026-11-16-1122/10-375-three-bass-charts.png`. Each pill is 1 line, last right edge at 312 px, tablist edge at 359 px | PASS |
| 11 | Assertions 5 | The song scene (full screen) shows the same titles for its ChordPro charts. | Open `/catalog/<id>/scene` for VV D and VV C (en, 375 px) and for VV D, VV A and VV B (fr) | `./visual-validation-2026-11-16-1122/11-scene-375-two-multi-instrument-charts.png` = `Chords, Chords 2`. `./visual-validation-2026-11-16-1122/12-scene-375-three-bass-charts.png` = `Basse, Basse 2, Basse 3`. `./visual-validation-2026-11-16-1122/14-scene-fr-two-multi-instrument-charts.png` = `Accords, Accords 2`. Each matches the Chords tab. `./visual-validation-2026-11-16-1122/13-scene-fr-chordpro-and-bass-pdf.png` and `./visual-validation-2026-11-16-1122/15-scene-fr-everyone-chordpro-and-pdf.png` show one ChordPro chart and no switcher | PASS |
| 12 | Rule 2 | An image chart for several instruments reads "Ensemble" in both languages. | Not driven, see Notes | none | UNVERIFIABLE |

The broken-image scan returned `[]` after every screenshot. `agent-browser errors` reported no console errors.

## Notes

- Row 12, image kind. The rule says an image chart for several instruments reads "Ensemble". This run did not cover it. An image chart with a fake `s3Key` would render a broken `<img>` under `pnpm dev`, because no bucket runs locally, and that broken image would fail the mandatory pixel check for reasons that have nothing to do with the pill. The PDF branch of the same rule passed. Only the image branch is untested.
- The fixture songs VV A to VV E stay in the local dev database. The next `pnpm dev` reseeds it and removes them.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
