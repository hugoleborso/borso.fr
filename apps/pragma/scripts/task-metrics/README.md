# Task metrics

This harness walks pragma's top tasks the way a band member does on a phone, and counts what each one costs: taps, text entries, scroll gestures and screens. It also measures every route on first load. The numbers in the UX redesign spec ([`docs/features/pragma/ux-redesign/spec/spec.md`](../../../../docs/features/pragma/ux-redesign/spec/spec.md)) are compared with [`baseline.json`](../../../../docs/features/pragma/ux-redesign/spec/baseline/baseline.json), which this harness produced on the app before the redesign.

It started as the audit's `run-baseline.mjs` and `driver.mjs` and moved here in slice 1, so that every later number is measured by code in the repository.

## Run it

```bash
cd apps/pragma
pnpm run task-metrics -- --tasks all --compare ../../docs/features/pragma/ux-redesign/spec/baseline/baseline.json
pnpm run task-metrics -- --tasks all --routes --slice-1 --out /tmp/after.json
```

| Option                                       | Effect                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--tasks all`, `--tasks 5,6`, `--tasks none` | which walks to run; `all` is tasks 1 to 12 and 8b, and is the default. Task 13 (Start the practice from Home, Record a take; then, as 13b, Next song and Record a take) runs only when named, because the baseline has no row for it: the walk first moves the coming practice to today through the API                                                                                                                                                                                                                                                                                                                                       |
| `--routes`                                   | measure the 26 routes on first load                                                                                                                                                                                                                                                                                                                                                                         |
| `--slice-1`                                  | add the measures slice 1 of the redesign is judged on: distinct font sizes outside the scene views, text set in a member colour and text under 4.5:1 (both in the light and the dark scheme), tap targets under 44 px, text covered by another element and sideways scrolling at 375 and 1280 px wide, where focus lands in four sheets and whether they scroll inside, a transition draft after a tap on the backdrop, the note race (8 runs with each save delayed 0 to 700 ms, seeded), and the first screen of the concert setlist |
| `--slice-2` | add the measures slice 2 is judged on: the tabs in the bottom bar and which one is active per route, the primary actions on `/`, `/band`, `/tasks`, `/sessions`, `/setlists` and `/account` with their place on the screen, the top of the first content under the 47 px top inset, the theme colour in each scheme, the manifest shortcuts, where the language switch sits, the scroll position Sessions, Songs and Band open at when their tab is tapped from the end of a scrolled Home, the tasks page width at 390 and 375 px after a task is linked to the longest song title, and the New task draft after a backdrop tap and after Escape |
| `--slice-3` | add the measures slice 3 is judged on: the top of the first setlist row and the sticky elements on `/setlists/:id` at 390x844 and at 375x667, the second with the 20 px top inset and no bottom inset of a phone that size without a notch; on the Lineup grid, the rows whose full lineup is on the first screen, the changes from the previous song the grid marks against the ones `buildLineupGrid` finds in the API data, and in both schemes whether every column is tinted and every played cell filled with its member's stored colour; where focus lands in the entry sheet and how many sheets are open after its Record a take; and on the vote page the back link and where the primary action sits, on arrival and at the end of the page |
| `--slice-4` | add the measures slice 4 is judged on: on the Order screen of the concert setlist at 390x844, the rows wholly above the bottom strip with the energy curve shown and the size of the first drag handle; in the Add songs sheet, where the confirm button sits on the screen and, under each chip, how many songs already in the setlist can still be picked |
| `--slice-6` | add the measures slice 6 is judged on: the height of `/catalog` in screens, the ways into stage mode from a song page, the vertical scroll areas of the edit route, the routes that draw a button inside a link, and, for every song with a track id or a stored link, the listen links its page shows against the links it has |
| `--screen-rule` (also on with `--routes`) | check every route at 375x667 against the screen rule of the UX redesign spec (*Operator review 2*): a page header that is sticky or fixed and still on screen after scrolling to the end, a back link in that header on every page that is not a tab (to `/band` on the Band pages), and nothing of another kind below a list of three rows or more: no form, field, `h2` or `h3` heading, tab list or list of another kind. Stage views are exempt. Every violation is printed and the run exits 1 when there is one |
| `--seed audit`, `--seed no-upcoming-session` | the seed every walk starts from; `no-upcoming-session` moves every session into the past, for Home's empty state. `audit` is the default |
| `--out <file>`                               | write the result as JSON; an existing file is kept and updated                                                                                                                                                                                                                                                                                                                                              |
| `--compare <file>`                           | compare taps, text entries, scroll gestures and screens of every walked task with that file, print each difference and exit 1 when there is one                                                                                                                                                                                                                                                             |

The site port is `TASK_METRICS_PORT`, 5182 by default. The API runs on the site port minus 2000, the argent browser on 9280 plus the last digits of the site port, and the argent tool-server on 4380 plus the same, so two runs on two ports do not meet. Every walk starts from a fresh seed and a fresh sign-in.

## What one run does

1. `pragma-instance.sh start <port>` creates a database of its own in the shared local Postgres cluster (`scripts/local-postgres.sh`), applies the migrations, seeds the app's dev fixture and then `audit-seed.setup.ts` on top of it (44 songs, five members, three setlists, takes, tasks and transitions), and starts the API and the site (`vite-site.setup.ts`, because `vite.config.ts` fixes its ports).
2. `scripts/argent.sh start` boots a Chromium and the argent tool-server on the ports above.
3. `task-metrics.setup.ts` emulates an installed phone app at 390x844: device metrics, touch, safe-area insets of 47 px at the top and 34 px at the bottom, and `matchMedia('(display-mode: standalone)')` answering true.
4. Each walk in `task-walks.setup.ts` reseeds, signs in through the form and performs its task through argent: `gesture-tap`, `gesture-scroll`, `gesture-drag` and `keyboard`. The DevTools socket in `cdp-session.adapter.ts` only reads the page and sets the emulation; it never clicks.
5. Everything started is stopped at the end, even after a failure. The shared Postgres cluster keeps running; `scripts/local-postgres.sh stop pragma` stops it.

## How it counts

- **Taps** count every `gesture-tap`, one per choice in a native picker, and one per drag. Typing is counted apart as **text entries**, one per field filled.
- **Scroll gestures** count the wheel gestures needed to bring the next control into view. One gesture moves at most 70% of the screen.
- **Screens** count every distinct page and every open `<dialog>` a walk reached, including the start screen.
- **Bottom third** means the control's centre sat at or below two thirds of the screen height when the person reached it, before any scroll made for it.
- **Scroll areas** count elements whose `overflow` is auto or scroll and whose content is larger than their box, plus the page itself when it scrolls.
- **Tap targets under 44 px** measure the area a tap actually reaches, not each control alone. A control's `::after` extension is cut where a scroll or clipping container ends, and where another control's hit area overlaps it the one painted on top keeps the overlap: a positioned control beats a static one, and between two alike the later one in the document wins. Controls inside a fixed or sticky bar are not compared with the content scrolling under them, and content hidden in a closed `<details>` is skipped. Two 36 px buttons with a 4 px extension stacked 41 px apart therefore count as 41 px tall, which is what a thumb gets.
- **Screen rule**: a list is a `ul`, `ol`, `table` or an element with the `list`, `grid` or `table` role, outside the page header, the bottom strip, dialogs and anything `aria-hidden`. Lists of one kind (same tag, role and class, same first row) count as one run, so groups of tasks under each member's name are one list; a run of three rows or more ends at the bottom of its last list, and anything checked above that starts at or below that line is a violation.
- **Icon-only** and **text-only** buttons are read from what is drawn: an `svg`, an image or a one-character glyph counts as an icon, visible text counts as text. A control that states a choice rather than an action (`aria-pressed`, or the `tab`, `radio`, `option`, `switch` or `checkbox` role) is counted under `choices`, not `buttons`, because the spec's *Every button has an icon* rule says section tabs and chips are choices, not buttons; so a text-only language chip is not a text-only button.

The pure parts of this, from the scroll gesture plan to the comparison with a baseline, are in `task-metrics.core.ts` and tested at full coverage.

## What it cannot prove

- argent sends a one-finger tap on Chromium as a mouse press and release, so the page sees `pointerType: mouse` and no `touchstart`. Touch-only behaviour is checked with `scripts/argent.sh` by hand.
- There is no microphone, so recording a take cannot be walked; the seeded audio files do not exist, so nothing plays.
- A native select or date field opens a picker headless Chromium does not draw. The tap that opens it is real; the value is set through the page and counted as one more tap.
- argent's keyboard cannot type accented characters, so typed text is plain ASCII.
- `Emulation.setEmulatedMedia` with `display-mode` has no effect on this Chromium, which is why standalone mode is a `matchMedia` shim injected before each page loads.

## Traps already met

- argent caches the window size when it connects and maps every fraction through it. After any emulation change it has to `describe` again, which `walk-recorder.setup.ts` does before each gesture when the size changed.
- Signing in through `/api/auth/login` alone is not enough: the site also keeps a marker in `localStorage`, so the walks sign in through the form.
- A target can move after it is found, when something above it renders late. A walk taps only once two reads of the target's box, 150 ms apart, agree; a box that keeps moving fails the walk with `layout never settled`.
- A Chromium that inherits the sandbox's proxy variables sends `localhost` through the proxy; `run-task-metrics.sh` and the argent adapter remove them.
