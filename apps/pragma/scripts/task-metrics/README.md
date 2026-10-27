# Task metrics

This harness walks pragma's top tasks the way a band member does on a phone, and counts what each one costs: taps, text entries, scroll gestures and screens. It also measures every route on first load. The numbers in the UX redesign spec ([`docs/features/pragma/ux-redesign/spec/spec.md`](../../../../docs/features/pragma/ux-redesign/spec/spec.md)) are compared with [`baseline.json`](../../../../docs/features/pragma/ux-redesign/spec/baseline/baseline.json), which this harness produced on the app before the redesign.

It started as the audit's `run-baseline.mjs` and `driver.mjs` and moved here in slice 1, so that every later number is measured by code in the repository.

## Run it

```bash
cd apps/pragma
pnpm run task-metrics -- --tasks all --compare ../../docs/features/pragma/ux-redesign/spec/baseline/baseline.json
pnpm run task-metrics -- --tasks all --routes --slice-1 --out /tmp/after.json
```

| Option | Effect |
| --- | --- |
| `--tasks all`, `--tasks 5,6`, `--tasks none` | which walks to run; `all` is tasks 1 to 12 and 8b, and is the default |
| `--routes` | measure the 26 routes on first load |
| `--slice-1` | add the measures slice 1 of the redesign is judged on: distinct font sizes outside the scene views, text set in a member colour, text under 4.5:1, tap targets under 44 px, where focus lands in four sheets and whether they scroll inside, a transition draft after a tap on the backdrop, the note race (8 runs with each save delayed 0 to 700 ms, seeded), and the first screen of the concert setlist |
| `--out <file>` | write the result as JSON; an existing file is kept and updated |
| `--compare <file>` | compare taps, text entries, scroll gestures and screens of every walked task with that file, print each difference and exit 1 when there is one |

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
- **Icon-only** and **text-only** buttons are read from what is drawn: an `svg`, an image or a one-character glyph counts as an icon, visible text counts as text.

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
- A Chromium that inherits the sandbox's proxy variables sends `localhost` through the proxy; `run-task-metrics.sh` and the argent adapter remove them.
