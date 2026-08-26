# Setlist Mode Scène — browser pass, 2026-08-25

What was driven: the local dev stack (`pnpm --filter @borso-app/pragma dev`) with the preview fixture
seeded through `POST /api/__test/seed`, which now carries a ChordPro chart per song plus a key
override, a capo and an entry note on the set.

Two tools, because a click is not a tap: `scripts/browser.sh` for layout and keyboard,
`scripts/argent.sh` for touch.

## What holds

| # | Assertion | How it was checked | Evidence | Verdict |
| --- | --- | --- | --- | --- |
| 1 | The setlist page offers Mode Scène as its first action | Opened `/setlists/<id>`, read the accessibility tree: `link "Mode Scène"` | `screenshots-2026-08-25/01-setlist-header-scene-button-1280.png` | PASS |
| 2 | The scene opens on the first song, fullscreen, dark | Clicked the button, read `01 / 06 · Set principal`, `Slow Burn` | `02-scene-first-song-1280.png` | PASS |
| 3 | The right arrow walks the set | Pressed `ArrowRight` twice, read `03 / 06`, `Lightning` | `03-scene-keyboard-walked-to-third-song-1280.png` | PASS |
| 4 | The header carries the entry key, capo and energy | Song 03 reads `Volt F# Capo 2 ⚡9`, from the entry override rather than the song tonality `E` | `03-…png` | PASS |
| 5 | Auto-scroll runs and the button says so | Clicked it, then read `aria-pressed="true"`, label `Stop`, and the chart's `scrollTop` at 81 px | `04-scene-auto-scroll-running-1280.png` | PASS |
| 6 | The rail brings the song being played into view | At 375 px, walked to song 04 and read the rail's `scrollLeft` at 431 px with `04 · maintenant` current | `05-scene-phone-375.png`, `06-scene-rail-centred-1280.png` | PASS |
| 7 | Changing song sends the chart back to its first line | Read the chart's `scrollTop` at 0 right after a walk that followed an auto-scroll | — | PASS |
| 8 | Nothing overflows sideways at 375 px | `documentElement.scrollWidth === clientWidth === 375` | `05-scene-phone-375.png` | PASS |
| 9 | A real tap on a pill jumps to that song | argent `gesture-tap` on the `02 · up next` pill, then read `02 / 06 · Midnight Drive` | `07-scene-touch-pass-375.png` | PASS |
| 10 | The rail scrolls under a real pointer | argent `gesture-scroll --deltaX 0.9` over the rail, then read the first two pills off-screen | `07-…png` | PASS |
| 11 | Every scene control is thumb-sized | argent `describe`: each control frame is 0.065 of an 812 px screen, so 53 px | `07-…png` | PASS |
| 12 | The single-song scene keeps working and gains auto-scroll | Opened `/catalog/<id>/scene`, read the footer controls | `08-song-scene-with-auto-scroll-1280.png` | PASS |

## What was not checked here

- The screen wake lock. Headless Chromium in this sandbox grants no lock, and the adapter is written
  to carry on without one; its behaviour is covered by unit tests instead
  (`scene-wake-lock.adapter.test.ts`), including the refusal path and the release that arrives after
  the scene closed.
- Prod-shaped hosting. Everything above ran against the Vite dev server.
