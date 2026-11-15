# Task metrics

This harness walks pragma's top tasks the way a band member does on a phone, and counts what each one costs: taps, text entries, scroll gestures and screens. It also measures every route on first load. The numbers in the UX redesign spec ([`docs/features/pragma/ux-redesign/spec/spec.md`](../../../../docs/features/pragma/ux-redesign/spec/spec.md)) are compared with [`baseline.json`](../../../../docs/features/pragma/ux-redesign/spec/baseline/baseline.json), which this harness produced on the app before the redesign.

It started as the audit's `run-baseline.mjs` and `driver.mjs` and moved here in slice 1, so that every later number is measured by code in the repository.

## Run it

```bash
cd apps/pragma
pnpm run task-metrics -- --tasks all --compare ../../docs/features/pragma/ux-redesign/spec/baseline/baseline.json
pnpm run task-metrics -- --tasks all --routes --slice-1 --out /tmp/after.json
```

`parseTaskMetricsArguments` in `task-metrics.core.ts` reads every option. Run `grep -o "'--[a-z0-9-]*'" task-metrics.core.ts` in this folder to list them. `--tasks` defaults to `all`, which is `ALL_TASK_IDS` in the same file. A task outside it runs only when named. Each `--slice-<n>` adds the measures slice n of the UX redesign is judged on, and the `slice-*-measures.setup.ts` file named after that number holds them. `--routes` turns on `--screen-rule`, which prints every violation of the spec's screen rule. `--screen-rule` and `--compare <file>` exit 1 on a violation or a difference. `--out <file>` keeps an existing file and updates it. `--seed` defaults to `audit`, and `SEED_VARIANTS` names the others.

The site port is `TASK_METRICS_PORT`, 5182 by default. The API runs on the site port minus 2000, and the browser is the `agent-browser` session `pragma-task-metrics-<site port>`, so two runs on two ports do not meet. Every walk starts from a fresh seed and a fresh sign-in.

## What one run does

1. `pragma-instance.sh start <port>` creates a database of its own in the shared local Postgres cluster (`scripts/local-postgres.sh`), applies the migrations, seeds the app's dev fixture and then `audit-seed.setup.ts` on top of it (44 songs, five members, three setlists, takes, tasks and transitions), and starts the API and the site (`vite-site.setup.ts`, because `vite.config.ts` fixes its ports).
2. `agent-browser --session pragma-task-metrics-<port> open` boots agent-browser's Chromium on the login page, and `get cdp-url` gives its DevTools port to `task-metrics.setup.ts`.
3. `task-metrics.setup.ts` emulates an installed phone app at 390x844: device metrics, touch, safe-area insets of 47 px at the top and 34 px at the bottom, and `matchMedia('(display-mode: standalone)')` answering true.
4. Each walk in `task-walks.setup.ts` reseeds, signs in through the form and performs its task through `touch-input.adapter.ts`, on the one DevTools socket of `cdp-session.adapter.ts`. A tap is `Input.dispatchTouchEvent` start and end 60 ms apart, a drag is ten paced touch moves, a scroll is `Input.synthesizeScrollGesture`, typing is `Input.insertText` and a key is `Input.dispatchKeyEvent`. This is the recipe of `scripts/phone.sh touch`, in the harness's own session so the touch emulation stays on.
5. Everything started is stopped at the end, even after a failure. The shared Postgres cluster keeps running; `scripts/local-postgres.sh stop pragma` stops it.

## How it counts

- **Taps** count every touch tap, one per choice in a native picker, and one per drag. Typing is counted apart as **text entries**, one per field filled.
- **Scroll gestures** count the wheel gestures needed to bring the next control into view. One gesture moves at most 70% of the screen.
- **Screens** count every distinct page and every open `<dialog>` a walk reached, including the start screen.
- **Bottom third** means the control's centre sat at or below two thirds of the screen height when the person reached it, before any scroll made for it.
- **Scroll areas** count elements whose `overflow` is auto or scroll and whose content is larger than their box, plus the page itself when it scrolls.
- **Tap targets under 44 px** measure the area a tap actually reaches, not each control alone. A control's `::after` extension is cut where a scroll or clipping container ends, and where another control's hit area overlaps it the one painted on top keeps the overlap: a positioned control beats a static one, and between two alike the later one in the document wins. Controls inside a fixed or sticky bar are not compared with the content scrolling under them, and content hidden in a closed `<details>` is skipped. Two 36 px buttons with a 4 px extension stacked 41 px apart therefore count as 41 px tall, which is what a thumb gets.
- **Screen rule**: a list is a `ul`, `ol`, `table` or an element with the `list`, `grid` or `table` role, outside the page header, the bottom strip, dialogs and anything `aria-hidden`. Lists of one kind (same tag, role and class, same first row) count as one run, so groups of tasks under each member's name are one list; a run of three rows or more ends at the bottom of its last list, and anything checked above that starts at or below that line is a violation.
- **Icon-only** and **text-only** buttons are read from what is drawn: an `svg`, an image or a one-character glyph counts as an icon, visible text counts as text. A control that states a choice rather than an action (`aria-pressed`, or the `tab`, `radio`, `option`, `switch` or `checkbox` role) is counted under `choices`, not `buttons`, because the spec's *Every button has an icon* rule says section tabs and chips are choices, not buttons; so a text-only language chip is not a text-only button.

The pure parts of this, from the scroll gesture plan to the comparison with a baseline, are in `task-metrics.core.ts` and tested at full coverage.

## What it cannot prove

- A scroll is a wheel-style gesture, not a touch swipe. `Input.synthesizeScrollGesture` with the `touch` source answers success and scrolls nothing in agent-browser's headless Chromium (measured 0 px for 300, against 299 px with the `mouse` source). Taps and drags are real touch.
- There is no microphone, so recording a take cannot be walked; the seeded audio files do not exist, so nothing plays.
- A native select or date field opens a picker headless Chromium does not draw. The tap that opens it is real; the value is set through the page and counted as one more tap.
- `Emulation.setEmulatedMedia` with `display-mode` has no effect on this Chromium, which is why standalone mode is a `matchMedia` shim injected before each page loads.

## Traps already met

- Touch emulation ends with the DevTools session that set it, so every gesture goes through the session `emulatePhone` set up, never a second client.
- Signing in through `/api/auth/login` alone is not enough: the site also keeps a marker in `localStorage`, so the walks sign in through the form.
- A target can move after it is found, when something above it renders late. A walk taps only once two reads of the target's box, 150 ms apart, agree; a box that keeps moving fails the walk with `layout never settled`.
- A Chromium that inherits the sandbox's proxy variables sends `localhost` through the proxy; `run-task-metrics.sh` removes them before it opens the browser.
