# Visual validation — Each member logs the songs they studied, keeps a streak, and sees whether the band is ready for the next concert

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-10-12T01:56:57Z – 2026-10-12T02:09:08Z, on `ed23183` (includes `9f5a5b1`)
- Tooling: agent-browser 0.35.2 (`scripts/browser.sh`), used for every row except 16 and 18. Those two use argent (`scripts/argent.sh`) for real touch input.

The database was reset with `POST /api/__test/seed` at the start and again at the end. Fixtures for the edge cases were written through the app's own API from the signed-in session: other members' scores, extra concerts and setlists, and a member default. Rows 30 and 31 changed the data on purpose, by deleting a song and a member. Every screenshot was followed by the broken-image scan, and every scan returned `[]`. `scrollWidth` equalled `innerWidth` on every agent-browser screenshot.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result | A new **Studies** tab (`/studies`) in the app shell, built for a 375 px screen first | Sign in as hugo, open `/studies` at 375×812 | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-12-0156/01-initial-375.png`; bottom nav shows "Studies"; `scrollWidth 375 = innerWidth 375` | PASS |
| 02 | Result | Labelled *Révisions* in French | Click FR in the 1280 px sidebar | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-12-0156/15-fr-revisions.png`: the nav item and the h1 both read "Révisions" | PASS |
| 03 | Result | Sections: my streak, to study, band, concert readiness | Read the page at 375 px | `01-…`: the streak, then "To study for the next concert", "The band", "Next concert" | PASS |
| 04 | Result 1 | My streak shows the day count, whether today is counted, and whether the joker is available | Read the header before and after a study | `01-…` "0 day streak · today not yet · joker available"; `https://screenshots-pr-<n>.preview.borso.fr/2026-10-12-0156/03-after-studied-lightning.png` "1 day streak · today counted · joker available" | PASS |
| 05 | Result 2 | To study lists the next concert's setlist songs where I hold an instrument; each row shows the song, my instrument, my score and a **Studied** button | Read hugo's list | `01-…`: 9 rows covering all 6 setlist songs, each with a title, an instrument, a score ("—" when unscored) and "Studied" | PASS |
| 06 | Result 2 | Not-ready songs first, then by my lowest effective mastery | Hugo overrides at 3, 6 and 8, a Batterie default of 4 and an earlier 1; reload | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-12-0156/11-queue-ordering.png`: the order is —, 1, 3, 4, 4, 4, 6, 8, then the ready row (7) last | PASS |
| 07 | Result 2 | Tapping **Studied** logs today's study and opens an inline 0 to 10 stepper, which I can skip | No stepper before the tap; tap Studied on Lightning / Batterie | `01-…` shows no stepper; in `03-…` a −/+ stepper opens on that row with the score left at "—" | PASS |
| 08 | Result 2 | A study logged today shows as done and can be undone | Same tap | `03-…`: the row is highlighted and reads "✓ Undo" | PASS |
| 09 | Result 3 | Band: one line per member with their colour, their streak and their studies this week | Read the band section, then log and undo without reloading | `01-…` shows four members with coloured dots. After a tap Hugo reads "1 study this week" with streak 1 (`03-…`). After a study and an undo the screen reads "1 study this week" and the API returns `studiesThisWeek: 1` (`https://screenshots-pr-<n>.preview.borso.fr/2026-10-12-0156/10-undo-keeps-score.png`). For léa, a study makes it 1 and the undo brings it back to 0 (`08-…`, `09-…`) | PASS |
| 10 | Result 4 | Concert readiness: *n of N songs ready*, with the date and the not-ready songs under the bar | Read the section | `01-…` "0 of 6 songs ready · Mon, Oct 19, 2026 · Le Petit Bain" with six chips; `https://screenshots-pr-<n>.preview.borso.fr/2026-10-12-0156/05-score-7-ready.png` "1 of 6", with the Lightning chip gone | PASS |
| 11 | Result 5 | The next concert has no setlist: section 2 lists every catalogue song I hold, by lowest mastery; section 4 becomes one line saying no concert is planned | Create a concert on Oct 14 (before the seeded one) with no setlist; reload | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-12-0156/18-next-concert-has-no-setlist.png`: heading "My least mastered songs", all 6 songs ordered —, 1, 3, 4, 4, 4, 6, 7, 8, then "No concert planned." | PASS |
| 12 | Result 5 | No upcoming concert: the same fallback | Delete both future concerts, keeping a past concert with a setlist and a concert 2 minutes in the past; reload | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-12-0156/20-no-upcoming-concert.png`: the same fallback and "No concert planned." | PASS |
| 13 | Result | The song detail page gains a **progress** chart: one line per member and instrument, drawn from the mastery history | Open `/catalog/<Lightning>` after the score changes | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-12-0156/17-song-detail-progress-chart.png`: three series (Léa · Chant, Sarah · Chant, Hugo · Batterie); Hugo's rises over 7 points | PASS |
| 14 | Happy path 1 | A signed-in member opens the tab and sees their streak, their songs to study, the band's streaks and the readiness bar | Sign in as hugo, open `/studies` | `01-…` | PASS |
| 15 | Happy path 2 | They tap **Studied** on a not-ready song: the row shows as done and the streak includes today | Tap Studied on Lightning / Batterie (not ready) | `03-…`: Undo state, "1 day streak · today counted" | PASS |
| 16 | Happy path 2 (touch) | The same tap with a thumb at 375 px | argent `tap` on Studied, then on Undo, with a 375 px viewport and `pointer: coarse` held over CDP (see Notes) | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-12-0156/13-argent-375-coarse-stepper-eight-taps.png`; `describe` after each tap shows Undo, then Studied again on the same row | PASS |
| 17 | Happy path 3 | Raise my score from 5 to 7; if the lineup mean reaches 7, the song moves to ready and the bar gains one | Léa and Sarah at 7 on Lightning; hugo steps his score to 5, then to 7 | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-12-0156/04-score-5-not-ready.png` "0 of 6", not ready; `05-…` "· ready" and "1 of 6 songs ready" | PASS |
| 18 | Happy path 3 (touch) | Adjust my score with the stepper by thumb at 375 px | argent: 3 taps on "+" for Afterglow / Clavier at 500 px, then 8 taps at one fixed point for Afterglow / Chant at 375 px coarse | The rows read 3 and 8, and neither moved (`12-argent-thumb-studied-and-stepper.png`, `13-…`); Sarah's history holds exactly 1–3 for Clavier and 1–8 for Chant on Afterglow, and nothing on any other song | PASS |
| 19 | Happy path 4 | Another member opening the tab sees the new streak and the moved bar | Sign in as léa in a second session | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-12-0156/07-lea-sees-hugo-streak-and-bar.png`: Hugo has streak 1 and "1 study this week"; "1 of 6 songs ready" | PASS |
| 20 | Edge | A second tap on the same song and instrument on the same day changes nothing | The UI replaces Studied with Undo; POST `/api/studies` again for the same pair | 201 with the same `studiedOn: 2026-10-12`; `studiesThisWeek` stays 1 | PASS |
| 21 | Edge | A member holding two instruments on a song sees two rows | Read hugo's list | `01-…`: Afterglow, Last Call and Slow Burn each appear once as Chant and once as Batterie | PASS |
| 22 | Edge | Streak rule: one missed day per rolling 7 days is forgiven (the joker); a second miss ends the streak; today never breaks it early | — | Needs studies on past days, and none can be created | UNVERIFIABLE |
| 23 | Edge | The day boundary is midnight `Europe/Paris`, whatever the device time zone | Start a session with `TZ=America/Los_Angeles` (device date Oct 11, 19:08) and log a study as marc | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-12-0156/21-device-tz-los-angeles.png`; server `today = 2026-10-12`, "today counted" | UNVERIFIABLE |
| 24 | Edge | No back-dating: the server stamps the day, and the body carries no date | POST with `studiedOn: '2026-10-01'` | `400 unrecognized_keys ["studiedOn"]` | PASS |
| 25 | Edge | Undo deletes only a study of mine logged today; undoing the only study of today leaves today uncounted | léa: Studied, reload, Undo; hugo: DELETE léa's pair | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-12-0156/08-lea-studied.png` → `https://screenshots-pr-<n>.preview.borso.fr/2026-10-12-0156/09-lea-undo-today-uncounted.png` "0 day streak · today not yet"; hugo's DELETE returns `404 study-not-found` and léa's study survives it | PASS |
| 26 | Edge | Undo refuses yesterday's study | — | Needs a study dated yesterday, and none can be created | UNVERIFIABLE |
| 27 | Edge | Ready means every lineup player has a score and the mean is ≥ 7; one unscored player blocks it | Lightning with Léa 7, Sarah 7 and hugo unscored; then hugo 5; then hugo 7 | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-12-0156/02-silent-player-not-ready.png` not ready; `04-…` not ready (mean 6.3); `05-…` ready (mean 7) | PASS |
| 28 | Edge | The next concert is the earliest strictly after now; readiness is the union of its setlists, each song counted once | A concert yesterday (setlist: Runaway Sun) and one on Oct 14 with setlists {Lightning, Slow Burn} and {Slow Burn, Afterglow}; later a concert 2 minutes in the past with a setlist | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-12-0156/19-union-of-two-setlists-past-ignored.png`: "1 of 3 songs ready · Wed, Oct 14, 2026 · Empty Venue"; the concert 2 minutes in the past is ignored too (row 12) | PASS |
| 29 | Edge | A mastery default change writes no history row | PUT a Batterie default for hugo; count history rows on three songs before and after | 9 / 1 / 0, then 9 / 1 / 0 afterwards; the queue picks the default up (row 06) | PASS |
| 30 | Edge | Deleting a song deletes its studies and history rows | Log a study on Midnight Drive (1 history row), then DELETE the song | History becomes `{"changes":[]}`; hugo's `studiesThisWeek` goes 2 → 1 | PASS |
| 31 | Edge | Deleting a member deletes their history rows | DELETE sarah; read Afterglow's history | Sarah's rows go 11 → 0, and the other member's row stays | PASS |
| 32 | Edge | Deleting a member deletes their studies | DELETE sarah | No reader exposes a deleted member's studies | UNVERIFIABLE |
| 33 | Error | `study-not-in-lineup` → 422 | POST Lightning / Chant as hugo, who plays Batterie on it | `422 {"error":"study-not-in-lineup"}` | PASS |
| 34 | Error | `study-not-found` when undoing a study that is not mine or not today's → 404 | DELETE a pair hugo never logged; DELETE léa's pair as hugo | `404 {"error":"study-not-found"}` both times | PASS |
| 35 | Error | `song-not-found` → 404 | POST with an unknown songId | `404 {"error":"song-not-found"}` | PASS |
| 36 | Error | `instrument-not-found` → 404 | POST Lightning with an unknown instrumentId | `404 {"error":"instrument-not-found"}` | PASS |
| 37 | Q.O.D. | Back-dating: today only | See rows 20 and 24 | Rows 20 and 24 | PASS |
| 38 | Q.O.D. | Undo does not revert a score changed during the study | Studied on Afterglow / Batterie, score to 1, Undo; with argent, Afterglow / Chant to 8, then Undo | `10-…`: the row is back to "Studied" with score 1; API `score: 1, isStudiedToday: false`; the argent `describe` shows 8 kept after Undo | PASS |
| 39 | Q.O.D. | Visibility: all to all | léa sees hugo's streak and count | `07-…` | PASS |
| 40 | Q.O.D. | Mastery history comes from every override write, including the Studies tab | Step Lightning from 1 to 7 in the tab | `/api/mastery/history` holds one row per step for hugo (1…7) | PASS |
| 41 | Category | 1280 px renders without layout breakage | Set the viewport to 1280×900 | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-12-0156/14-studies-1280.png`; `scrollWidth 1280` | PASS |
| 42 | Category | `prefers-color-scheme: dark` | `set media dark`, reload at 375 px | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-12-0156/16-dark-375.png`: readable, with no light blocks | PASS |

## Notes

- **16 / 18 (touch, argent)**: `scripts/argent.sh` asks for a 375 px window, but headless Chromium gave the page `innerWidth 500` with `pointer: coarse` false.
  - The first argent pass in row 18 (3 taps on Afterglow / Clavier, `12-…`) therefore ran at 500 px.
  - For the passes that count, I held `Emulation.setDeviceMetricsOverride` at 375×667 (mobile) and `setTouchEmulationEnabled` open over CDP. With that hold, `innerWidth 375`, `pointer: coarse` true and `scrollWidth 375` were confirmed before tapping.
  - At 375 px, eight thumb taps at one fixed point on "+" took Afterglow / Chant from — to 8. The row did not move, and no other song received a write.
  - The previous run's FAIL, a row re-sorting out from under the thumb, does not reproduce.
- **22 / 26 (UNVERIFIABLE)**: The joker, the second-miss rule, "today never breaks the streak" and refusing yesterday's undo all need study rows on earlier days. The API refuses a date (row 24), and this run had no control over the database or the server clock.
- **23 (UNVERIFIABLE)**: The run shows the device time zone does not matter. A Los Angeles device whose date was still Oct 11 got its study stamped 2026-10-12. It does not show the Paris-midnight boundary itself: the run took place at about 02:00 UTC (04:00 Paris), when Paris and UTC give the same date, so a day cut at UTC midnight would look the same. Telling them apart needs a run between 22:00 and 24:00 UTC, or control of the clock.
- **32 (UNVERIFIABLE)**: Once a member is deleted, nothing on screen or in the API lists their studies, so their removal cannot be observed from outside.
- **Row 09, previously FAIL**: the weekly study count now follows my own writes without a reload: +1 on a study and −1 on an undo, matching `/api/studies/overview` each time.
- **Observations outside the spec** (not counted in the verdict):
  - The progress chart repeats `id="pragma-sparkline-grad"` once per series, so every area fill takes the first series' colour. In `17-…` Sarah's gold line and Hugo's red line both sit over a green fill.
  - A series with a single point is drawn as a triangle across the full width.
  - `id="study-row"`, `id="study-score"` and `id="streak-badge"` repeat on every row.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
