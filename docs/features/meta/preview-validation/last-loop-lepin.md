# Preview validation of `last-loop-lepin` for PR 40

> **Correction, 2026-08-14.** This record says argent's `gesture-tap` could not be
> used, because every call returned `CDP request Input.dispatchMouseEvent timed out`.
> That was true of these runs and is not true of the tool: `gesture-tap` was
> re-verified working, and the timeouts were almost certainly agent-browser holding
> the same browser, which wedges argent's input dispatch exactly as it wedges
> `Page.navigate`. Two later phone audits read the claim and sent no touch events at
> all. Give argent its own browser with `scripts/argent.sh`; see
> [`docs/knowledge/driving-previews-with-agent-browser-and-argent.md`](../../../knowledge/driving-previews-with-agent-browser-and-argent.md).
> The findings below stand; only the claim about the tool is withdrawn.

## Verdict

FAIL with 4 defects. One is functional and sits in the self punch flow, the
other three are a missing icon file and three tap targets that are smaller
than the 44 pixel floor. Everything the earlier mobile viewport audit called
a blocker is fixed. The spectator view loads, the map draws the course and a
runner marker that moves, every route renders real data, no API call
returned a 4xx or a 5xx apart from one deliberate wrong PIN, no page logged a
console error, and no route scrolls sideways at any of the four widths.

Target: <https://last-loop-lepin-pr-40.preview.borso.fr>

## How this ran

`agent-browser` version from the workspace drove the functional walkthrough in
its own session named `last-loop`, launched with
`--ssl-version-max=tls1.2 --enable-unsafe-swiftshader --use-gl=angle
--use-angle=swiftshader --no-sandbox` as
[`docs/knowledge/driving-previews-with-agent-browser-and-argent.md`](../../../knowledge/driving-previews-with-agent-browser-and-argent.md)
prescribes.

`argent` drove the touch walkthrough against device `chromium-cdp-9222`.
Argent has no viewport tool, so a second protocol session ran alongside it and
sent `Emulation.setDeviceMetricsOverride` and
`Emulation.setTouchEmulationEnabled`. Every argent measurement below was taken
with `matchMedia('(pointer: coarse)').matches` true,
`matchMedia('(hover: none)').matches` true, `navigator.maxTouchPoints` 5 and a
device pixel ratio of 2.

The seeded race that the preview shipped with had already finished, so the map
suppressed every runner marker by design. To exercise the marker layer, which
is the riskiest thing in this refactor, this run called the test seed endpoint:

```
POST /api/__test/seed?fixture=race-down-to-one-survivor
```

That endpoint is mounted on every non production stage and the preview deploy
workflow already calls it. It writes only the `lepin-2026` edition, so the
cloned `3l-lepin-2026` edition is untouched and still visible on `/archives`.
See *What this run changed on the preview* at the end.

## Results by route and viewport

Each cell reports `document.documentElement.scrollWidth` over
`document.documentElement.clientWidth`. A route fails when the scroll width is
larger than the client width. Every number below was measured twice, once
against the finished edition the preview shipped with and once against the
live edition this run seeded. Both passes produced identical numbers.

| Route | 375 | 393 | 412 | 1280 |
|---|---|---|---|---|
| `/` spectator | 375 / 375 pass | 393 / 393 pass | 412 / 412 pass | 1280 / 1280 pass |
| `/archives` | 375 / 375 pass | 393 / 393 pass | 412 / 412 pass | 1280 / 1280 pass |
| `/r/<slug>` runner profile | 375 / 375 pass | 393 / 393 pass | 412 / 412 pass | 1280 / 1280 pass |
| `/admin` PIN screen | 375 / 375 pass | 393 / 393 pass | 412 / 412 pass | 1280 / 1280 pass |
| `/` with the self punch dialog open | 375 / 375 pass | not measured | not measured | not measured |

The worst finding of the earlier audit does not reproduce. Every route used to
lay out at 446 pixels inside a 375 pixel viewport. None does now.

## What the earlier audit found, and whether it still reproduces

The reference is
[`docs/features/meta/mobile-viewport-audit/report.md`](../mobile-viewport-audit/report.md).
Only the `last-loop-lepin` entries are in scope here.

| Earlier defect | Status now | Evidence |
|---|---|---|
| 1, every route lays out 446 pixels wide | Fixed | The table above. 375 over 375 on every route at every width. |
| 2, the self punch confirmation button sits partly off the right edge | Fixed | The button now measures 104 by 44 with its left edge at x 234 and its right edge at x 338, inside a 375 pixel viewport. `argent-self-punch-375-touch.png`. |
| 3, controls shorter than 44 pixels | Mostly fixed, partly still present | Navigation links are 60 by 44, 83 by 44 and 69 by 44. The admin PIN field is 195 by 44 and its button 74 by 44. The self punch buttons are 78 by 44 and 104 by 44. Still short: the language switcher, the archive runner name links, and the map markers. See defects 2 and 4. |
| 6, the runner profile does not load at all | Fixed | `/r/tanguy` and `/r/alice` both render a full loop history. The page no longer requests a hard coded edition slug. `runner-desktop-1280.png`. |
| 6, second part, a leaderboard chip gives no way to reach a runner profile | Fixed | The self punch dialog now carries an `Open the runner profile` link. `argent-self-punch-375-touch.png`. |
| 13, the Leaflet zoom controls are below 44 pixels | Fixed for the zoom controls, still present for the attribution | Zoom in and zoom out both measure 44 by 44. The attribution links still measure 43 by 14, 71 by 14 and 35 by 14, and those come from Leaflet's own stylesheet. See defect 4. |
| 16, a request aborts on the spectator view | No longer surfaces as an error | Across four full route loads the only requests without a final status were standings polls still in flight when the page navigated away. No `ERR_ABORTED` reached the console and `agent-browser errors` stayed empty on every route. |

## Priority checks

### The spectator view and the map

The spectator view loads, shows standings, and renders the Leaflet map with the
course and the runner markers.

Against the finished edition the preview shipped with, the map drew the course
polyline and the start marker and drew no runner markers. That is correct
rather than a defect. `runnerDistanceFraction` in
`apps/last-loop-lepin/site/src/components/organisms/course-map.utils.ts`
returns `null` whenever the edition status is not `live`, and
`GET /api/editions/current` reported `"status": "finished"` for
`3l-lepin-2026`.

Against the live edition this run seeded, the map drew a runner marker for the
one runner still in the race, and the marker moved. Sampling the marker's
Leaflet transform once every twelve seconds over a minute gave a steadily
advancing position rather than a frozen one:

```
18:47:44  translate3d(187px, 188px, 0px)
18:47:58  translate3d(185px, 189px, 0px)
18:48:12  translate3d(183px, 190px, 0px)
18:48:25  translate3d(182px, 191px, 0px)
18:48:39  translate3d(180px, 192px, 0px)
18:48:52  translate3d(178px, 192px, 0px)
```

The marker layer therefore renders and updates. Evidence is
`spectator-live-markers-1280.png` and `spectator-live-map-375.png`, where the
cyan `AL` avatar sits on the green course next to the white start marker.

The three runners who were not drawn were all reported by the API as
`{"kind": "dnf"}`, so one marker is the right count.

### The self punch button on a phone

Reachable and large enough. Driven by a real touch tap through argent at 375 by
667 with a coarse pointer, the leaderboard chip opened the dialog and the
confirm button measured 104 by 44 pixels with its right edge at 338 inside the
375 pixel viewport. Nothing was cut off and no sideways scroll was needed.

Responsive in the sense of reacting immediately, yes. Correct in what it offers,
not always. See defect 1.

### The language switcher

Passes. Switching between English and French changed every visible string on
all four routes. A scan of `document.body.innerText` for anything shaped like a
translation key, meaning a lowercase word followed by one or more dotted
segments, returned an empty list in both languages on all four routes. No raw
key such as `punch.confirm` reached the screen.

Times and dates localise as well. The standings row that reads `05:32:01 PM` in
English reads `17:32:01` in French, and `May 16, 2026` on the archives page
becomes `16 mai 2026`. Domain vocabulary follows too, with `LOOP 15` becoming
`BOUCLE 15` and `OUT · L12` becoming `DNF · B12`.

The choice persists. Selecting French writes `last-loop-lepin.language` with
the value `fr` into local storage, sets `document.documentElement.lang` to
`fr`, and both survive a reload.

### Every route loads with real data

All four routes render real content, listed under the API section below. The
404 route renders the application's own not found page rather than an origin
error document.

### The archives page

Passes. `/archives` reports one edition, `Last Loop Lépin`, dated 16 May 2026,
6.53 km with 260 m of climb, with the top five finishers and two CSV download
links. Evidence is `archives-desktop-1280.png` and `archives-375.png`.

### A write that persists

A self punch was created and it held.

Geolocation was set to 45.55, 5.78, which is the seeded course start. Opening
the dialog for the runner `alice` and pressing the confirm button produced
`POST /api/self-punches` returning 201 and the message `Loop 4 confirmed!`.

After a full page reload the standings showed `alice` at `LOOP 4` with the time
`06:50:41 PM`, `GET /api/standings/lepin-2026` reported
`{"kind": "in-race", "lastLoop": 4}`, and `/r/alice` listed a fourth entry
reading `L4, Closed at 18:50, Δ 53:41, VALID`. Before the punch the same
runner was at loop 3.

So the write reached the database and survived a reload. The standings figure
did not lag, but a one tick lag would have been expected rather than a bug.

### Uncaught errors and console errors

None. `agent-browser errors` and `agent-browser console` both returned empty
output on `/`, `/archives`, `/r/alice`, `/admin` and a deliberately unknown
path, against both the finished and the live edition. There is nothing to
report verbatim because nothing was logged.

## Defect 1, the self punch dialog offers a loop the server will refuse

Severity: functional, and it sits in the one flow that has to work mid race.

What was done. With the runner `alice` already holding a confirmed punch for
the current hourly loop, the leaderboard chip was tapped again through argent
at 375 by 667 with touch emulation on, and the confirm button was tapped.

What was expected. Either a dialog that does not offer a punch yet, or a punch
that succeeds.

What happened. The dialog read `I am Alice, confirm loop 5?` and presented the
full size green `I am here` button. Tapping it returned the message
`You already punched this loop.` and the standings stayed at loop 4. Evidence is
`argent-self-punch-375-touch.png` for the offer and
`self-punch-already-punched-375.png` for the result.

The two sides disagree about which loop is being punched. The client label
comes from `selectTargetLoopIndex` in
`apps/last-loop-lepin/site/src/components/organisms/self-punch.core.ts:110`,
which returns `runner.status.lastLoop + FIRST_LOOP_INDEX` and never looks at
the clock. The server derives the loop from the wall clock instead, through
`loopIndexAt(edition, now)`, used in
`apps/last-loop-lepin/api/src/punch/punch.service.ts:57` and again at line 246.
Between the moment a runner closes loop N and the moment the next hour opens,
the client advertises loop N plus one while the server still considers loop N
current, so the request is rejected as a duplicate.

The state is not exotic. A runner who has just punched and reopens the dialog,
or who taps twice because they are unsure the first tap registered, lands in it
every time. The failure is recoverable and the message is accurate, so this is
not data loss, but a runner mid race is shown a large confirm button for an
action that cannot succeed yet.

Whether this predates the refactor could not be determined, because this run
was not allowed to use git.

## Defect 2, the language switcher is below the 44 pixel touch floor

Severity: minor, and it is new work in this pull request.

The language `select` measures 96 by 31 pixels on every route, at 375 by 812
with a coarse pointer. The floor for a control a user presses with a thumb is
44 pixels. Every other control in the top bar already meets it, since the three
navigation links measure 60 by 44, 83 by 44 and 69 by 44, so the switcher is
the one element in that row that does not.

It appears on all four routes. Evidence is `spectator-375.png`, where the
control sits under the navigation row on the right.

## Defect 3, the site requests an icon file that does not exist

Severity: minor.

`apps/last-loop-lepin/site/index.html:6` declares
`<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`, and
`https://last-loop-lepin-pr-40.preview.borso.fr/favicon.svg` answers HTTP 404
with a content type of `application/xml`, which is the origin's error document.
`/favicon.ico` answers the same way. The browser therefore fetches a missing
file on every page load. It produced no console error, so the only cost is the
wasted request and the blank tab icon.

## Defect 4, three tap targets on the map and the archives stay below 44 pixels

Severity: minor. Partly known, since the earlier audit already listed the
archive runner links and the Leaflet attribution.

Measured at 375 by 812 with a coarse pointer:

| Element | Route | Size | Owner |
|---|---|---|---|
| Runner avatar marker | `/` | 28 by 28 | The application, `MAP_AVATAR_PX` in `course-map.utils.ts` |
| Start and finish marker | `/` | 16 by 16 | The application |
| Runner name links | `/archives` | 76 by 20 and 70 by 20 | The application |
| Leaflet attribution links | `/` | 43 by 14, 71 by 14, 35 by 14 | Leaflet's own stylesheet |

The two map markers matter more than their size suggests, because both are real
buttons. The runner avatar carries the accessible label
`Alice · at the corral · 4 loops confirmed` and opens the same dialog the
leaderboard chip opens, so it is a second entry point into the punch flow at 28
by 28 pixels.

## API calls seen and their statuses

Collected with `agent-browser network requests` across full loads of `/`,
`/archives`, `/r/alice` and `/admin`, plus the punch and the login attempt.

| Call | Status |
|---|---|
| `GET /` , `/archives`, `/r/alice`, `/admin` (documents) | 200 |
| `GET /assets/index-BR5g7A69.js` | 200 |
| `GET /assets/index-DC3x1x9h.css` | 200 |
| `GET /favicon.svg` | 404, see defect 3 |
| `GET /api/editions/current` | 200 |
| `GET /api/editions` | 200 |
| `GET /api/standings/3l-lepin-2026` | 200 |
| `GET /api/standings/lepin-2026` | 200 |
| `GET /api/editions/lepin-2026/runners/alice` | 200 |
| `GET /api/editions/lepin-2026/runners/alice/punches` | 200 |
| `OPTIONS /api/self-punches` | 204 |
| `POST /api/self-punches` | 201 |
| `OPTIONS /api/admin/auth/login` | 204 |
| `POST /api/admin/auth/login` | 401, a deliberate wrong PIN, see below |
| `POST /api/__test/seed?fixture=race-down-to-one-survivor` | 200 |
| CARTO base map tiles | 200 |

No application endpoint returned a 5xx. The only 4xx responses were the missing
icon and the login attempt this run made on purpose.

The standings endpoint is polled continuously. A single spectator page load
recorded 51 requests, of which 44 were standings polls. That is the designed
live behaviour rather than a defect, and the polls stop being useful once a race
is over, but nothing observed here misbehaved.

## What could not be checked, and why

**The admin area.** The login screen renders and its error path works, but no
credential was found that opens it. The `admin_credentials` table is seeded on
this preview, because
`POST /api/admin/auth/login` answers `{"reason":"invalid-pin"}` rather than
`{"reason":"misconfigured"}`, and the service returns the latter when the row is
absent. The PIN itself is not in the repository. The only value the tests use is
the literal `lastloop`, documented at
`apps/last-loop-lepin/test/database-utils.ts:26`, and it was refused. The reason
is that preview schemas are cloned from production, as
[`docs/knowledge/dsql-clone-from-prod.md`](../../../knowledge/dsql-clone-from-prod.md)
describes, and `admin_credentials` is not on the clone blocklist, so this
preview carries the real operator PIN. Guessing further would have hit the rate
limit of five attempts per five minutes and would have been guessing at a live
secret, so it was not attempted.

Two attempts were made in total, both with `lastloop`, one through the API and
one through the form. Both returned 401, and the form rendered `Invalid PIN.`
correctly, which at least confirms the error path. Evidence is
`admin-wrong-pin-375.png`. Everything behind the PIN, meaning the setup panel,
the roster, the correction panel and the manual did not finish flow, stays
unchecked, and so does any admin write.

**The elevation profile marker for a live runner.** The elevation card renders
`Elevation unavailable` on the seeded edition, because the fixture's course in
`test-seed.service.ts` carries five points and no per point elevation series.
The real edition does render the elevation chart, visible in
`spectator-desktop-1280.png`, but that edition is finished, so no runner marker
is placed on it. There is no state reachable from this preview that has both a
live runner and a real elevation series, so the pastille on the elevation
profile was never seen.

**Real device behaviour.** The sandbox is Linux on x86_64 with no `/dev/kvm`, no
Android platform tools and no macOS, so argent could drive only its Chromium
target. A software keyboard covering a form, iOS Safari and Android Chrome
scroll chaining, `100vh` against a dynamic toolbar, touch event ordering, and
how a hairline border renders at a real device pixel ratio all stay unverified.

**Colour contrast.** Not measured this session. The earlier audit measured the
self punch buttons at 11.61 to 1 and 16.72 to 1 and found no problem, and the
button colours look unchanged, but that was not re-checked.

**Whether defect 1 predates this pull request.** Determining that needs git,
which this run was told not to use.

## A tooling note worth carrying back

`Emulation.setEmitTouchEventsForMouse` wedges argent's input pipeline on a
Chromium target. With it enabled, `gesture-scroll` kept working but every
`gesture-tap` failed with `CDP request Input.dispatchMouseEvent timed out`, and
the failure persisted after the emulation client disconnected until the page was
navigated away and back. Sending only `Emulation.setDeviceMetricsOverride` and
`Emulation.setTouchEmulationEnabled` gives a coarse pointer, no hover and five
touch points, which is everything the phone profile needs, and taps work
normally. The recipe in
[`docs/knowledge/driving-previews-with-agent-browser-and-argent.md`](../../../knowledge/driving-previews-with-agent-browser-and-argent.md)
mentions the first two calls and not the third, which is the right advice, and
this run confirms the third should stay out.

## What this run changed on the preview

The preview database now holds a live edition that it did not hold before.

`POST /api/__test/seed?fixture=race-down-to-one-survivor` created or rewrote the
edition `lepin-2026`, named `Last Loop Lépin 2026`, with four runners called
Alice, Bob, Carla and Dan, a race window of 15:00 to 07:00 UTC and a status of
`live`. On top of that fixture this run created one self punch for `alice`,
loop 4, recorded at 18:50 UTC through `POST /api/self-punches`. A second punch
attempt was refused by the server and wrote nothing.

The seeding endpoint touches only the `lepin-2026` edition. The edition the
preview shipped with, `3l-lepin-2026`, was not modified and is still listed on
`/archives` with its eighteen runners intact.

The visible consequence is that `GET /api/editions/current` now returns the
seeded edition rather than the cloned one, so anyone opening the preview link
sees the four runner fixture on the spectator view instead of the original
demo race. To move it back to a finished state, call:

```
curl -X POST "https://last-loop-lepin-pr-40-api.preview.borso.fr/api/__test/seed?fixture=race-finished"
```

That will not restore `3l-lepin-2026` as the current edition, because the seeded
edition starts on a later date. Redeploying the preview is the way to get a
clean clone back.

## Screenshots

All under `docs/features/meta/preview-validation/last-loop-lepin/`.

| File | What it shows |
|---|---|
| `spectator-desktop-1280.png` | The spectator view on the original finished edition, with the course, the standings and the elevation chart |
| `spectator-375.png` | The same view at 375 pixels, with the top bar wrapped and no sideways scroll |
| `spectator-live-markers-1280.png` | The live edition with the moving `AL` runner marker on the course, evidence for the map check |
| `spectator-live-map-375.png` | The same runner marker at 375 pixels |
| `archives-desktop-1280.png`, `archives-375.png` | The archives page |
| `runner-desktop-1280.png`, `runner-375.png` | The runner profile with its full loop history |
| `admin-desktop-1280.png`, `admin-375.png` | The admin PIN screen |
| `admin-wrong-pin-375.png` | The `Invalid PIN.` error path |
| `self-punch-modal-375.png` | The self punch dialog at 375 pixels, with the confirm button fully on screen |
| `argent-self-punch-375-touch.png` | The same dialog reached by a real touch tap, showing the `confirm loop 5` label of defect 1 |
| `self-punch-already-punched-375.png` | The `You already punched this loop.` result of defect 1 |

---

# Regression check at `f88e1d0` — 8 August 2026

## Verdict

**No regressions found.** Nothing that worked at the baseline stopped working,
and none of the five changes listed for this run introduced a new failure. The
countdown ticks, the `<html lang>` attribute tracks the switcher, CORS is
correct, the CSV exports work, and the map still draws a moving runner marker.

The baseline's four defects all still reproduce, unchanged. Two things this run
found are pre-existing rather than new, but were not stated in the baseline and
are worth writing down: the preview auto-seed in CI has never worked for this
app, and the seed endpoint does not seed an admin credential even though the
workflow comment says it does.

Target: <https://last-loop-lepin-pr-40.preview.borso.fr>
API: <https://last-loop-lepin-pr-40-api.preview.borso.fr>

## How this ran

`agent-browser` in a session named `lastloop-regress`, launched with
`--ssl-version-max=tls1.2 --enable-unsafe-swiftshader --use-gl=angle
--use-angle=swiftshader --no-sandbox`, drove the functional walkthrough.

The touch pass ran against the argent device `chromium-cdp-9222`. As the recipe
in
[`docs/knowledge/driving-previews-with-agent-browser-and-argent.md`](../../../knowledge/driving-previews-with-agent-browser-and-argent.md)
warns, `gesture-tap` was not used; taps went through `Input.dispatchTouchEvent`
on a separate protocol session, which also sent
`Emulation.setDeviceMetricsOverride` and `Emulation.setTouchEmulationEnabled`.
That session measured `matchMedia('(pointer: coarse)')` true,
`matchMedia('(hover: none)')` true, `navigator.maxTouchPoints` 5, a device pixel
ratio of 2, and a 375 by 667 viewport.

The edition on the preview when this run started was the finished `race-finished`
state left by an earlier call, so `race-down-to-one-survivor` was seeded again to
get a live runner. See *What this run changed on the preview* at the end.

## Change 1, `<html lang>` follows the language switcher

**Works.** No regression.

The entry document is authored as `<html lang="fr">`, confirmed by fetching the
raw HTML. On load in this browser the attribute reads `en`, because
`navigator.languages` is `['en-US']` and `selectInitialLanguage` prefers a
supported browser language over the `fr` default. That is the module-level
`applyDocumentLanguage(i18next.language)` call overwriting the authored value,
which is the mechanism working rather than failing. The prompt for this run
expected `fr` on load; that expectation only holds on a French-language browser.

Six switches through the `#language-switcher` select, alternating French and
English:

```
set=fr lang=fr saved=fr | PROCHAIN TOP HORAIRE
set=en lang=en saved=en | NEXT HOURLY TOP
set=fr lang=fr saved=fr | PROCHAIN TOP HORAIRE
set=en lang=en saved=en | NEXT HOURLY TOP
set=fr lang=fr saved=fr | PROCHAIN TOP HORAIRE
set=en lang=en saved=en | NEXT HOURLY TOP
```

The attribute tracked every switch, and so did the visible copy and the value
written to `last-loop-lepin.language` in local storage. The subscription does not
decay: the sixth switch behaved exactly like the first.

With `fr` saved, a reload came back with `lang=fr` and French copy, and the
attribute stayed `fr` across `/archives`, `/r/alice` and `/admin`, so the
module-level listener survives client-side navigation.

## Change 2, the spectator countdown reading the clock through `clock-store`

**Works, including the boundary rollover.** This was the highest-risk change and
it is clean.

The seeded edition starts at 17:00:00 UTC on an hourly interval, so the next loop
boundary was 21:00:00 UTC. Sampled from the page's `role="timer"` element over
104 seconds:

```
20:03:28  56:31 MM:SS
20:03:41  56:18 MM:SS
20:03:53  56:06 MM:SS
20:04:05  55:54 MM:SS
20:04:19  55:41 MM:SS
20:04:31  55:28 MM:SS
20:04:45  55:14 MM:SS
20:04:58  55:01 MM:SS
20:05:12  54:47 MM:SS
```

Every reading equals `21:00:00` minus the wall clock at that instant, to the
second. The counter never stalled, never skipped, and never drifted from the
clock over the whole window. A second, independent observation in the argent
browser gave `41:01` then `40:46` fifteen seconds later, which is the same
one-second cadence in a different browser.

**Rollover.** No fixture places a boundary inside a usable observation window, so
the page clock was offset instead: `Date.now` was replaced with a function
returning the real time plus 3 250 000 ms, which puts the page eight seconds
before the 21:00:00 boundary. The store reads `Date.now()` on every tick, so the
next tick picked the offset up.

```
20:59:53 pageclock ->  00:06 MM:SS
21:00:00 pageclock ->  59:59 MM:SS
21:00:05 pageclock ->  59:54 MM:SS
21:00:11 pageclock ->  59:48 MM:SS
21:00:16 pageclock ->  59:43 MM:SS
21:00:22 pageclock ->  59:37 MM:SS
21:00:28 pageclock ->  59:31 MM:SS
21:00:33 pageclock ->  59:26 MM:SS
```

At the boundary the counter rolled from `00:06` straight to `59:59` and kept
counting down toward the 22:00:00 boundary. No freeze at zero, no negative value,
no `NaN`, no flicker back to the old target. `projectNextLoopBoundaryMs` returned
the next interval as soon as the clock crossed, which is what it is supposed to
do.

The page clock override was removed by the reload that followed.

## Change 3, `ranking.core.ts` tests for `mostRecentCorrectionAt` and `formatStandingsAsCsv`

**The CSV export works. `mostRecentCorrectionAt` could not be exercised with a
real correction.**

The CSV export is reachable, and there are two of them. Both return 200 with the
right headers and real rows:

```
GET /api/standings/lepin-2026/csv
  content-type: text/csv; charset=utf-8
  content-disposition: attachment; filename="standings-lepin-2026.csv"

rank,bib,runner_slug,display_name,status,out_at_loop,last_loop,last_finished_at
1,1,alice,"Alice",in-race,,3,2026-08-08T19:57:00.000Z
2,2,bob,"Bob",dnf,2,,2026-08-08T18:58:12.000Z
3,3,carla,"Carla",dnf,1,,2026-08-08T17:58:48.000Z
4,4,dan,"Dan",dnf,1,,2026-08-08T17:59:24.000Z
```

The header line matches `CSV_HEADER` in `ranking.core.ts` exactly, display names
are quoted, and the empty cells fall where the status says they should. The
per-lap export at `/api/standings/lepin-2026/laps.csv` also returns 200 with a
`B1`…`B16` column per loop. The archived edition `3l-lepin-2026` exports too, so
the download links on `/archives` and the `Download the CSV` button on the
spectator view both point at working endpoints.

`mostRecentCorrectionAt` is plumbed through: it is a top-level key of the
standings response, sibling to `standings`, and the spectator page reads it at
`apps/last-loop-lepin/site/src/routes/SpectatorPage.tsx:75`. On this preview it is
`null` for both `lepin-2026` and `3l-lepin-2026`, because no punch anywhere has a
`correctedAt` or a `voidedAt`. Creating one needs the admin correction panel,
which needs the PIN, which this run does not have — see change 5. So the field was
confirmed present and correctly `null`, and the "results amended at" line was
confirmed absent, but the non-null path was not seen on screen. An attempt to
force it by stubbing the standings response through
`agent-browser network route` did not produce a usable page, so it is not
reported as evidence.

## Change 4, `frontendOrigin` moving into `@borso/infra`, and CORS

**No regression.** Every API call from the site succeeds.

Across full loads of `/`, `/archives`, `/r/alice` and `/admin`, plus a self punch
and a login attempt, no request was blocked and no CORS error reached the
console. A single spectator load recorded 62 requests, all 200 apart from the
missing icon of defect 3.

The headers are exact rather than permissive:

```
OPTIONS /api/self-punches
  Origin: https://last-loop-lepin-pr-40.preview.borso.fr
  -> 204
  access-control-allow-origin: https://last-loop-lepin-pr-40.preview.borso.fr
  access-control-allow-methods: DELETE,GET,OPTIONS,PATCH,POST,PUT
  access-control-allow-headers: authorization,content-type
  access-control-allow-credentials: true
  access-control-max-age: 600

GET /api/editions/current
  Origin: https://evil.example.com
  -> 200 with no access-control-allow-origin header
```

The preview origin is echoed back exactly, credentials are allowed, and a foreign
origin gets no allow header at all, so the browser blocks it. That is the
behaviour the moved `frontendOrigin` is meant to produce.

The `bp-integ-` prefix on the integ stage is not observable from a preview URL and
was not checked.

## Change 5, the admin PIN no longer cloned from production

**Admin login does not work here, and the reason is not the one the change
predicts.**

`POST /api/admin/auth/login` with the repository's test PIN `lastloop` returns
401 with `{"error":"auth denied","reason":"invalid-pin"}`, both through the API
directly and through the form, which renders `Invalid PIN.` correctly. The
service returns `misconfigured` when the credential row is missing, so the row
exists — this preview schema kept the credential it already had, exactly as the
change predicts. What it kept is the production PIN, which is not in the
repository, so the admin area stays unreachable.

That is the same outcome as the baseline, for the same reason, so it is not a
regression. Two login attempts were made in total, one through the API and one
through the form; no PIN was guessed at, since the rate limit is five attempts
per five minutes and the value is a live secret. The only PIN in the repository is
the literal `lastloop`, whose scrypt hash is at
`apps/last-loop-lepin/test/database-utils.ts:30`, used only by the test suite.
There is no seeded credential under `apps/last-loop-lepin/api/src/__test/`.

**Worth flagging.** The comment above the auto-seed step in
`.github/workflows/preview.yml:140` says the seed endpoint "bootstraps the admin
password on first call". It does not.
`apps/last-loop-lepin/api/src/__test/test-seed.service.ts` contains no reference
to `adminCredentials`, `scryptHash` or any credential at all. So even a corrected
seed call would leave a fresh preview with no way into the admin area. With the
production clone now removed, a brand new preview schema will have no credential
row at all and will answer `misconfigured`. Everything behind the PIN — the setup
panel, the roster, the correction panel, the manual did-not-finish flow — stays
unchecked, and so does any admin write.

## Seeding

**The endpoint is healthy. The workflow's call to it is not, and never was.**

The prompt for this run described the fixture as a JSON body. It is not; it is a
query parameter. `test-seed.controller.ts` uses
`zValidator('query', seedFixtureSchema)`, and the preview behaves accordingly:

| Request | Status |
|---|---|
| `POST /api/__test/seed` with no body and no query | 400 |
| `POST /api/__test/seed` with `{"fixture":"race-finished"}` as a JSON body | 400 |
| `POST /api/__test/seed?fixture=race-finished` | 200 |

Both 400s carry the same Zod error, `path: ["fixture"]`, `received: "undefined"`.
A JSON body is ignored entirely.

All three fixtures seed cleanly through the query parameter, each returning 200
and a coherent race:

| Fixture | Response | Edition state | Standings |
|---|---|---|---|
| `race-down-to-one-survivor` | `{"fixture":"race-down-to-one-survivor","edition":"lepin-2026","runners":4}` | `live`, 17:00 to 09:00, top of the hour | Alice in race at loop 3, Bob out at L2, Carla and Dan out at L1 |
| `race-finished` | `{"fixture":"race-finished","edition":"lepin-2026","runners":4}` | `finished`, ended five minutes ago | All four out, Alice last at L5 |
| `top-with-dnf-candidates` | `{"fixture":"top-with-dnf-candidates","edition":"lepin-2026","runners":4}` | `live`, started 62 minutes ago | Alice and Bob in race at loop 1, Carla and Dan ex aequo and out at L0 |

`raceEnded` reads `true` on `race-down-to-one-survivor` even though the edition is
`live` and its window has not closed. That is deliberate:
`ranking.core.ts:187` sets `raceEnded: isRaceEndReached(edition, now) || inRaceCount <= 1`,
and the fixture leaves exactly one runner in the race. The spectator view shows
`Race over — final standings shown.` while still drawing a live runner marker and
a running countdown, which reads oddly but is the specified behaviour.

**The workflow call.** `.github/workflows/preview.yml:154` runs
`curl -X POST "$SEED_URL"` with no query string and no body. That is the first
row of the table above, a 400, which falls through the `case` statement to the
`*)` branch and emits a `::warning::` without failing the job. So the auto-seed
has never seeded this app, and the failure has only ever been a warning
annotation. The seeding mechanism itself is healthy; the call site is wrong. One
query parameter fixes it.

## The baseline checks, re-confirmed

### The spectator view and the map

Passes. The map draws the course polyline, the start marker and one runner
marker for the single runner still in the race. The marker moves. Sampling its
Leaflet transform every fifteen seconds over 75 seconds:

```
20:11:16  start (114px, 223px)   runner (170px, 143px)
20:11:31  start (114px, 223px)   runner (172px, 140px)
20:11:46  start (114px, 223px)   runner (173px, 139px)
20:12:01  start (114px, 223px)   runner (174px, 137px)
20:12:16  start (114px, 223px)   runner (175px, 135px)
20:12:31  start (114px, 223px)   runner (177px, 133px)
```

The start marker holds still and the runner marker advances steadily, which is
the right pair of behaviours. Evidence is `regress-spectator-live-1280.png` and
`regress-spectator-live-375.png`.

### Horizontal overflow

Passes everywhere. Each cell is `scrollWidth / clientWidth`.

| Route | 375 | 393 | 412 | 1280 |
|---|---|---|---|---|
| `/` spectator | 375 / 375 | 393 / 393 | 412 / 412 | 1280 / 1280 |
| `/archives` | 375 / 375 | 393 / 393 | 412 / 412 | 1280 / 1280 |
| `/r/alice` | 375 / 375 | 393 / 393 | 412 / 412 | 1280 / 1280 |
| `/admin` | 375 / 375 | 393 / 393 | 412 / 412 | 1280 / 1280 |

The argent touch session measured 375 / 375 as well, at a device pixel ratio of 2.

### The self punch button on a phone

Reachable and large enough. At 375 pixels the confirm button measures 104 by 44
with its right edge at x 338, and `Cancel` measures 78 by 44 — identical to the
baseline. A real touch tap through `Input.dispatchTouchEvent` opened the dialog
for Bob, whose `Close` button measured 286 by 44. Evidence is
`regress-argent-touch-punch-375.png`.

A write was made and it persisted. With geolocation set to 45.55, 5.78, the
dialog for Alice read `I am Alice, confirm loop 4?`, and confirming returned
`POST /api/self-punches` 201 with `Loop 4 confirmed!`. `/r/alice` afterwards
listed a fourth entry, `L4, Closed at 20:15, Δ 18:08, VALID`, and the standings
chip read `LOOP 4 · 08:15:08 PM`.

### Every route renders real data

Passes. `/` shows the countdown, the map and four standings chips. `/archives`
shows one edition dated 16 May 2026, 6.53 km with 260 m of climb, five finishers
and two CSV links. `/r/alice` shows the full loop history. `/admin` shows the PIN
form. An unknown path renders the application's own `Page not found.` with a
`Back to the race` link, not an origin error document.

### Console errors

None. `agent-browser errors` and `agent-browser console` both returned empty on
`/`, `/archives`, `/r/alice`, `/admin` and an unknown path. There is nothing to
quote because nothing was logged.

### API statuses

No 5xx anywhere. The only 4xx responses were deliberate or already recorded as
defect 3:

| Call | Status |
|---|---|
| `GET /api/editions/current`, `/api/editions`, `/api/standings/lepin-2026` | 200 |
| `GET /api/standings/{lepin-2026,3l-lepin-2026}/csv`, `/laps.csv` | 200 |
| `GET /api/editions/lepin-2026/runners/alice` and `/punches` | 200 |
| `OPTIONS /api/self-punches`, `/api/admin/auth/login` | 204 |
| `POST /api/self-punches`, first attempt | 201 |
| `POST /api/self-punches`, second attempt | 409, defect 1, deliberate |
| `POST /api/admin/auth/login` | 401, deliberate wrong PIN |
| `POST /api/__test/seed?fixture=…`, all three | 200 |
| `POST /api/__test/seed` with no query | 400, deliberate |
| `GET /favicon.svg` | 404, defect 3 |

## The four baseline defects

| Defect | Still reproduces | Evidence from this run |
|---|---|---|
| 1, the self punch dialog offers a loop the server refuses | **Yes, identically** | With Alice holding a confirmed loop 4 and the server's clock-derived loop still 4, reopening the dialog read `I am Alice, confirm loop 5?` and offered the full size `I am here` button. Tapping it returned 409 and `You already punched this loop.` `regress-self-punch-offers-loop5-375.png`, `regress-self-punch-already-punched-375.png` |
| 2, the language switcher is below the 44 pixel floor | **Yes** | `#language-switcher` measures 96 by 31 at 375 with a coarse pointer, while the three navigation links beside it measure 60 by 44, 83 by 44 and 69 by 44 |
| 3, the site requests an icon file that does not exist | **Yes** | `/favicon.svg` and `/favicon.ico` both answer 404 with `content-type: application/xml`, the origin's error document |
| 4, tap targets on the map and the archives below 44 pixels | **Yes, all of them** | Runner avatar marker 28 by 28, start and finish marker 16 by 16, archive runner links 76 by 20 and 70 by 20, Leaflet attribution links 43 by 14, 71 by 14 and 35 by 14. Leaflet's own zoom controls remain 44 by 44 |

Defect 1 is worth restating because it is the one that matters mid race. The
client label comes from `selectTargetLoopIndex` in
`apps/last-loop-lepin/site/src/components/organisms/self-punch.core.ts`, which
returns `runner.status.lastLoop + FIRST_LOOP_INDEX` and never reads the clock.
The server derives the loop from the wall clock through `loopIndexAt(edition, now)`
in `apps/last-loop-lepin/api/src/punch/punch.service.ts`. Between the moment a
runner closes loop N and the moment the next hour opens, the client advertises
N plus one while the server still considers N current. This run reproduced it
within seconds of a successful punch, which is exactly the state a runner who
taps twice lands in.

## What could not be checked

**Everything behind the admin PIN**, for the reason in change 5. That includes
the correction panel, and therefore the non-null path of
`mostRecentCorrectionAt` and the spectator's "results amended at" line.

**The `bp-integ-` prefix** on the integ stage, which is not reachable from a
preview URL.

**Real device behaviour.** No `/dev/kvm`, no Android SDK, not macOS, so only a
headless Chromium was available. Software keyboards, iOS Safari, scroll chaining
and `100vh` against a dynamic toolbar all stay unverified.

**Colour contrast**, not measured this session and unchanged since the baseline
measured it.

## What this run changed on the preview

The seed endpoint was called five times in total, so the `lepin-2026` edition was
rewritten repeatedly. It is left in the `race-down-to-one-survivor` state: `live`,
17:00:00 to 09:00:00 UTC, four runners, Alice in race and Bob, Carla and Dan out.

On top of that fixture this run created one self punch for `alice`, loop 4,
through `POST /api/self-punches` at 20:15 UTC. A second attempt was refused with
409 and wrote nothing. Two failed admin login attempts were made; both were
rejected and neither wrote a session.

The cloned edition `3l-lepin-2026` was not touched and is still listed on
`/archives` with its eighteen runners. `GET /api/editions/current` returns the
seeded edition rather than the cloned one, so anyone opening the preview link now
sees the four runner fixture. Redeploying the preview is the way back to a clean
clone.

## Screenshots

All under `docs/features/meta/preview-validation/last-loop-lepin/`.

| File | What it shows |
|---|---|
| `regress-spectator-live-1280.png` | The spectator view with the countdown at 42:28, the course, the moving `AL` marker and the four standings chips |
| `regress-spectator-live-375.png` | The same view at 375 pixels, top bar wrapped, no sideways scroll |
| `regress-archives-1280.png`, `regress-archives-375.png` | The archives page with both CSV links |
| `regress-runner-alice-375.png` | The runner profile showing the loop 4 punch this run created |
| `regress-admin-wrong-pin-375.png` | The `Invalid PIN.` error path |
| `regress-self-punch-offers-loop5-375.png` | Defect 1, the dialog offering `confirm loop 5` |
| `regress-self-punch-already-punched-375.png` | Defect 1, the `You already punched this loop.` result |
| `regress-argent-touch-punch-375.png` | The dialog opened by a real touch tap through `Input.dispatchTouchEvent` at 375 by 667 with a coarse pointer |
