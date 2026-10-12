# Visual validation, after merging main — The band sees the next two-hour slots when every member is free, and books a practice in one tap

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: https://pragma-pr-118.preview.borso.fr/ (API https://pragma-pr-118-api.preview.borso.fr), deployed from `a3a0a2c1`
- Run at: 2026-10-12, from 01:30 to 03:10 UTC
- Tooling: agent-browser through `scripts/browser.sh` (375 x 667 and 1280 x 800, `TZ=Europe/Paris`); argent through `scripts/argent.sh` for every phone row, signed in by taps and its keyboard
- Run by the agent that merged main, not by the standalone `visual-validator` agent: this session had no tool to dispatch one. Read the rows with that in mind.

Scope: this run re-checks the main flow and the screens the merge of `main` could have moved, and adds a UX pass held to the bar of [`../../task-speed/spec/spec.md`](../../task-speed/spec/spec.md) and [`../../mobile-ux-audit/report.md`](../../mobile-ux-audit/report.md). The edge-case rows of the spec (windows, rounding, time zones, error codes, SSRF) are covered by [`visual-validation-2026-10-02-1447.md`](./visual-validation-2026-10-02-1447.md); the merge touched none of that code.

Setup: `POST /api/__test/seed` before each scenario; feeds removed with `DELETE /api/me/calendar-feed` as each member.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result | The "Next free slots" block sits above the session list, with "2 h practice · next 4 weeks", one row per slot and the excluded members | Hugo opened /sessions at 375 x 667 after seed | `./visual-validation-2026-10-12-0303/v-01-sessions-seed-375.png`: "Wed, Oct 14 19:15 – 23:00 [Book a practice]", "Without Léa, who has no calendar", above the concert card | PASS |
| 02 | Result, HP 6 | One tap on "Book a practice" on a phone opens the practice form with the slot's start | argent: tapped the Sessions tab, then the button | `./visual-validation-2026-10-12-0303/v-argent-book-dialog-phone.png`: dialog "New practice", input `2026-10-14T17:15` (argent's Chromium runs in UTC, so 17:15 UTC is 19:15 Paris) | PASS |
| 03 | HP 6 | Create saves the practice | argent: tapped Create | `./visual-validation-2026-10-12-0303/v-argent-after-create-phone.png` (h1 "Practice"); `/api/sessions` lists `practice 2026-10-14T17:15:00.000Z` | PASS |
| 04 | Edge | When no member has a feed, the block shows an empty state that links to the account page | Removed all three seeded feeds; argent tapped "Connect yours" | `./visual-validation-2026-10-12-0303/v-argent-empty-state-phone.png`; lands on /account with the Calendar card at the top and its Save at 32 % of the screen height: `./visual-validation-2026-10-12-0303/v-argent-connect-lands-on-calendar-phone.png` | PASS |
| 05 | HP 1, Result | A member pastes a `webcal://` address and saves; the field is replaced by "Calendar connected" with Replace and Remove | argent: tapped the field, typed the address with the keyboard tool, tapped Save | `./visual-validation-2026-10-12-0303/v-argent-calendar-saved-phone.png` | PASS |
| 06 | Result | Remove takes the calendar off | argent: tapped Remove, Cancel (still connected), Remove again, then the dialog's Remove | `./visual-validation-2026-10-12-0303/v-argent-remove-confirm-phone.png`, `./visual-validation-2026-10-12-0303/v-argent-removed-phone.png` ("Calendar removed.", the field is back) | PASS |
| 07 | i18n | The block reads in French at 375 px | Switched to FR in the More drawer | `./visual-validation-2026-10-12-0303/v-02-sessions-fr-375.png`: "Prochains créneaux libres", "Réserver une répétition" on one line, "Sans Léa, qui n'a pas d'agenda" | PASS |

## UX pass at the task-speed bar

| # | Check | Measure | Verdict |
|---|---|---|---|
| U1 | Book a practice from the app's opening screen | 3 taps (Sessions tab, Book a practice, Create), 0 hunted, 1 stretch tap (Book a practice sits at 17 % to 24 % of the screen height) | inside a 3-tap budget |
| U2 | Touch targets | Book a practice 141 x 44 (EN) and 188 x 44 (FR); Connect yours was 18 px tall and is now a 44 px button (fixed in `a3a0a2c1`); Replace, Remove and the dialog buttons 44 px | PASS after fix |
| U3 | Destructive action | Remove had no confirmation; it now asks first through `ConfirmDialog` (fixed in `5e6f269e`) | PASS after fix |
| U4 | No hunting to connect a calendar | The empty state opened the top of /account, with the Calendar field below the fold at 375 x 667; it now lands on `/account#calendar` (fixed in `5e6f269e`) | PASS after fix |
| U5 | Keyboard covering the field | Not measurable here: argent's Chromium shows no software keyboard. After the anchor, the field sits at 23 % and Save at 32 % of the screen height | UNVERIFIABLE (tool gap) |
| U6 | An evening that already holds a practice is offered again | After booking Wed Oct 14, the same slot still shows "Book a practice" next to the new practice: `./visual-validation-2026-10-12-0303/decision-1-booked-evening-still-offered-phone.png`. The calculation reads calendars only, and pragma's own sessions are not in any calendar | OPEN: product decision |
| U7 | A long slot list buries the session list | With one calendar connected: 31 slot rows, the first session at 2235 px on a 667 px screen (3.4 screens down), and the "Without …" line at the bottom of the list: `./visual-validation-2026-10-12-0303/decision-2-long-slot-list-375.png`, `./visual-validation-2026-10-12-0303/decision-2-long-slot-list-1280.png` | OPEN: product decision |

## Verdict: PASS on the spec rows, two UX decisions open

Every spec row above passes on the merged build. U6 and U7 change what the block shows, so they are left to the operator, and the pull request was not merged.
