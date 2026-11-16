# Visual validation — Revise a song before the next session

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-15T23:00:57Z
- Tooling: agent-browser 0.41.2

The spec is in the short form, so the rows come from the numbered *Behaviour* bullets. Every run was at 375 × 812. Rows marked "touch" used `scripts/phone.sh touch` in the `phone` session, signed in as Léa. The other rows used the default session, signed in as Hugo. The seed has one session, a concert on Sun, Nov 22, 2026 at Le Petit Bain. Every screenshot was followed by the broken-image scan, and every scan returned `[]`. `agent-browser errors` was empty in both sessions.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Behaviour 1 | The next session is the earliest practice or concert on today's band day or later, and it does not have to carry this setlist | Created a practice on 2026-11-15T09:00Z, earlier the same Paris band day, with no setlist (setlist `Set principal` belongs to the Nov 22 concert). Reloaded the setlist and chose *To revise* on Lightning | `./visual-validation-2026-11-15-2310/12-next-is-todays-practice.png`. The task was saved with `sessionId` = the practice and `dueDate` = `2026-11-15T09:00:00.000Z`. The concert lines on Slow Burn left the row while the practice was the next session | PASS |
| 02 | Behaviour 1 | A session earlier today on the band day still counts. Once the band day has passed, the next one takes over | After 23:00 UTC (00:00 Paris) the setlist was reloaded | `./visual-validation-2026-11-15-2310/14-after-practice-day-past.png`. The Lightning practice line was gone and the Slow Burn concert lines were back | PASS |
| 03 | Behaviour 2 | The `⋯` menu shows **To revise** when a next session exists and the member has no task for that song on it | Hugo opened `More for Slow Burn` | `./visual-validation-2026-11-15-2310/02-menu-to-revise-375.png`. menuitems = `To revise`, `Add a break after`, `Remove from the setlist` | PASS |
| 04 | Behaviour 2 | Choosing it creates one task with title `Revise <song>`, assigned to the signed-in member, with `songId`, `sessionId` = the next session, `dueDate` = the session's date and status `todo` | Clicked *To revise*, then read `GET /api/tasks` | `POST /api/tasks` 201. Task `{title:"Revise Slow Burn", assigneeId: Hugo (= /api/me memberId), songId: Slow Burn, sessionId: 6b7fd5ac… (concert), dueDate:"2026-11-22T22:49:29.042Z" (= session date), status:"todo"}` | PASS |
| 05 | Behaviour 2 | The title is in the member's language | Léa in `fr` (`pragma.locale=fr`) tapped *À réviser* on Midnight Drive (touch) | `./visual-validation-2026-11-15-2310/07-fr-menu-a-reviser.png`. Task title saved as `Réviser Midnight Drive` | PASS |
| 06 | Behaviour 2 | The item is not shown once the member already has a task for that song on the next session | Hugo reopened `More for Slow Burn` after creating his task | `./visual-validation-2026-11-15-2310/04-menu-hidden-after-create.png`. menuitems = `Add a break after`, `Remove from the setlist` only | PASS |
| 07 | Behaviour 2 | The rule is per member, so another member still gets the item | Léa tapped `More for Slow Burn` (touch) while Hugo's task existed, then tapped *To revise* | `./visual-validation-2026-11-15-2310/06-lea-menu-shows-to-revise.png`. A second task was created, assigned to Léa | PASS |
| 08 | Behaviour 2 | With no next session, the item is not shown | Moved the concert to 2026-11-10 with `PUT /api/sessions/:id` after the practice's day had passed. Opened `More for Afterglow`, then restored the date to 2026-11-22T22:49:29.042Z | `./visual-validation-2026-11-15-2310/15-no-next-session-menu.png`. menuitems = `Add a break after`, `Remove from the setlist`. No line was drawn on any row | PASS |
| 09 | Behaviour 2 | While the task list has not loaded, the item is not shown | Tried to delay or empty `/api/tasks` with `network route` | Not testable. Reads go through `POST /api/read-batch` | UNVERIFIABLE |
| 10 | Behaviour 3 | Under the song row, each task of that song on the next session is one line with a checkbox, the assignee's first name and the session label (kind, date, venue when set) | Read the row lines after the tasks were created, for the concert (with a venue) and the practice (without one) | `./visual-validation-2026-11-15-2310/03-line-after-create-375.png`: `Hugo revises it for Concert · Sun, Nov 22, 2026 · Le Petit Bain`. `./visual-validation-2026-11-15-2310/08-fr-lines-touch-ticked.png`: Hugo's and Léa's lines both under Slow Burn. `./visual-validation-2026-11-15-2310/12-next-is-todays-practice.png`: `Practice · Sun, Nov 15, 2026`, with no venue | PASS |
| 11 | Behaviour 3 | Ticking marks the task done | Clicked Hugo's checkbox, then tapped Léa's checkbox (touch) | `./visual-validation-2026-11-15-2310/05-ticked-struck-through.png`. API status `done` for both. Checkbox `checked=true` | PASS |
| 12 | Behaviour 3 | Unticking reopens it | Tapped Léa's ticked checkbox again (touch) | API status back to `todo`. Checkbox `checked=false` | PASS |
| 13 | Behaviour 3 | A done task stays on the row, ticked and struck through, until the session's day is past | Reloaded after ticking. Then the practice task was ticked and its band day was allowed to pass | After the reload Hugo's line was still present with `checked=true`, and its text had computed `text-decoration-line: line-through` (`05`, `08`). The done practice line was shown in `13-practice-task-done-same-day.png` and gone after midnight Paris in `14-after-practice-day-past.png` | PASS |
| 14 | Behaviour 4 | The task shows on the session's tasks | Opened `/sessions/6b7fd5ac…` › Tasks | `./visual-validation-2026-11-15-2310/09-session-tasks.png`. All three brush-up tasks are listed | PASS |
| 15 | Behaviour 4 | The task shows on the band tab | Opened Band › Tasks | `./visual-validation-2026-11-15-2310/10-band-tasks.png`. `Revise Slow Burn` is under *My tasks*, and all three are under *Everyone* | PASS |
| 16 | Behaviour 4 | It can be edited there | Opened `Réviser Midnight Drive` from Everyone, set the assignee to Marc and saved | `./visual-validation-2026-11-15-2310/11-edited-assignee-marc.png`. The setlist line now reads `Marc revises it for Concert · …` | PASS |
| 17 | Behaviour 4 | It can be deleted there | Deleted `Réviser Midnight Drive` from Everyone and confirmed | `DELETE /api/tasks/:id` 200. The line under Midnight Drive is gone on the setlist (snapshot) | PASS |
| 18 | Behaviour 4 | It shows through the assistants' task tools | None | No assistant surface was driven from the browser in this run | UNVERIFIABLE |
| 19 | Behaviour 5 | The line and the menu item fit at 375 px wide | Measured at 375 × 812 in `en` and `fr` | The menu item spans 154–354.7 px with `scrollWidth` = `clientWidth` = 201 (en) and 151–354.5 px, 204 = 204 (fr). The line label spans 44–359 px with `scrollWidth` = `clientWidth` = 315, and wraps to two lines. Document `scrollWidth` = 375. Screenshots `02`, `03`, `07`, `08` | PASS |

## Notes

- Row 09 (UNVERIFIABLE). Pragma loads sessions and tasks through one `POST /api/read-batch`. A `network route` on `/api/sessions` or `/api/tasks` is never hit by the page, and aborting `read-batch` stops the whole setlist from rendering. So the "task list not loaded yet" state could not be isolated in the browser. It is logged as friction.
- Row 18 (UNVERIFIABLE). The assistants' task tools are an API and agent surface. The spec gives no screen for them that a browser can drive.
- Local dev data left behind. The run created a practice session on 2026-11-15T09:00Z (`ea1fa229…`) with a done `Revise Lightning` task for Hugo. It also left a done `Revise Slow Burn` for Hugo and a todo `Revise Slow Burn` for Léa. The concert's date was moved and then restored to its seeded value.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
