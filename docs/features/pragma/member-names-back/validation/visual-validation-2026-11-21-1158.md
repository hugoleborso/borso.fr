# Visual validation — pragma writes a member's name again where a mark alone hid who it was

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-21T12:02:51Z
- Tooling: agent-browser 0.41.2

Signed in as `hugo`. Viewport 375 × 812 unless the row says otherwise. Every screenshot was followed by the broken-image scan, and every scan returned `[]`. Every 375 px page measured `document.documentElement.scrollWidth = 375`, so none scrolls sideways.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Rule 1 / Rule 2 / Sees 1 | The Flames sheet's member list writes the name beside the mark. A member row shows the dot, the name, the flame and its day count. | Home, tap "Band flame, 1 day", read the sheet's `li` rows | `./visual-validation-2026-11-21-1158/01-flames-sheet-375.png`. The rows read Hugo 5, Léa 1, Marc 0, Sarah 0, each with a colour dot and a flame | PASS |
| 02 | Rule 2 | "Today counted" is no longer written on each member row. It stays as the flame's tooltip and accessible text. | Read each row's outerHTML | Each count span has `title="today counted"` (or `title="No flame yet"`) and the same text sits in a `span.sr-only`. The screenshot in row 01 shows no status text on member rows | PASS |
| 03 | Rule 1 | A task's assignee writes the name beside the mark. | Session detail, Tasks tab, add the task "Charger les amplis" assigned to Léa | `./visual-validation-2026-11-21-1158/04-session-tasks-assignee-375.png`. The row shows a green dot, then "Léa", then "to do" | PASS |
| 04 | Rule 1 | A member's task column header writes the name. | `/tasks`, Everyone tab | `./visual-validation-2026-11-21-1158/03-tasks-everyone-375.png`. The headers read H Hugo 2, L Léa 1, M Marc 1, S Sarah 0 | PASS |
| 05 | Rule 1 | The concert's friends per member writes the name (form). | Session detail, Edit, enter friends counts 12/8/5/3 | `./visual-validation-2026-11-21-1158/05-concert-friends-form-375.png`. Each input row shows its avatar and the name Hugo, Léa, Marc or Sarah | PASS |
| 06 | Rule 1 | The concert's friends per member writes the name (read view). | Save, then read the Details tab | `./visual-validation-2026-11-21-1158/06-concert-friends-read-375.png`. The rows show avatar, name, bar and count, with Σ 28 | PASS |
| 07 | Rule 1 | A setlist row's change tonight writes the name. | In the setlist, open Slow Burn, go to Lineup, add Chant to Sarah, close | `./visual-validation-2026-11-21-1158/11-setlist-row-change-tonight-375.png`. The highlight under Slow Burn reads "● Sarah" plus the mic and keys glyphs. `aria-label` = "Tonight: Sarah: Chant, Clavier" | PASS |
| 08 | Rule 1 | The "part of" header of a setlist writes the name. | Setlist, My part tab (`?view=my-part`) | `./visual-validation-2026-11-21-1158/09-setlist-part-of-header-375.png`. The header shows the H avatar followed by "Hugo" | PASS |
| 09 | Rule 1 | The rows of the setlist's inline lineup editor write the name. | Setlist, open Slow Burn, Lineup tab | `./visual-validation-2026-11-21-1158/10-inline-lineup-editor-375.png`. The "Lineup tonight" rows read Hugo, Léa, Marc, Sarah | PASS |
| 10 | Rule 1 | The rows of the song's default lineup editor write the name. | Song Slow Burn, Default lineup, Edit | `./visual-validation-2026-11-21-1158/13-song-lineup-editor-375.png`. The sheet rows read Hugo, Léa, Marc, Sarah | PASS |
| 11 | Rule 3 | The setlist lineup grid keeps marks alone. | Setlist, Lineup tab | `./visual-validation-2026-11-21-1158/08-setlist-lineup-grid-375.png`. The column heads are the H/L/M/S avatars with no written name | PASS |
| 12 | Rule 3 | The mastery matrix keeps marks alone. | `/members`, Mastery tab | `./visual-validation-2026-11-21-1158/14-mastery-matrix-375.png`. The column heads are the H/L/M/S avatars only | PASS |
| 13 | Rule 3 | A song's lineup chips keep marks alone. | Song Slow Burn, Default lineup section | `./visual-validation-2026-11-21-1158/12-song-lineup-chips-375.png`. The chips show an avatar plus instrument glyphs, with no name | PASS |
| 14 | Rule 3 | The vote tally keeps marks alone. | Setlist vote: open a vote, give points to Last Call and Runaway Sun, open Results | `./visual-validation-2026-11-21-1158/15-vote-tally-375.png`. Each result shows the H avatar and a point count, with no name | PASS |
| 15 | Sees 2 | Every screen in rule 1 writes the member's first name. | Rows 01, 03 to 10 | Every name shown is a first name (Hugo, Léa, Marc, Sarah), matching the seeded first names | PASS |
| 16 | Sees 3 | Every screen works at 375 px wide. | Every screen above at 375 × 812, plus `scrollWidth` | `scrollWidth = 375` on Flames, tasks, session tasks/details/edit, setlist songs/lineup/my part, song, members/mastery, vote. No name truncation in the screenshots | PASS |
| 17 | Rule 2 (wide) | The Flames sheet keeps the same row shape at desktop width. | Viewport 1280 × 800, open the Flames sheet | `./visual-validation-2026-11-21-1158/16-flames-sheet-1280.png`. Rows read dot, name, flame, count, with no status text | PASS |

## Notes

- No FAIL or UNVERIFIABLE rows.
- The seed lacked four things: a session task with an assignee, a lineup change tonight, friends counts and an open vote. I created each one through the UI. Then I reverted the data: deleted the task, removed Sarah's Chant, reset the friends counts to 0 and took the vote points back. The vote on "Set principal" stays open with 0 points, because closing it would have rewritten the setlist.

## Verdict: PASS
