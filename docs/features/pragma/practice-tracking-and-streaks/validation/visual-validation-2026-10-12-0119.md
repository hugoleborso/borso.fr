# Visual validation — Each member logs the songs they studied, keeps a streak, and sees whether the band is ready for the next concert

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-10-12T01:20:00Z – 2026-10-12T01:45:00Z
- Tooling: agent-browser 0.35.2 (`scripts/browser.sh`); argent via `scripts/argent.sh` for the touch rows (16, 18)

**The code changed during this run.** Commit `b9316ca` ("close the gaps the technical validation found", 01:37 UTC) changed `StudyRow.tsx` and `StudiesPage.tsx`, the studies controller and service, and the instruments service. The dev API restarted at 01:35:46. Rows 03, 07, 09, 15, 17, 18 and 38 were taken again on `b9316ca`, as files `20-…` to `25-…`; their verdicts are the re-run's. The API rows 20, 24, 25, 27, 29 and 33–36 were also re-run on `b9316ca` through the browser session, with the same results except row 36. Rows 11, 12 and 28 (concert fallback and union) and 30–31 (delete cascades) ran between 01:30 and 01:34, on `2ccb4a6`. `b9316ca` does not touch the readiness rule or the delete paths. It only reordered the band and concert sections, which those screenshots show in the old order.

The database was reset with `POST /api/__test/seed` at the start, before the re-run and at the end. Fixtures for the edge cases were written through the app's own API from the signed-in session: other members' scores, extra concerts and setlists, a member default. Every screenshot was followed by the broken-image scan, and every scan returned `[]`.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result | A new **Studies** tab (`/studies`) in the app shell, built for a 375 px screen first | Sign in as hugo, open `/studies` at 375×812, measure `scrollWidth` | `./visual-validation-2026-10-12-0119/20-rerun-initial-375.png`; bottom nav has "Studies"; `scrollWidth 375 = innerWidth 375` | PASS |
| 02 | Result | The tab is labelled *Révisions* in French | Switch to FR in the 1280 px sidebar | `./visual-validation-2026-10-12-0119/10-fr-revisions-tab.png`: nav item and page title read "Révisions" | PASS |
| 03 | Result | Sections in order: my streak, to study, band, concert readiness | Read the section order at 375 px (re-run) | `20-rerun-initial-375.png`: streak, to study, The band, Next concert | PASS |
| 04 | Result 1 | My streak shows the day count, whether today is counted, and whether the joker is available | Read the header before and after a study | `20-…` "0 day streak · today not yet · joker available"; `./visual-validation-2026-10-12-0119/21-rerun-after-studied-stepper-opens.png` "1 day streak · today counted · joker available" | PASS |
| 05 | Result 2 | To study lists the next concert's setlist songs where I hold an instrument; each row has song, instrument, score and a **Studied** button | Read hugo's list | `20-…`: 9 rows over the 6 setlist songs, each with title, instrument, score ("—" when unscored) and "Studied" | PASS |
| 06 | Result 2 | Not-ready songs first, then by my lowest effective mastery | Hugo overrides at 3/6/8 and a Batterie default of 4, reload | `./visual-validation-2026-10-12-0119/08-queue-ordering.png`; order: unscored, 3, 4, 4, 4, 6, 8, then the ready row (7) last. Re-run order on `b9316ca`: unscored, 1, ready | PASS |
| 07 | Result 2 | Tapping **Studied** logs today's study and opens an inline 0 to 10 stepper, which I can skip | Re-run: no stepper before the tap; tap Studied; step past 10 and below 0 | `20-…` no stepper; `21-…` stepper opens on the studied row, score left at "—"; clamps at 10 and 0 | PASS |
| 08 | Result 2 | A study logged today shows as done and can be undone | Tap Studied on Lightning / Batterie | `21-…`: row highlighted, "✓ Undo" | PASS |
| 09 | Result 3 | Band: one line per member with their colour, their streak and their studies this week | Read the band; log and undo studies without reloading | `20-…` four members with coloured dots. After the tap: "0 studies this week" next to streak 1 (`21-…`). After an undo: "2 studies this week" while the API returns 1 (`./visual-validation-2026-10-12-0119/25-rerun-undo-keeps-score.png`) | FAIL |
| 10 | Result 4 | Concert readiness: *n of N songs ready*, with the date and the not-ready songs under the bar | Read the section | `20-…` "0 of 6 songs ready · Mon, Oct 19, 2026 · Le Petit Bain" with six chips; `./visual-validation-2026-10-12-0119/23-rerun-score-7-ready.png` "1 of 6", Lightning chip gone | PASS |
| 11 | Result 5 | Next concert has no setlist: section 2 lists every catalogue song I hold, by lowest mastery; section 4 is one line saying no concert is planned | Create a concert with no setlist, 2 days out (before the seeded one), reload | `./visual-validation-2026-10-12-0119/14-next-concert-has-no-setlist.png`: heading "My least mastered songs", rows by score, "No concert planned." | PASS |
| 12 | Result 5 | No upcoming concert: the same fallback | Delete both future concerts (a past concert with a setlist remains), reload | `./visual-validation-2026-10-12-0119/16-no-upcoming-concert.png`: same fallback, "No concert planned." | PASS |
| 13 | Result | Song detail gains a **progress** chart: one line per member and instrument, from the mastery history | Open `/catalog/<Lightning>` after the score changes, scroll to Progress | `./visual-validation-2026-10-12-0119/13-song-detail-progress-chart.png`: three series (Léa · Chant, Sarah · Chant, Hugo · Batterie); Hugo's rises through 1→7 | PASS |
| 14 | Happy path 1 | A signed-in member opens the tab and sees their streak, songs to study, the band's streaks and the readiness bar | Sign in as hugo, open `/studies` | `20-…` | PASS |
| 15 | Happy path 2 | Tap **Studied** on a not-ready song: the row shows done and the streak includes today | Re-run: tap Studied on Lightning / Batterie (not ready) | `21-…`: Undo state, "1 day streak · today counted" | PASS |
| 16 | Happy path 2 (touch) | The same tap with a thumb at 375 px | argent `tap` on Studied (both runs) | `./visual-validation-2026-10-12-0119/12-argent-tap-studied-and-stepper.png`; re-run `describe` shows the stepper and "Undo" on the tapped row | PASS |
| 17 | Happy path 3 | Raise my score from 5 to 7; if the lineup mean reaches 7, the song moves to ready and the bar gains one | Re-run: Léa and Sarah at 7; hugo steps Lightning to 5, then to 7 | `./visual-validation-2026-10-12-0119/22-rerun-score-5.png` "0 of 6", not ready; `23-…` "· ready", "1 of 6 songs ready" | PASS |
| 18 | Happy path 3 (touch) | Adjusting my score with the stepper by thumb at 375 px | argent: tap "+" twice at the same point (both runs) | Re-run: Afterglow / Batterie jumped below every unscored row after the first tap and the second tap missed it; final score 1, not 2 (`./visual-validation-2026-10-12-0119/24-rerun-argent-stepper-two-taps.png`). First run: the second tap raised **Runaway Sun** instead | FAIL |
| 19 | Happy path 4 | Another member opening the tab sees the new streak and the moved bar | Sign in as léa | `./visual-validation-2026-10-12-0119/04-lea-sees-hugo-streak-and-bar.png`: Hugo streak 1, "1 study this week", "1 of 6 songs ready" | PASS |
| 20 | Edge | A second tap on the same song and instrument on the same day changes nothing | UI swaps Studied for Undo; POST `/api/studies` twice (re-run) | Both 201; `studiesThisWeek` stays 1 | PASS |
| 21 | Edge | A member holding two instruments on a song sees two rows | Read hugo's list | `20-…`: Afterglow, Last Call and Slow Burn each appear as Batterie and Chant | PASS |
| 22 | Edge | Streak rule: one missed day per rolling 7 days is forgiven (joker); a second miss ends the streak; today never breaks it early | — | Needs studies on past days; none can be created | UNVERIFIABLE |
| 23 | Edge | The day boundary is midnight `Europe/Paris`, whatever the device time zone | Restart the browser with `TZ=America/Los_Angeles` (device date Oct 11), log a study | `./visual-validation-2026-10-12-0119/17-device-tz-los-angeles.png`; the study is stamped `2026-10-12` and shown done | UNVERIFIABLE |
| 24 | Edge | No back-dating: the server stamps the day and the body carries no date | POST with `studiedOn: '2026-10-01'` (re-run) | `400 unrecognized_keys ["studiedOn"]` | PASS |
| 25 | Edge | Undo deletes only a study of mine logged today; undoing the only study of today leaves today uncounted | léa: Studied, then Undo; hugo: DELETE léa's pair (re-run) | `./visual-validation-2026-10-12-0119/06-lea-undo-today-uncounted.png` "0 day streak · today not yet"; hugo's DELETE → `404 study-not-found`, léa's study still counted | PASS |
| 26 | Edge | Undo refuses yesterday's study | — | Needs a study dated yesterday; none can be created | UNVERIFIABLE |
| 27 | Edge | Ready = every lineup player has a score and the mean is ≥ 7; one unscored player blocks it | Lightning: Léa 7, Sarah 7, hugo unscored; then hugo 7 (re-run) | `./visual-validation-2026-10-12-0119/07-silent-player-not-ready.png`: Lightning not ready; re-run `isReady` false, then true | PASS |
| 28 | Edge | Next concert = earliest strictly after now; readiness = union of its setlists, each song counted once | Add a concert yesterday (setlist: Runaway Sun) and one in 2 days with setlists {Lightning, Slow Burn} and {Slow Burn, Afterglow} | `./visual-validation-2026-10-12-0119/15-union-of-two-setlists-past-concert-ignored.png`: "1 of 3 songs ready · Wed, Oct 14, 2026 · Empty Venue" | PASS |
| 29 | Edge | A mastery default change writes no history row | PUT a Batterie default for hugo; count history rows before and after (re-run) | Lightning history 3 → 3; the earlier run's ordering picked the default up (row 06) | PASS |
| 30 | Edge | Deleting a song deletes its studies and history rows | DELETE Midnight Drive (one study today, one history row) | History → `{"changes":[]}`; hugo `studiesThisWeek` 2 → 1, streak still 1 | PASS |
| 31 | Edge | Deleting a member deletes their history rows | DELETE léa; read Lightning history | Léa's rows 1 → 0 | PASS |
| 32 | Edge | Deleting a member deletes their studies | DELETE léa | No reader exposes a deleted member's studies | UNVERIFIABLE |
| 33 | Error | `study-not-in-lineup` → 422 | POST Lightning / Chant as hugo, who plays Batterie (re-run) | `422 {"error":"study-not-in-lineup"}` | PASS |
| 34 | Error | `study-not-found` when undoing a study that is not mine or not today's → 404 | DELETE a pair hugo never logged; DELETE léa's pair as hugo (re-run) | `404 {"error":"study-not-found"}` | PASS |
| 35 | Error | `song-not-found` → 404 | POST with an unknown songId (re-run) | `404 {"error":"song-not-found"}` | PASS |
| 36 | Error | `instrument-not-found` → 404 | POST Lightning with an unknown instrumentId (re-run) | `404 {"error":"instrument-not-found"}` on `b9316ca`; the build before it answered `422 study-not-in-lineup` | PASS |
| 37 | Q.O.D. | Back-dating: today only | See rows 20 and 24 | Rows 20, 24 | PASS |
| 38 | Q.O.D. | Undo does not revert a score changed during the study | Re-run: Studied on Afterglow / Batterie, score to 1, then Undo | `25-…`: row back to "Studied" with score 1; API `score: 1, isStudiedToday: false` | PASS |
| 39 | Q.O.D. | Visibility: all to all | léa sees hugo's streak and count | `04-…` | PASS |
| 40 | Q.O.D. | Mastery history comes from every override write, including the Studies tab | Step Lightning 1→7 in the tab | `/api/mastery/history` holds one row per step for hugo (1…7) | PASS |
| 41 | Category | 1280 px renders without layout breakage | Set the viewport to 1280×900 | `./visual-validation-2026-10-12-0119/09-studies-1280.png` (before `b9316ca`); `scrollWidth 1280` | PASS |
| 42 | Category | `prefers-color-scheme: dark` | `set media dark`, reload at 375 | `./visual-validation-2026-10-12-0119/11-dark-375.png`: readable, no light blocks | PASS |

## Notes

- **09 (FAIL)**: The band line's "studies this week" does not follow my own writes, although the streak next to it does.
  - After tapping Studied, my line reads "0 studies this week" next to streak 1. Seen for hugo on both builds and for léa (`05-lea-studied-band-count-stale.png`), and still wrong after waiting 3–4 s.
  - After Undo it reads "2 studies this week" while `/api/studies/overview` returns 1 (`25-…`).
  - It comes right only after a reload or a score change.
- **18 (FAIL, argent)**: Each score change re-sorts the list immediately, so the row being adjusted moves out from under the thumb.
  - On `b9316ca` the second "+" at the same point missed: the row had dropped below the unscored rows, and those have no stepper, so the score stopped at 1 instead of 2.
  - On the earlier build, every row had a stepper and the second tap raised **Runaway Sun** instead of Midnight Drive. The history recorded it: `Runaway Sun 5@01:30:00`.
  - On the current build, the same misfire happens whenever the row sliding into place is also one studied today.
  - Agent-browser clicks by element ref follow the element and do not show this.
- **22 / 26 (UNVERIFIABLE)**: The joker, the second-miss rule, "today never breaks the streak" and refusing yesterday's undo all need study rows on earlier days. The API refuses a date (row 24), and this run had no access to the database or the server clock.
- **23 (UNVERIFIABLE)**: The device time zone is shown not to matter: a Los Angeles device whose date was still Oct 11 got its study stamped 2026-10-12. The Paris-midnight boundary itself is not shown. The run took place at 01:2x–01:4x UTC, when Paris and UTC give the same date, so a day cut at UTC midnight would look the same. Telling them apart needs a run between 22:00 and 24:00 UTC, or control of the clock.
- **32 (UNVERIFIABLE)**: Once a member is deleted, nothing on screen or in the API lists their studies, so their removal cannot be seen from outside.
- **Observations outside the spec** (not counted in the verdict):
  - Every series on the progress chart fills with `url(#pragma-sparkline-grad)`, and that id is repeated, so every fill takes the first series' colour (`13-…`: Hugo's red line over a green fill).
  - A series with a single point is drawn as a triangle across the full width.
  - `id="study-row"`, `id="study-score"` and `id="streak-badge"` repeat on every row.

## Verdict: FAIL
