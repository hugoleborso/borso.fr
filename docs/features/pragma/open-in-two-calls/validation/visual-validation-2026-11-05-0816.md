# Visual validation of "pragma never asks the API for more than two things at once"

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Branch: `claude/wizardly-mendel-0nq8qs` at `9fd6c0d41`
- Dev URL: http://localhost:5174/ (`pnpm dev` in `apps/pragma`, seeded member Hugo)
- Run at: 2026-11-05T08:16:32Z
- Tooling: agent-browser 0.35.2, `scripts/phone.sh` for the tap, ffmpeg for the GIF

## Method

- Requests are logged by an init script that wraps `window.fetch` before the app loads ([`./visual-validation-2026-11-05-0816/request-log.init.js`](./visual-validation-2026-11-05-0816/request-log.init.js)). It records method, path, the read paths inside each `POST /api/read-batch`, start and end. The spec's `performance.getEntriesByType('resource')` method could not be used as written, because Vite dev modules fill the default 250-entry buffer before the first API call (measured, 250 entries and no `/api/` entry). The init script raises the buffer, and the resource count matched the fetch log on every route (`resourceEntries` in the JSONL).
- "Cold" removes `pragma.query-cache` from a same-origin static page, keeps the cookie and `pragma.session-seen`, then opens the route. "Warm" reopens the same route right after. The window closes after 3 s with no API request. "Peak" is the most overlapping `[start, end]` intervals of read requests.
- The loader is held on screen by pausing the local API process with `SIGSTOP`, then released with `SIGCONT`. The failure is produced with `agent-browser network route "**/api/**" --abort`.
- Raw per-route results are in [`./visual-validation-2026-11-05-0816/request-counts.jsonl`](./visual-validation-2026-11-05-0816/request-counts.jsonl). Every route that failed its bound was re-measured three times with the same result.

## Request counts per route (375 px, signed in)

| Entry route | Cold bound | Cold measured | Cold peak | Warm bound | Warm measured | Warm peak |
|---|---|---|---|---|---|---|
| `/` | 3 | **4** (4 of 4 runs) | 2 | 1 | 1 | 1 |
| `/catalog` | 4 | 4 | 1 | 1 | 1 | 1 |
| `/catalog/new` | 4 | 4 | 1 | 1 | 1 | 1 |
| `/catalog/add` | 4 | 4 | 1 | 1 | 1 | 1 |
| `/catalog/:songId` | 4 | **5** (2 of 2 runs) | 2 | 1 | 1 | 1 |
| `/catalog/:songId/edit` | 4 | 4 | 1 | 1 | 1 | 1 |
| `/sessions` | 4 | 4 | 1 | 1 | 1 | 1 |
| `/sessions/slots` | 4 | 4 | 1 | 1 | 1 | 1 |
| `/sessions/:sessionId` | 4 | 3 | 2 | 1 | 1 | 1 |
| `/sessions/:sessionId/practice` | 4 | 3 | 2 | 1 | 1 | 1 |
| `/sessions/:sessionId/audience` | 4 | **5** (2 of 2 runs) | 2 | 1 | 1 | 1 |
| `/sessions/:sessionId/setlist` | 4 | **5** (2 of 2 runs) | 2 | 1 | 1 (3 once, see notes) | 1 |
| `/setlists` | 4 | 4 | 1 | 1 | 1 | 1 |
| `/setlists/:setlistId` | 4 | 4 | 2 | 1 | 1 | 1 |
| `/setlists/:setlistId/order` | 4 | 3 | 1 | 1 | **2** (3 of 3 runs) | 1 |
| `/setlists/:setlistId/vote` | 4 | 4 | 1 | 1 | 1 | 1 |
| `/setlists/:setlistId/audience` | 4 | **5** (2 of 2 runs) | 2 | 1 | 1 | 1 |
| `/tasks` | 4 | 4 | 2 | 1 | 1 | 1 |
| `/band` | 4 | 4 | 1 | 1 | 1 | 1 |
| `/compos` | 4 | 4 | 1 | 1 | 1 | 1 |
| `/members` | 4 | 4 | 1 | 1 | 1 | 1 |
| `/instruments` | 4 | 4 | 1 | 1 | 1 | 1 |
| `/bars` | 4 | 4 | 1 | 1 | 1 | 1 |
| `/improvements` | 4 | 4 | 1 | 1 | 1 | 1 |
| `/account` | 4 | 4 | 1 | 1 | 1 | 1 |
| `/oauth/consent` (no OAuth query) | 4 | 4 | 1 | 1 | 2 | 1 |
| `/catalog/:songId/scene` | 4 | 4 | 1 | 1 | 1 | 1 |
| `/setlists/:setlistId/scene` | 4 | 3 | 1 | 1 | 1 | 1 |
| `/vote`, signed out | 2 | 1 | 1 | 2 | 0 | 0 |
| `/vote/:sessionId`, signed out | 2 | 1 | 1 | 2 | 0 | 0 |

The peak never exceeded 2 on any route, cold or warm (measured). No route sent a write on open.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result, network | A tick group of two or more reads becomes one `POST /api/read-batch`. A group of one read leaves as its own `GET`. | Fetch log on every route | `./visual-validation-2026-11-05-0816/request-counts.jsonl`, e.g. cold `/` sends `POST /api/read-batch` with 7 reads, then `GET /api/setlists/:setlistId/entries` alone | PASS |
| 02 | Result, network | Writes are unchanged. | Sign in while batches are aborted | `POST /api/auth/login 200` left on its own, outside any batch (fetch log, row 22) | PASS |
| 03 | Result, table | Cold open of `/`: 3 requests, peak at most 2. | `measure.sh / cold`, 4 runs | 4 requests, peak 2, every run. `POST batch[7]`, `GET /api/realtime/ticket`, `POST batch[session, setlists-by-session]`, `GET entries` | FAIL |
| 04 | Result, table | Warm open of `/`, cache younger than 5 min: 1 request (the ticket). | `measure.sh / warm` | 1 request, `GET /api/realtime/ticket` | PASS |
| 05 | Result, table | Warm open of `/`, cache older than 5 min: at most 3, peak at most 2. | none | Spec defers it to the adapter test | UNVERIFIABLE |
| 06 | Result, table / happy path 3 | Return to a hidden tab sends at most 2. | none | Spec runs it on the PR preview, the dev ticket has no socket URL | UNVERIFIABLE |
| 07 | Test strategy, D7 | Every gated route stays within its cold bound and a peak of 2. | `measure.sh <route> cold` on 27 routes | Peak at most 2 everywhere. Over the bound: `/catalog/:songId` 5, `/sessions/:sessionId/audience` 5, `/sessions/:sessionId/setlist` 5, `/setlists/:setlistId/audience` 5 (bound 4). Table above | FAIL |
| 08 | Test strategy, D7 | Every gated route stays within its warm bound of 1. | `measure.sh <route> warm` on 27 routes | `/setlists/:setlistId/order` sends 2 (ticket, then `GET /api/setlists/:setlistId/entries`) in 3 of 3 runs. Table above | FAIL |
| 09 | Test strategy | `/vote` and `/vote/:sessionId`, signed out: at most 2 cold and warm. | Separate signed-out session | 1 cold and 0 warm on both; `https://screenshots-pr-<n>.preview.borso.fr/2026-11-05-0816/15-vote-signed-out-375.png` | PASS |
| 10 | Opening screen | It shows only when nothing is cached. A warm open renders the cached screen at once. | Warm open of `/` with the API paused | No overlay, home rendered from cache while every request hung; `https://screenshots-pr-<n>.preview.borso.fr/2026-11-05-0816/11-warm-open-api-frozen-375.png` | PASS |
| 11 | Opening screen, D6 | It also shows right after sign-in. | Sign in with an empty cache and batches aborted | Overlay `opening-failed` on `/` after login; `https://screenshots-pr-<n>.preview.borso.fr/2026-11-05-0816/12-after-sign-in-opening-375.png` | PASS |
| 12 | Opening screen, layout | Full `h-dvh` page on the surface token, no horizontal scroll at 375 px. | eval on the overlay with the API paused | Overlay 812 px tall for 812 px viewport, `scrollWidth` 375, background `rgb(245, 241, 232)` = `--color-paper`; `https://screenshots-pr-<n>.preview.borso.fr/2026-11-05-0816/02-loader-frame-2.png` | PASS |
| 13 | Opening screen, layout | Mark centred at 9 rem wide, 11 rem from `sm:`. | `getBoundingClientRect` at 375 and 1280 px | 144 px, centre x 187.5 at 375 px. 176 px at 1280 px; `https://screenshots-pr-<n>.preview.borso.fr/2026-11-05-0816/04-loader-1280.png` | PASS |
| 14 | Opening screen, layout | Caption "Tuning up…" in `role="status"`. Mark `aria-hidden`. | eval | `role=status` text `Tuning up…`, svg `aria-hidden="true"`. `fr.json` holds `On s'accorde…` | PASS |
| 15 | Opening screen, mark | An inline SVG in four groups: left note, three keys, right note, pale offset echo. | Screenshot and DOM | Inline svg with the echo visible behind the notes; `https://screenshots-pr-<n>.preview.borso.fr/2026-11-05-0816/02-loader-frame-2.png` | PASS |
| 16 | Animation, entrance | Once, 500 ms. Notes slide in from 24 px out. Keys rise from below, 60 ms apart. | `getAnimations()` timing | Enter left and right 500 ms, from 120 user units (22.9 px at 144 px wide). Key rise delays 0, 60 and 120 ms | PASS |
| 17 | Animation, loop | 1.6 s. Keys press left, centre, right, 120 ms apart, dip 4 px and deepen fill. Notes swing 8° on the third key with overshoot. Halo scale 0.9 to 1.1, opacity 0 to 0.35 to 0. | rAF sampler over 1.7 s at 1280 px, plus 30 frames at 375 px | Key press delays 500, 620, 740 ms, 1600 ms, dip 20 units (3.8 px at 375 px). Deepen opacity 0 to 1. Notes peak 7.99° then -2.5° overshoot. Halo scale 0.90 to 1.10, opacity 0 to 0.35. `https://screenshots-pr-<n>.preview.borso.fr/2026-11-05-0816/02-loader-loop-375.gif` (16 distinct of 30 frames) | PASS |
| 18 | Animation, echo | The pale echo follows the mark 90 ms late. | `getAnimations()` timing | Echo enter delay 90 ms, echo swing delay 590 ms against 500 ms | PASS |
| 19 | Animation, exit | 200 ms when the first answer lands. Mark grows to 1.08 and fades, revealing the filled screen. | Release the paused API | Phase `leaving` observed, then overlay gone and home text present; `https://screenshots-pr-<n>.preview.borso.fr/2026-11-05-0816/03-after-exit-home.png` | PASS |
| 20 | Animation | Only `transform` and `opacity` animate. Nothing flashes more than 3 times a second. | Keyframes of the 20 running animations | All animate `transform` or `opacity`. The deepen flash fires 3 times per 1.6 s loop, 1.9 per second | PASS |
| 21 | Reduced motion | Static mark, no entrance, loop or exit motion. Caption carries progress. Overlay leaves without a fade. | `set media light reduced-motion`, API paused, then released | 0 animations, two frames 500 ms apart identical, caption shown, overlay went from `opening` to removed with 0 animations; `https://screenshots-pr-<n>.preview.borso.fr/2026-11-05-0816/05-reduced-motion-375.png` | PASS |
| 22 | Failure | The mark stops. "pragma could not reach the band's data." A primary "Try again" button. | Cold open with `/api/**` aborted | Phase `opening-failed`, 0 running animations, exact text, accent primary button; `https://screenshots-pr-<n>.preview.borso.fr/2026-11-05-0816/06-error-375.png`, `https://screenshots-pr-<n>.preview.borso.fr/2026-11-05-0816/10-error-1280.png` | PASS |
| 23 | Failure | When the browser is offline, "You are offline." | `set offline on` during a failing open | Status reads both lines; `https://screenshots-pr-<n>.preview.borso.fr/2026-11-05-0816/09-error-offline-375.png` | PASS |
| 24 | Failure | "Try again" restarts the loop. | `scripts/phone.sh touch '[data-opening-phase] button'` with the API paused | Real touch reached the button. Phase back to `opening`, caption back, 11 animations running; `./visual-validation-2026-11-05-0816/07-retry-loop-restarted-375.png`. Screen filled after release; `https://screenshots-pr-<n>.preview.borso.fr/2026-11-05-0816/08-after-retry-home-375.png` | PASS |
| 25 | Failure | "Try again" refetches every active query in one group. | Fetch log after the tap | Two batches, `[2]` and `[5]` reads, started 6 ms apart; `./visual-validation-2026-11-05-0816/07-retry-loop-restarted-375.png` | FAIL |
| 26 | Happy path 1 | The gate shows the opening screen and mounts the route beneath it, inert and hidden. The probe and the route's reads leave in one batch. | eval with the API paused, then fetch log | One `[inert]` hidden node under the overlay. The pending batch holds 7 reads, `/api/instruments` once, so probe and list merged | PASS |
| 27 | Happy path 1 | Dependent waves each leave as one more request. | Fetch log, cold `/` | The ticket leaves alone before the next-session wave, which costs one request beyond the spec's 3 (row 03) | FAIL |
| 28 | Happy path 2 | Reopen within 7 days renders the cache at once, the ticket leaves alone. | Warm open | Same as rows 04 and 10 | PASS |
| 29 | Happy path 4 | A stale `setlists` message refetches the mounted keys in one batch. | none | The dev ticket answers no socket URL, so no stale message arrives | UNVERIFIABLE |
| 30 | Happy path 5 | Offline, the restored cache answers the catalogue and the next session's setlist and entries. | Cold open, `set offline on`, in-app navigation | Catalogue shows offline; `https://screenshots-pr-<n>.preview.borso.fr/2026-11-05-0816/13-offline-catalog-375.png`. Home shows the next setlist's 6 songs. The home link "Open the setlist" (`/setlists/:setlistId`) shows "This setlist no longer exists." under the banner that promises it; `./visual-validation-2026-11-05-0816/14-offline-setlist-375.png` | FAIL |
| 31 | Edge | Two callers read the same path in one group, one item is sent. | Fetch log, cold `/` | `/api/instruments` appears once in the first batch | PASS |
| 32 | Edge | A group of more than 10 reads leaves as batches of at most 10. | none | No route issued more than 7 reads in one group | UNVERIFIABLE |
| 33 | Edge | A read's header in `PRAGMA_REQUEST_HEADERS` rides on its item (`x-ballot-token`). | none | No signed-out vote route sent a batch with a ballot token | UNVERIFIABLE |
| 34 | Edge | Next session today and started is picked by `selectNextSession`. No session ahead stops the preload. | none | The seed has one next session, on 2026-11-12 | UNVERIFIABLE |
| 35 | Edge | A route that reads nothing past the shell still lifts the overlay. | Cold `/account`, `/oauth/consent` | Overlay gone, `opening` null at the end of each measurement | PASS |
| 36 | Error | One read fails inside a batch, the others get their data. | `fetch('/api/read-batch')` with an unknown song in the middle | `200` with item statuses `[200, 404, 200]` | PASS |
| 37 | Error | `401` with an ended session sends the member to `/login`. | Clear the cookie, keep the marker, cold open `/` | URL `http://localhost:5174/login` | PASS |
| 38 | Error | The batch fails, every caller fails, `retry: 1` resends them once as one group. | Cold open with `/api/**` aborted | The batch of 7 failed. The retry left as `GET /api/sessions`, `POST batch[5]`, `GET /api/streaks`, three requests within 3 ms | FAIL |
| 39 | Error | A cold open whose first batch fails shows the failure and its retry. | Same as row 22 | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-05-0816/06-error-375.png` | PASS |
| 40 | Error | A malformed batch answers `400 read-batch-invalid` and runs nothing. | `fetch` with 11 reads, `/mcp`, `/api/read-batch` | `400 {"error":"read-batch-invalid"}` for all three | PASS |

Every screenshot was followed by the broken-image scan. It returned an empty list each time.

## Notes

- **03, 27.** On cold `/` the realtime ticket leaves as its own `GET` at about 1511 ms, and the next session's batch leaves 11 ms later at 1522 ms. The spec counts them as one group ("then the ticket with the next session and its setlists"). They land in two tasks, so the open costs 4 requests. Peak stays at 2.
- **07.** All four routes over their cold bound share one shape. The route reads, then a batch of `[ticket, songs, sessions]`, then the route's own second wave (`studies/overview` and `setlists`, or the audience `state` and `rounds`), then the preload's next session and setlists, then the entries. The preload and the route's dependent wave do not share a group, so each adds a request. On `/sessions/:sessionId/setlist`, a lone `GET /api/instruments` also leaves after the entries.
- **08.** A warm `/setlists/:setlistId/order` refetches `GET /api/setlists/:setlistId/entries` on every open within the 5 minutes, in 3 of 3 runs. The key looks persisted with a shorter staleness than the other keys, or not persisted (inferred, not read in code).
- **25.** After the tap, 7 reads left as two batches, `[2]` and `[5]`, 6 ms apart. The spec asks for one group. Both were in flight at once, so the cap of 2 held.
- **30.** The offline preload stores the session, its setlists and their entries, but not `GET /api/setlists/:setlistId`. That is the read the setlist page needs. `origin/main`'s `offline-reading.queries.ts` preloads the same keys (read this session), so this gap is likely preexisting and not a regression of this branch (inferred). The user still sees a false "This setlist no longer exists." offline, under a banner that promises the next-concert setlist.
- **38.** The `retry: 1` resends follow each query's own retry timer, so 7 failed reads came back as 3 requests. The spec asks for one group. Peak stayed at 2.
- **05, 06, 29.** The spec itself moves these off `pnpm dev`. Row 05 goes to the adapter test. Rows 06 and 29 need a socket, which the dev ticket does not open, so they belong on the PR preview.
- **32, 33, 34.** The seed and the routes never produce the case: no group above 7 reads, no ballot token on a signed-out vote, and no session today. The unit and adapter tests named in Test strategy cover them.
- **12.** The spec says "surface token". `tokens.css` has no `--color-surface`. The overlay uses `bg-paper`, which is the page background (measured). That counts as a PASS here.
- **oauth/consent warm 2.** The second read is `GET /api/oauth/consent` answering `400`, because the route was opened with no OAuth query. A failed query is not cached, so this result comes from the test input. It is left out of row 08.
- **sessions/:sessionId/setlist warm 3.** The first run's cold open ended on `/sessions/:sessionId`, and the warm reload redirected to `/setlists/:setlistId`, whose keys were not cached yet. Two re-runs measured 1. It is left out of row 08.

## Verdict: FAIL
