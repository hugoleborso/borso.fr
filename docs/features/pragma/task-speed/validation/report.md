# Task speed: before and after the pass

Both runs used the harness the spec describes, at 375 × 667 with touch on,
against the dev server and the preview seed. `baseline.json` and `after.json`
hold the raw numbers; `pnpm run task-speed -- --baseline <file>` reproduces the
comparison.

## Before

The path each job took, with the scroll each hunted tap needed:

- `add-song`: New song → title → artist → Save (scrolled 1110px)
- `my-part`: Sessions tab → next concert → its setlist (scrolled 416px) → my filter
- `vote`: Setlists tab → the setlist → vote entry → score a song
- `stage`: Sessions tab → next concert → its setlist (scrolled 416px) → Scene mode
- `find-chart`: search → song
- `add-to-setlist`: Sessions tab → next concert → its setlist (scrolled 416px) → Add song → search → pick
- `add-task`: More tab → Tasks → title (scrolled 859px) → Save (scrolled 395px)
- `add-bar`: Bars tab → name (scrolled 520px) → Save (scrolled 957px)

| Job | Taps | Typed | Swipes | Screens | Hunted | Stretch | Modelled time | Verdict |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Add a song to the catalog | 4 | 34 | 3 | 3 | 1 | 1 | 21.3s | over: hunted 1 > 0, 21.3s > 20s |
| See what I play at the next concert | 4 | 0 | 1 | 4 | 1 | 1 | 10.9s | over: taps 4 > 3, hunted 1 > 0, 10.9s > 9s |
| Give points in the open setlist vote | 4 | 0 | 0 | 4 | 0 | 0 | 9.8s | over: taps 4 > 3, 9.8s > 9s |
| Open the next concert on stage | 4 | 0 | 1 | 5 | 1 | 1 | 12.3s | over: taps 4 > 3, hunted 1 > 0, 12.3s > 9s |
| Open a song's chord chart | 2 | 4 | 0 | 2 | 0 | 0 | 6s | within budget |
| Add a catalog song to the next concert setlist | 6 | 5 | 1 | 5 | 1 | 2 | 15.9s | over: taps 6 > 5, hunted 1 > 0, 15.9s > 14s |
| Write down a task | 4 | 21 | 3 | 3 | 2 | 0 | 17.6s | over: hunted 2 > 0, 17.6s > 14s |
| Log a new bar lead | 3 | 13 | 4 | 2 | 2 | 0 | 14s | over: hunted 2 > 0, 14s > 12s |

Seven of eight jobs were over budget and eight taps were hunted. One more
finding came from writing the journeys rather than from the numbers: the bars
page had two buttons labelled Save, and the first one on the page saved the
outreach message, not the bar. The first draft of the `add-bar` journey
pressed it, which is what a member would do too.

## After

- `add-song`: New song → title → artist → Save
- `my-part`: My part
- `vote`: Vote now → score a song
- `stage`: Stage
- `find-chart`: search → song
- `add-to-setlist`: My part → Add song → search → pick
- `add-task`: More tab → Tasks → title → Add
- `add-bar`: Bars tab → name → Add

| Job | Taps | Typed | Swipes | Screens | Hunted | Stretch | Modelled time | Verdict |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Add a song to the catalog | 4 | 34 | 0 | 3 | 0 | 0 | 18s (was 21.3s, -3.3s) | within budget |
| See what I play at the next concert | 1 | 0 | 0 | 2 | 0 | 1 | 3.8s (was 10.9s, -7.1s) | within budget |
| Give points in the open setlist vote | 2 | 0 | 0 | 2 | 0 | 1 | 4.9s (was 9.8s, -4.9s) | within budget |
| Open the next concert on stage | 1 | 0 | 0 | 2 | 0 | 1 | 3.8s (was 12.3s, -8.5s) | within budget |
| Open a song's chord chart | 2 | 4 | 0 | 2 | 0 | 0 | 6s (was 6s, 0s) | within budget |
| Add a catalog song to the next concert setlist | 4 | 5 | 0 | 3 | 0 | 2 | 9.9s (was 15.9s, -6s) | within budget |
| Write down a task | 4 | 21 | 0 | 3 | 0 | 2 | 14.3s (was 17.6s, -3.3s) | over: 14.3s > 14s |
| Log a new bar lead | 3 | 13 | 0 | 2 | 0 | 2 | 9.6s (was 14s, -4.4s) | within budget |

No tap is hunted any more, and the total modelled time across the eight jobs
went from 107.8 s to 70.3 s.

## What changed, by job

| Change | Jobs it moves |
| --- | --- |
| A **Next concert** card at the top of the landing page, with *My part*, *Stage*, and *Vote now* while a vote is open | `my-part`, `stage`, `vote`, `add-to-setlist` |
| *My part* opens the setlist filtered to the signed-in member (`?member=<id>`), and each row names what that member plays (`BATTERIE + CHANT`) | `my-part` |
| The concert page shows its setlists right under the title, above the friends count, the gear and the venue | anyone arriving through Sessions |
| Save sits in a row that sticks to the bottom of the screen while the form is in view (song, task and bar forms) | `add-song`, and editing any task or bar |
| *New song* moves into the bottom action bar, the same place *New setlist* and *Add song* already used, and the two other copies are gone | `add-song` |
| A one-line quick add at the top of Tasks and Bars: a title or a name, then Add. The full form is still below for the details | `add-task`, `add-bar` |
| The outreach message editor on Bars is folded by default, and its button now reads *Save the message* | `add-bar`, and the two-Save confusion |
| The catalog card puts the status, energy and mastery on one line under the artist: 110px per song instead of 154px, measured at 375px | browsing the catalog |

## What got worse

**Stretch taps went up**, from 5 to 9. The Next concert card and the quick-add
fields sit at the top of the screen, which is the hardest place for a thumb to
reach on a tall phone. The trade was deliberate: the top of the page is where
a member looks first, so these controls are found without a search, and each
replaces a path of three or four taps. The bottom action bar is the
thumb-friendly place, and it already carries one action per page.

**The setlist row hides its lineup glyphs** while the list is filtered to one
member on a phone. The row has room for one of the two on a narrow screen, and
the member's own instruments in words answer the question the filter asks.

## Still over budget

`add-task` is 0.3 s over. Two of its four taps are navigation (More, then
Tasks), because Tasks lives in the More drawer while Bars has a bottom tab.
Whether Tasks deserves the tab is a product decision this pass did not make.

## Evidence

`screenshots/` holds the phone screens before and after: the landing page,
the bars page, the task page before, the new song form, and *My part* after.
