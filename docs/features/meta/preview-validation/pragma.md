# Preview validation of `pragma` for PR 40

## Verdict

PASS with four defects, none of them blocking. Login works, all twelve routes
load with real data, every API call answered 200 or 201 on the normal path, and
three separate writes were confirmed to reach the database and survive a reload.
No page renders wider than its viewport at 375, 393 or 1280 pixels. No console
error and no uncaught error appeared anywhere in the walk.

The four defects are a missing favicon, touch targets below the size the login
screen already meets, an English plural that reads `1 bars`, and a create form
that keeps its values after a successful save so a second press of Save creates
a duplicate row.

The reorder defect recorded in
[`docs/dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md`](../../../dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md)
does **not** reproduce. The two `pragma` defects in the earlier
[mobile viewport audit](../mobile-viewport-audit/report.md) are both fixed.

## How the validation ran

`agent-browser` drove the functional walk over two sessions named `pragma` and
`pragma2`. `argent` drove the touch pass against `chromium-cdp-9225`. Because
argent has no viewport tool, a second CDP session was held open alongside it for
the whole touch pass, sending `Emulation.setDeviceMetricsOverride` and
`Emulation.setTouchEmulationEnabled`. That session measured
`matchMedia('(pointer: coarse)').matches` as `true`,
`matchMedia('(hover: none)').matches` as `true` and `navigator.maxTouchPoints`
as `5`, so the taps below were genuine coarse pointer input.

`curl` was used for the authoritative persistence checks, because it reaches the
API without the page's service worker in the path. That distinction turned out
to matter, and it is explained under *The preview database was re-seeded twice
during this run*.

### Authentication

The shared password is `pragma-preview`. It is the `SEED_ADMIN_PASSWORD`
constant in
[`apps/pragma/api/src/__test/test-seed.service.ts:28`](../../../../apps/pragma/api/src/__test/test-seed.service.ts),
written by `bootstrapAuth` when `POST /api/__test/seed` runs. The preview deploy
workflow calls that endpoint on every push, so the preview is loginable by
design.

A wrong password is handled correctly. Submitting `definitely-wrong-password`
produced `POST /api/auth/login` returning 401 and the page rendered an element
with `role="alert"` reading `Wrong password.`. The form stayed usable, and there
was no blank screen and no stack trace.

## The preview database was re-seeded twice during this run

This is not a defect, but it invalidates any naive reading of the persistence
checks, so it is recorded first.

`.github/workflows/preview.yml` line 148 posts to `/api/__test/seed` after every
preview deploy, and `seedPreviewFixture` calls `deleteAllDomainRows` before it
writes the fixture. Another agent was pushing to PR 40 while this validation
ran, so the whole domain database was wiped and recreated underneath the walk.
Two re-seeds were observed, at `19:08:05` and `19:12:49`, each identified by the
`createdAt` timestamp on every song row and by a completely new set of UUIDs for
songs, sessions, members and instruments.

The visible effect was a reorder that appeared to revert after a reload. It had
not reverted. The database had been reset to the seed order. Once the re-seed
was identified, the reorder check was re-run against the fresh fixture and
verified through `curl`, and it passed. The detail is under *Check 3*.

A second effect is worth recording because a future validator will hit it. The
site registers a service worker with caches `pragma-v2-shell` and
`pragma-v2-data`. After a re-seed, a tab that was open beforehand keeps serving
the pre-seed entities from `pragma-v2-data`, and `fetch(..., {cache:'no-store'})`
does **not** bypass it, because a no-store request still goes through the worker's
fetch handler. In that stale state the setlist editor rendered raw song UUIDs
such as `af19c622` in place of titles, because the cached song list no longer
contained the ids the fresh setlist entries referenced. Unregistering the worker
and clearing both caches restored the titles immediately. This is an artefact of
a mid-session database reset rather than something a real user can reach, so it
is not counted as a defect, but it is why every persistence claim below is
backed by `curl` rather than by the page.

## Results by route and viewport

Each cell reports `document.documentElement.scrollWidth` over
`document.documentElement.clientWidth`. A route fails when the scroll width
exceeds the client width, which is the page body scrolling sideways.

| Route | 375 | 393 | 1280 |
|---|---|---|---|
| `/login` | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| `/catalog` | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| `/catalog/:songId` | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| `/catalog/:songId/edit` | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| `/catalog/:songId/scene` | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| `/catalog/new` | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| `/sessions` | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| `/sessions/:id` | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| `/sessions/:id/setlist` | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| `/setlists` | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| `/bars` list view | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| `/bars` kanban view | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| `/members` | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| `/instruments` | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |

The tables and the kanban were the expected overflow risks and neither
overflows. The catalog status tabs and the bars kanban columns scroll inside
their own containers rather than pushing the body sideways, which is the correct
pattern.

The phone measurement taken through argent's own emulated session, at 375 by 667
with a coarse pointer, also read 375 over 375 on `/login`, `/catalog`,
`/setlists` and `/sessions/:id`.

## Priority checks

### Check 1, login

Pass. Wrong password rejected with a visible message and HTTP 401. Correct
password logged in and landed on `/catalog`. Logging in from a deep link at
`/sessions/:id/setlist` redirected back to that route after authentication
rather than dumping the user on the home page.

A fresh browser profile opening `/catalog` while logged out redirected to
`/login` and issued **zero** API requests. This is the fix for defect 14 of the
earlier audit and it is confirmed working.

### Check 2, every route loads with real data

Pass. All twelve routes rendered fixture data: six songs with three concert
ready, one concert session at Le Petit Bain, one setlist of six entries, four
members, five instruments. Every API call on the normal path returned 200 or
201. The full inventory is at the end of this report.

The sidebar badge reads `Catalog 3` while the catalog header reads `6 songs`.
That is not a defect. `useNavBadges` deliberately badges the concert-ready count,
not the total.

### Check 3, a write persists

Pass, on three independent writes.

**Bar created.** `POST /api/bars` returned 201, the row appeared in the list, and
after a full page reload the row was still present with its city and capacity
intact.

**Mastery default written.** Clicking the Alice / Guitar cell in the mastery
matrix turned it into a number input. Setting it to `7` issued
`PUT /api/mastery/defaults` returning 200, and the row average changed from `—`
to `7.0`. After a reload the cell still read `7`, and
`GET /api/mastery/defaults` returned
`{"defaults":[{"memberId":"60added1…","instrumentId":"3c4af86b…","score":7}]}`.

**Setlist reordered.** Covered under check 5.

**Bar deleted.** `DELETE /api/bars/:id` returned 200 and `curl` confirmed
`{"bars":[]}` afterwards.

Objects created during this validation: three bars named `ZZ Validation Bar`,
`AA Second Bar` and `Dup Test Bar`, plus one duplicate `Dup Test Bar` created to
prove defect 4. All were removed, either by the delete button or by the
automatic re-seed. One mastery default of 7 for Alice on Guitar was written and
was removed by the re-seed. The preview database currently holds only the seed
fixture.

### Check 4, the headless tables

Pass for the bars list. The rows genuinely reorder, they do not merely flip a
header arrow:

- Click `NAME` once: `ZZ Validation Bar`, `AA Second Bar`.
- Click `NAME` again: `AA Second Bar`, `ZZ Validation Bar`.
- Click `CAPACITY` once: `AA Second Bar` (300), `ZZ Validation Bar` (77).
- Click `CAPACITY` again: `ZZ Validation Bar` (77), `AA Second Bar` (300).

The catalog filters also work. The search box narrowed seven song links to one
on the term `Midnight`, and the status tabs carry live counts of 6, 3, 2, 1 and
0.

The mastery matrix renders through `useReactTable` but its column headers are
not sortable, and no filter is offered. That is a reasonable design for a matrix
whose rows and columns both carry averages, so it is recorded as an observation
rather than a defect. Its data is real: writing a score changed the row average
and the column average.

### Check 5, the setlist drag and drop

Pass, and the known dantotsu does not reproduce.

The list uses dnd-kit with three sensors, so it was exercised two ways.

**Keyboard sensor.** Focusing the drag handle and pressing Space, ArrowDown,
Space moved entry 1 below entry 2. `PUT /api/setlists/:id/reorder` returned 200.
Polling the entries endpoint with `curl`, from outside the browser, four times
over sixteen seconds returned the new order every time:
`5f88,af19,832a,935b,d47d,2e18` where `af19` is Slow Burn and `5f88` is Midnight
Drive.

**Pointer drag through argent, at 375 by 667 with touch emulation on.** A drag
of the handle from `y=0.172` to `y=0.41` over 1200 ms moved Slow Burn below
Midnight Drive. The list held the new order when re-read at 3, 9 and 19 seconds
after the drop.

On the dantotsu specifically: the network log shows the reorder issues
`PUT /api/setlists/:id/reorder` and **no** follow-up `GET .../entries`. The
mutation reconciles from its own response rather than from a fresh read, which
is exactly the countermeasure the dantotsu prescribes. The UI never reverted a
second later in any of the three reorders performed.

### Check 6, i18n

Pass. The `FR` and `EN` buttons in the sidebar are a working toggle with correct
`aria-pressed` state. Switching to French translated the navigation
(`Catalogue`, `Membres`, `ERP DU GROUPE`), the headings and the controls
(`Copier l'ordre`, `ÉNERGIE`, `Tous les membres`).

Scanning the rendered text of all six main routes in French for anything shaped
like a translation key returned nothing on every route. `Lineup` stays in English
in the French build, but that is deliberate: `fr.json` line 231 sets
`lineup.edit` to the string `Lineup`.

Two i18n problems were found and are written up as defects 3 and 5 below.

### Check 7, console and page errors

Pass. `agent-browser errors` and `agent-browser console` returned empty output
after every route visit, after every write, and after every reorder. There is
nothing to quote verbatim, because nothing was logged.

### Check 8, 375 pixels

Pass on every route at all three widths. See the table above.

### Check 9, coarse pointer reachability

Mostly pass, with defect 2 as the caveat. Through argent at 375 by 667 with
touch emulation, a tap opened the password field, the on-screen keyboard input
typed the password, a tap on `Enter` logged in, a tap on the hamburger opened
the navigation drawer, a tap on `Setlists` navigated, and a tap on the setlist
card opened the session. Every one of those controls was reachable. The controls
that are hard to hit are the small secondary ones listed in defect 2.

## Defect 1, `/favicon.ico` returns 404 on every page load

**What I did.** Opened any page in a fresh browser profile and read the network
log.

**What I expected.** No 404.

**What happened.** `GET https://pragma-pr-40.preview.borso.fr/favicon.ico`
returns HTTP 404, twice per load. It appears on the very first request of a cold
profile, before login, and on every subsequent navigation.

This is the same class as defect 15 of the earlier audit, which recorded it
against `borso-fr`. It is reported here as a separate instance because the
earlier audit never got past the `pragma` login screen and did not attribute it
to this app. The fix is the same: ship the file, or declare an explicit icon link
in `apps/pragma/site/index.html`.

Evidence: `pragma/login-375.png` was captured in the same session whose network
log contains the two 404 lines.

## Defect 2, touch targets inside the app are far below the 44 pixel bar the login screen meets

**What I did.** At a 375 pixel viewport, on each route, measured the bounding box
of every `button`, `a`, `input`, `select` and `[role=slider]` and listed those
under 44 pixels on either axis.

**What I expected.** 44 pixels, because that is precisely what the login screen
was changed to after defect 9 of the earlier audit. The password input, the
`Enter` button and the show-password button now measure 293 by 44, 293 by 44 and
44 by 44. The intent is unambiguous.

**What happened.** Almost nothing behind the login screen meets that bar.

| Route | Control | Measured |
|---|---|---|
| `/instruments` | `Harmonic (counts for transition analysis)` checkbox | 13 x 13 |
| `/bars` | `NAME` sort header | 242 x 15 |
| `/bars` | `STATUS` sort header | 41 x 15 |
| `/bars` | bar name link | 93 x 20 |
| `/bars` | `List` / `Kanban` view toggle | 44 x 24, 67 x 24 |
| `/members` | member name button | 221 x 20 |
| `/instruments` | instrument name button | 177 x 20 |
| `/members` | mastery matrix cell | 48 x 26 |
| `/sessions/:id/setlist` | `Drag to reorder` handle | 24 x 24 |
| `/sessions/:id/setlist` | `Edit`, `Remove` | 28 x 28 |
| `/sessions/:id/setlist` | `Lineup` | 52 x 28 |
| `/sessions/:id/setlist` | member filter tabs | 72 x 32 to 92 x 32 |
| `/catalog` | status filter tabs | 47 x 40 to 92 x 40 |
| drawer | navigation links | 33 tall |

Two of these fail even the much lower WCAG 2.5.8 AA floor of 24 by 24 pixels:
the harmonic checkbox at 13 by 13, and the bars sort headers at 15 pixels tall.
The rest sit between 20 and 40 pixels, which is usable but noticeably fiddly on
a phone, and inconsistent with a login screen that was explicitly corrected to
44.

Evidence: `pragma/instruments-375.png`, `pragma/bars-375.png`,
`pragma/members-375.png`,
`pragma/sessions-e81e1665-1887-48d3-8725-da29904fb31b-setlist-375.png`.

The fix belongs in the same place the login fix went, the `cva` variant tables in
`apps/pragma/site/src/components/atoms/`, plus a real touch area on the checkbox
and on the drag handle.

## Defect 3, the stale bars banner reads `1 bars`

**What I did.** Created one bar, then deleted the second one so exactly one bar
existed, and read the banner.

**What I expected.** `1 bar hasn't been touched…`.

**What happened.** The banner rendered
`1 bars haven't been touched in 60+ days — give them a poke.`

`apps/pragma/site/src/i18n/en.json` line 224 defines `staleBanner` as a single
string interpolating `{{count}}`, with no `staleBanner_one` and
`staleBanner_other` plural forms, so i18next has no plural to select. `fr.json`
line 224 has the same shape and the same problem, where `1 bars n'ont pas été
relancés` should be `1 bar n'a pas été relancé`.

Evidence: `pragma/bars-plural-and-form-1280.png`, and the banner text was read
directly out of the live `[role=alert]` element.

## Defect 4, the create form keeps its values after a successful save, so Save twice creates a duplicate

**What I did.** On `/bars`, typed `Dup Test Bar` into the New bar form, pressed
`Save`, waited for the row to appear, then pressed `Save` again without touching
any field.

**What I expected.** The form clears after a successful create, so the second
press does nothing or is disabled.

**What happened.** After the first save the `NAME` field still read
`Dup Test Bar`. The second press issued a second `POST /api/bars`, which
returned 201, and the list then held two rows both named `Dup Test Bar`.

The same non-reset was observed on the first bar created in this walk, where
`NAME`, `CITY` and `CAPACITY` all kept `ZZ Validation Bar`, `Testville` and `77`
after a successful 201.

Evidence: `pragma/bars-plural-and-form-1280.png` shows the New bar panel still
holding `Dup Test Bar` while the row of the same name already exists in the list
to its left.

The form is `useForm` from `@tanstack/react-form` in
`apps/pragma/site/src/routes/bars/BarForm.tsx` line 83, and its `onSubmit` never
calls `form.reset()`. The same form component backs the edit flow, where keeping
the values is correct, so the reset needs to be conditional on the create path.

## Defect 5, `<html lang>` is hard-coded to `fr` and never follows the language toggle

**What I did.** Switched the UI to English, confirmed `aria-pressed` was `true`
on `EN` and that the navigation read `Catalog`, `Sessions`, `Members`, then read
`document.documentElement.lang`.

**What I expected.** `en`.

**What happened.** `fr`. `apps/pragma/site/index.html` line 2 declares
`<html lang="fr">` and nothing in the i18n layer updates it. A grep for
`documentElement.lang` across `apps/pragma/site/src/i18n/` and
`apps/pragma/site/src/components/` returns nothing.

A screen reader will therefore pronounce the entire English UI with French
phonetics. This is small, and it is a one-line fix in the language switcher, but
it is a real accessibility defect rather than a cosmetic one.

## Known defects from the earlier audit, re-checked

| Earlier defect | Status now |
|---|---|
| Defect 9, pragma login controls shorter than 44 pixels | **Fixed.** Password input 293 x 44, `Enter` 293 x 44, show-password 44 x 44, all measured at a 375 viewport. |
| Defect 14, pragma requests an authenticated endpoint before login | **Fixed.** A cold browser profile opening `/catalog` redirects to `/login` and issues zero API requests. No 401 and no console error. |
| Defect 15, favicon 404 | Recorded against `borso-fr` there. It also reproduces on `pragma`, and is reported above as defect 1. |

The earlier audit measured only `/login` for this app and explicitly left
everything behind the shared password unaudited, so there are no other prior
`pragma` findings to re-check.

## API calls observed

Counts are across both browser sessions and include repeated route visits.

| Call | Status | Count |
|---|---|---|
| `POST /api/auth/login` | 200 | 1 |
| `POST /api/auth/login` | 401 | 1 (deliberate wrong password) |
| `OPTIONS /api/auth/login` | 204 | 1 |
| `GET /api/songs` | 200 | 18 |
| `GET /api/sessions` | 200 | 18 |
| `GET /api/instruments` | 200 | 28 |
| `GET /api/members` | 200 | 9 |
| `GET /api/bars` | 200 | 21 |
| `GET /api/mastery/defaults` | 200 | 4 |
| `GET /api/setlists/by-session/:id` | 200 | 5 |
| `GET /api/setlists/by-session/:id` | 404 | 2 (session deleted by the re-seed) |
| `GET /api/setlists/:id/entries` | 200 | 4 |
| `POST /api/bars` | 201 | 2 |
| `DELETE /api/bars/:id` | 200 | 2 |
| `PUT /api/setlists/:id/reorder` | 200 | 1 |
| `PUT /api/mastery/defaults` | 200 | 1 |
| `OPTIONS` on `/api/bars`, `/api/bars/:id`, `/api/setlists/:id/reorder` | 204 | 4 |
| `GET /favicon.ico` | 404 | 2 per page load |

Three responses in the log are not normal-path failures and are recorded here so
they are not mistaken for defects.

- The two `GET /api/mastery/defaults` 401 and two `GET /api/bars` 401 came from
  an experiment that cleared cookies on an already-open tab. The service worker
  kept the page mounted with cached data instead of redirecting, so the
  still-running queries hit the API without a session. A genuine logged-out
  visit, tested on a clean profile, issues no API calls at all.
- The two `GET /api/setlists/by-session/:id` 404 came from the second re-seed
  deleting the session the tab was pointed at. The app handled it correctly,
  rendering an empty state reading `No setlist created for this session yet.`
  with a `Create a setlist` action rather than crashing.

`GET /api/instruments` is fetched more often than the other lists, but that is
an artefact of how many times routes were re-opened. All callers go through a
single `useInstrumentsList` hook with one `instrumentKeys.list()` query key, so
there is no key drift and no duplicate in-page request.

## What could not be checked, and why

- **MusicBrainz lookup on `/catalog/new`.** The page offers a search box labelled
  `Tape un titre ou un interprète — résultats MusicBrainz`. It calls a
  third-party service, so a failure would not distinguish a defect in this PR
  from an upstream outage or from the sandbox proxy. Not exercised.
- **File uploads.** `/api/uploads` exists and the song edit form offers PDF and
  image chart attachments plus member avatars. No upload was attempted, so the
  S3 presign path and the uploads controller are unverified.
- **Song create, song edit and session create writes.** The forms render
  correctly and their fields are populated from real data, but only the bars,
  mastery and setlist-reorder write paths were driven end to end. The database
  was being reset every few minutes, which made longer multi-step write flows
  unreliable to verify.
- **Transitions and the risky-transition warnings.** The session detail page
  rendered `Risky transition` markers against setlist entries. Whether the
  underlying `/api/transitions` rules are correct was not assessed, because that
  needs a known-good expected result rather than a smoke check.
- **Offline behaviour.** The app registers a service worker with a shell cache
  and a data cache. Offline mode was not exercised.
- **Real phones.** There is no `/dev/kvm`, no Android SDK and no macOS in this
  sandbox, so every phone measurement is Chromium with
  `Emulation.setDeviceMetricsOverride` and touch emulation rather than real
  hardware.
- **A stable database.** Two re-seeds landed mid-run because another agent was
  pushing to PR 40. Every persistence claim above was re-verified through `curl`
  after the second re-seed, but a validation run against a quiet preview would be
  more trustworthy.

---

# Regression check at `f88e1d0`

Run on 2026-08-08, roughly 20:00 to 21:00 UTC. Baseline for comparison is the
report above, taken at `cebe107`.

## Verdict

**No regressions found.** All four changes behave the way the change
description says they do, and every baseline behaviour that was re-checked still
holds. The four defects the baseline recorded are unchanged except for one,
which is now fixed.

Two problems were found that are **not** attributable to these four commits, and
that the baseline could not have seen. Both are written up at the end so they
are not mistaken for regressions.

## How this run drove the preview

`agent-browser` on a single session named `pragma-regress` did the functional
walk. `argent`'s browser on `chromium-cdp-9225` did the phone pass, driven
through a direct CDP session that held `Emulation.setDeviceMetricsOverride` and
`Emulation.setTouchEmulationEnabled` open for the whole pass, because those
overrides are dropped when the client disconnects. That session measured
`(pointer: coarse)` true, `(hover: none)` true and `navigator.maxTouchPoints` 5
at 375 by 667. Taps and drags used `Input.dispatchTouchEvent`, per the recipe;
`gesture-tap` was not attempted.

`curl` against `https://pragma-pr-40-api.preview.borso.fr` did every
authoritative check. The site origin was never used for an API assertion.

## The database was re-seeded at least five times during this run

This is the trap the brief warned about, and it fired repeatedly rather than
once. The fixture was rewritten at `19:57:59`, at `20:31:10`, and at least three
more times between `20:35` and `20:50`. Each re-seed truncates first and mints
new UUIDs for every song, session, setlist, member and instrument.

It produced two false alarms that were chased down and dismissed:

- **Apparent 404s on every by-id route.** A route sweep showed
  `GET /api/songs/:id` and `GET /api/sessions/:id` returning 404 twice per load
  on the song detail, edit, scene and session detail routes, using ids that had
  been valid minutes earlier. Re-fetching the id list and immediately calling
  `by-id` returned 200 on all six songs, three times each. The endpoint is
  healthy; the ids had been wiped between fetching and using them. A repeat
  sweep with just-fetched ids showed zero 4xx and zero 5xx on every route.
- **An empty `/setlists` page.** One load rendered
  `No setlist created yet` while the sidebar badge read `Setlists 1`. A reload a
  few seconds later listed `Le Petit Bain` correctly. This was a read landing
  between the truncate and the insert of a re-seed.

Every write recorded below was verified with `curl` at the moment it was made,
against the ids that were current at that moment. All of the test data was later
destroyed by a re-seed, which is why the preview now holds only the seed fixture.

The sandbox proxy also reset the connection on a handful of `curl` calls, with
`Recv failure: Connection reset by peer`. Each one succeeded on retry, and the
two cases that first appeared as a reset were re-run ten times each and returned
401 every time. They were transport noise, not server behaviour.

## Change 1, `<html lang>` follows the language switcher

**Status: works, and it fixes baseline defect 5.**

One correction to the brief's expectation. `document.documentElement.lang` is
`en` on load in this browser, not `fr`, and the interface renders in English.
That is correct behaviour rather than a fault: the app follows the detected
language, and this Chromium reports English. The attribute matches whatever
language is actually being rendered, which is the point of the change.

What was checked:

- On a cold load of `/login`, `lang` is `en` and the page reads
  `Shared password` and `Enter`.
- Twelve switches driven through the CLI, alternating `FR` and `EN` with a pause
  after each. Every one tracked: `lang` became `fr` with the navigation reading
  `Catalogue`, and `en` with it reading `Catalog`, and `aria-pressed` followed
  the active button each time.
- Twenty more switches in a single in-page loop with 150 ms between each. The
  sequence read `fr:fr en:en` twenty times with no drift and no missed update.
- A first attempt at this burst clicked twenty times synchronously with no pause
  and produced `fr,en,en,en,…`. That is the test reading the attribute before
  React and i18next settle, not a defect, and it is recorded here so the next
  validator does not mistake it for one.
- The attribute is also correct on load, not only after a switch. Touring eleven
  routes in French, every one reported `lang` as `fr` after a full page reload,
  and twelve routes in English reported `en`.
- On the second, independent browser used for the phone pass, a cold load
  reported `lang` as `en`.

On the subscription leaking: **this could not be measured directly.** i18next is
not exposed on `window`, so the listener count is not observable from the page.
The indirect evidence is that after roughly thirty-two switches and around fifty
route loads, the attribute still tracked correctly, `agent-browser console` and
`agent-browser errors` were both empty, and the JS heap read 18 MB before the
twenty-switch burst and 13 MB after it. Nothing degraded, but the claim rests on
behaviour rather than on a listener count.

## Change 2, the deleted branches in `session-cookie.utils.ts`

**Status: no crash found. Every corrupt cookie was rejected cleanly.**

This was the priority check. A valid login first, to have a known-good cookie as
a control, then thirty-five deliberately corrupt cookie values against
`/api/bars`, then six of those shapes against seven authenticated endpoints.

Everything the app answered was a 401 with a JSON body naming the reason. There
was **no 500 and no empty response** at any point. Representative results:

| Cookie value | Result |
|---|---|
| valid cookie (control) | 200 |
| empty value | 401 `malformed` |
| a single `.` | 401 `malformed` |
| payload with no separator | 401 `malformed` |
| payload with empty signature | 401 `malformed` |
| empty payload with signature | 401 `malformed` |
| `!!!!` and `****` as payload and signature | 401 `bad-signature` |
| truncated payload | 401 `bad-signature` |
| truncated signature | 401 `bad-signature` |
| right-length signature, wrong bytes | 401 `bad-signature` |
| standard base64 `+` and `/` alphabet | 401 `bad-signature` |
| `%zz.%zz` and other bad percent escapes | 401 `bad-signature` |
| `%E0%A4` truncated UTF-8 escape | 401 `bad-signature` |
| a quoted value | 200 (quotes stripped by the cookie parser) |
| `' OR 1=1--` | 401 `bad-signature` |
| `../../etc/passwd` | 401 `malformed` |
| six dot-separated segments | 401 `bad-signature` |
| 8 KB of `A` as the payload | 401 `bad-signature` |
| base64 of `not json at all` as payload | 401 `bad-signature` |
| base64 of `{"expiresAt":1e999}` as payload | 401 `bad-signature` |

Three results came from in front of the application and are recorded so they are
not misread. Emoji and Cyrillic cookie values were rejected by API Gateway with
`400 Invalid request`. A 32 KB cookie was rejected by the proxy with a 400
header-too-large page. Accented Latin characters and a JSON-shaped value made
Hono's cookie parser return nothing at all, so the middleware answered
`401 session-required`. None of these reach the code under test, and none is a
crash.

The same six shapes against `/api/bars`, `/api/songs`, `/api/members`,
`/api/instruments`, `/api/sessions`, `/api/mastery/defaults` and `/api/setlists`
returned 401 in all forty-two cases.

Malformed login bodies were also checked, since they share the route: an empty
body, `{`, `null`, `[]`, `{"password":null}`, `{"password":123}`,
`{"password":""}` and `{"nope":1}` all returned 400. A wrong password returned
401 with `{"error":"invalid-password"}`.

**One limit on this check, stated plainly.** The removed try/catch wrapped
`Buffer.from(value, 'base64url')`, and that decode is reachable from outside,
which is what the table above exercises. The three removed null guards sit
*after* the signature comparison. Reaching them requires a payload whose HMAC
verifies, which requires the key in `pragma.app_config.hmac_key`. That key was
not available to this run, so **the post-signature path was not exercised
against the live API.** Reading the deployed source's local counterpart, the
`parseJsonPayload` try/catch around `JSON.parse` is still present, and
`timingSafeEqual` is still guarded by an explicit length comparison, which is the
call that would otherwise throw on a length mismatch.

One incidental observation, pre-existing and not a regression: the signature
comparison tolerates base64 padding, so appending `==` to a valid signature still
verifies. Base64url decoding ignores the padding, so several distinct strings
verify against one signature. It does not let an attacker forge anything, since
the payload is signed literally.

## Change 3, `transposeChord` edge cases and the embed fallback

**Status: both behave exactly as described.**

The seed fixture gives every song `chart: null` and no links, so both had to be
created first. A ChordPro chart was written through the song edit form and
confirmed in the database through `curl`:

```
[C]Normal [G]line [Am]here
[Cb]Flat-C [Fb]Flat-F [E#]Sharp-E [B#]Sharp-B
[Bb]Bflat [F#]Fsharp [Dm7]minor7 [C/E]slash
```

Driving the transpose buttons in scene mode:

| Transpose | Line 1 | Line 2 | Line 3 |
|---|---|---|---|
| `+0` | `[C] [G] [Am]` | `[Cb] [Fb] [E#] [B#]` | `[Bb] [F#] [Dm7] [C/E]` |
| `+1` | `[C#] [G#] [A#m]` | `[Cb] [Fb] [E#] [B#]` | `[B] [G] [D#m7] [C#/E]` |
| `+2` | `[D] [A] [Bm]` | `[Cb] [Fb] [E#] [B#]` | `[C] [G#] [Em7] [D/E]` |
| `-1` | `[B] [F#] [G#m]` | `[Cb] [Fb] [E#] [B#]` | `[A] [F] [C#m7] [B/E]` |

`Cb`, `Fb`, `E#` and `B#` are left untouched at every step, which is the stated
behaviour. Everything else transposes correctly, flats are re-emitted in the
sharp convention, and returning to `+0` restored the original line exactly.

One observation, pre-existing and outside the scope of this change: a slash chord
transposes only its root. `C/E` becomes `C#/E` and then `D/E`, because the bass
note lives in the suffix, which is carried through verbatim. It is consistent
rather than crashing, so it is recorded as an observation rather than a defect.

For the embed fallback, four links were added to the same song and confirmed in
the database. On the song detail page:

| Link | Rendered as |
|---|---|
| `youtube.com/playlist?list=PLabcdef123456` | plain `<a>`, no iframe |
| `youtube.com/@nova-reef` | plain `<a>`, no iframe |
| `youtube.com/watch?v=dQw4w9WgXcQ` | iframe to `youtube.com/embed/dQw4w9WgXcQ` |
| `open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT` | iframe to `open.spotify.com/embed/track/…` |

The playlist and the channel fall back to a plain link, exactly as described. No
blank panel, no console error. Evidence: `pragma/regress-song-detail-embeds-1280.png`.

## Change 4, the two files split for `max-lines`

**Status: no dropped props on either screen.**

**`SongDetailSidebar`.** The sidebar renders and its data is genuinely per song,
not hard-coded. Base energy read `9/10`, `3/10`, `8/10` and `6/10` on Lightning,
Slow Burn, Runaway Sun and Midnight Drive, matching `baseEnergy` of 9, 3, 8 and 6
in the API for those songs, and the tonality and status lines matched too. With
the seed fixture the default lineup and mastery panels show a dash, which is
correct, because the fixture ships an empty lineup for every song.

To prove the panels are live rather than dead, a default lineup was written
through the modal. The modal listed all four members and all five instruments,
saving persisted the assignment to the database, reopening the modal pre-filled
the saved values, and after a reload the sidebar rendered `Alice GUITAR`,
`Bob BASS`, `Carla KEYS`, `Dan DRUMS` with a matching mastery row per member.
Evidence: `pragma/regress-song-detail-sidebar-1280.png` and
`pragma/regress-song-detail-embeds-1280.png`.

**`SetlistEntryDragPreview` and the inline editor.** Both render.

The drag preview appears while a drag is in flight. With a keyboard drag held
open, the dragged song's title was present twice in the page, once in the list and
once in the floating preview, and the preview is visible in
`pragma/regress-setlist-drag-preview-1280.png` as an elevated card above the row
it was lifted from.

The inline editor opens with `KEY (OVERRIDE)`, `CAPO` and `NOTES`, all three of
which are real and all three of which persist. Writing `F#`, `3` and
`regression-check-note` and reading the entries endpoint through `curl` returned
`key=F#`, `capo=3`, `notes='regression-check-note'` on position 0 and untouched
values on the other five entries.

## Baseline behaviours re-confirmed

**Login.** A wrong password returns 401 from `POST /api/auth/login` and the page
renders a `role="alert"` element reading `Wrong password.`, with the form still
usable. The correct password lands on `/catalog`. A logged-out visit to
`/catalog` redirects to `/login` and issues **zero** API requests, which is the
baseline's defect 14 fix still holding.

**Every route loads with real data, and no 4xx or 5xx on the normal path.** All
thirteen routes were swept while reading `responseStatus` from Resource Timing.
With ids fetched immediately before the sweep, every API call returned 200. The
earlier 404s are explained under the re-seed section above.

**A write persists across a reload.** A bar created through the form was
confirmed through `curl` as `Regress Check Bar | Regressville | 142 | lead`, and
after a full page reload the name, city and capacity were all still rendered,
with zero failed API calls on that load. The chart, the links, the default
lineup and the three setlist entry fields were each separately confirmed through
`curl` as well.

**The setlist reorder does not revert, and issues no follow-up `GET`.** Checked
twice, on two different input paths.

- Keyboard sensor, at 1280. Focusing the drag handle and pressing Space,
  ArrowDown, Space moved Slow Burn below Midnight Drive. The page issued exactly
  one call, `PUT /api/setlists/:id/reorder`, and **no** `GET .../entries`. The UI
  order and the database order were polled together four times over about twenty
  seconds and agreed on every poll, with no revert and no further calls.
- Touch drag, at 375 by 667 with a coarse pointer, on the second browser. Dragging
  the first handle down the list moved Slow Burn to the end. Again exactly one
  `PUT .../reorder` and no follow-up `GET`. The order held at eight seconds, and
  the database read back
  `Midnight Drive, Lightning, Afterglow, Runaway Sun, Last Call, Slow Burn`,
  matching the UI exactly.

The countermeasure in
[`docs/dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md`](../../../dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md)
is intact on this path.

**The sortable bars table.** Working, with a three-state cycle. This one needs a
correction to an earlier reading in this run: clicking the text `Capacity` with a
text locator hits the form's field label, not the table header, and produces no
change, which briefly looked like a dead control. Targeting the header button
inside the `ul[aria-label="Bars"]` shows it works. With two bars, AA at capacity
300 and ZZ at capacity 77:

| Action | Header state | Row order |
|---|---|---|
| start | capacity descending | AA (300), ZZ (77) |
| click Capacity | capacity ascending | ZZ (77), AA (300) |
| click Capacity | no sort | AA, ZZ |
| click Name | name ascending | AA, ZZ |
| click Name | name descending | ZZ, AA |
| click Name | no sort | AA, ZZ |

The rows genuinely move and the arrow indicator tracks the direction.

**Catalog search and filters.** The search box narrowed six songs to one on
`Midnight`. The `Concert-ready` tab showed exactly the three concert-ready songs.
The tab counts read 6, 3, 2, 1 and 0.

**No raw i18n key on any route in either language.** Eleven routes were scanned
in French and twelve in English for anything shaped like a translation key. Every
scan returned nothing. French headings rendered as `Catalogue`,
`Nouveau titre`, `Membres`.

**No console error anywhere.** `agent-browser console` and `agent-browser errors`
were cleared and re-read after each of the heaviest routes, including the song
detail page carrying two live iframes, scene mode, the setlist, members and bars.
Every read was empty. There is nothing to quote because nothing was logged.

**No horizontal overflow at 375, 393 and 1280.** All thirteen routes at all three
widths reported a scroll width equal to the client width. The phone pass measured
375 over 375 on the setlist route independently.

| Route | 375 | 393 | 1280 |
|---|---|---|---|
| `/login` | pass | pass | pass |
| `/catalog` | pass | pass | pass |
| `/catalog/new` | pass | pass | pass |
| `/catalog/:songId` | pass | pass | pass |
| `/catalog/:songId/edit` | pass | pass | pass |
| `/catalog/:songId/scene` | pass | pass | pass |
| `/sessions` | pass | pass | pass |
| `/sessions/:id` | pass | pass | pass |
| `/sessions/:id/setlist` | pass | pass | pass |
| `/setlists` | pass | pass | pass |
| `/bars` | pass | pass | pass |
| `/members` | pass | pass | pass |
| `/instruments` | pass | pass | pass |

## The baseline's defects, re-checked

| Baseline defect | Status now |
|---|---|
| 1, `/favicon.ico` returns 404 | **Still present.** Two 404s on a cold load, seen in Resource Timing before login. |
| 2, touch targets below 44 pixels | **Not re-measured this run.** No claim either way. |
| 3, the banner reads `1 bars` | **Still present**, in both languages. With exactly one bar the English banner read `1 bars haven't been touched in 60+ days — give them a poke.` and the French read `1 bars n'ont pas été relancés depuis +60 jours — un petit coup de fil ?`. |
| 4, the create form keeps its values after a save | **Still present.** After a successful 201 the name, city and capacity fields still held `Regress Check Bar`, `Regressville` and `142`. Evidence: `pragma/regress-bars-form-not-reset-1280.png`. |
| 5, `<html lang>` hard-coded to `fr` | **Fixed.** This is change 1 above. |

## Two findings that are not regressions

Both are recorded because they are real, and both are explicitly marked as not
attributable to the four commits under test.

### The song update write does not converge in the UI until a reload

**Not attributable to change 4.** The extracted sidebar receives and renders its
props correctly, as shown above. The problem is in the query layer, and the
baseline never drove this flow, so there is no evidence it is new.

Saving a default lineup writes correctly but the panel keeps showing the old
value, for as long as the page stays open. Captured with a response spy on the
mutation:

- `PUT /api/songs/:id` returned 200, and its body carried the **complete new**
  lineup including the member just added.
- The follow-up `GET /api/songs/:id` returned the **pre-write** lineup, without
  that member.
- `curl` from outside the browser, three times in a row, returned the new lineup
  including the member. The write was committed.
- The panel rendered the stale `GET` and still showed the old lineup fifteen
  seconds later. A reload showed the correct value immediately.

This is the same shape as the reorder dantotsu. The reorder path follows the
countermeasure and reconciles from its own mutation response, which is why it
passes. The song update path invalidates and refetches instead, and the refetch
is served a pre-commit snapshot, which is exactly what CLAUDE.md's rule about not
blind-refetching a write whose result the client already holds is meant to
prevent. Evidence: `pragma/regress-song-detail-lineup-stale-1280.png`.

### Scene mode lyrics are close to unreadable

**Not attributable to any of the four changes**, and invisible to the baseline,
because no song in the seed fixture has a chart, so the baseline could not render
this screen with content.

Scene mode is the full-screen performance view, on a near-black background. The
chart container overrides the dialog's light text colour with a dark ink token.
Measured on the live page:

| Element | Colour | Background | Contrast |
|---|---|---|---|
| lyric text | `rgb(61, 52, 42)` | `rgb(13, 10, 7)` | **1.62 to 1** |
| chord text | `rgb(45, 95, 160)` | `rgb(13, 10, 7)` | **3.06 to 1** |

WCAG AA asks for 4.5 to 1 for text this size. The lyrics at 1.62 to 1 are barely
distinguishable from the background, which matters more than usual because this
screen exists to be read on stage. The same chart renders with good contrast on
the song detail page, so the problem is specific to the dark scene dialog.
Evidence: `pragma/regress-scene-mode-contrast-1280.png`.

## What could not be checked, and why

- **The post-signature branches in `session-cookie.utils.ts`**, as explained
  under change 2. Reaching them needs the HMAC key.
- **i18next listener accumulation**, as explained under change 1. i18next is not
  reachable from the page, so the leak question was answered behaviourally rather
  than by counting subscribers.
- **Touch target sizes**, the baseline's defect 2. Not re-measured.
- **MusicBrainz lookup, file uploads and offline behaviour.** Not exercised, for
  the same reasons the baseline gives.
- **A quiet database.** The fixture was rebuilt at least five times during this
  run. Every claim above was tied to a `curl` read taken at the time, but a run
  against a preview nobody is deploying to would be more trustworthy.

## Data left behind

None that survived. Three bars, a ChordPro chart, four external links, a
four-member default lineup, and key, capo and notes on one setlist entry were
created during this run, and every one of them was destroyed by a later re-seed.
The bars list and the song list were both re-checked at the end and hold only the
seed fixture. The one change still standing at the end of the run was the setlist
order from the touch drag, which the next re-seed will reset.

## Screenshots

All in `pragma/`, prefixed `regress-`.

| File | Shows |
|---|---|
| `regress-song-detail-embeds-1280.png` | the sidebar with a full lineup, the playlist and channel links falling back to plain links, and the watch URL as an iframe |
| `regress-song-detail-sidebar-1280.png` | the extracted sidebar rendering lineup and mastery after a reload |
| `regress-song-detail-lineup-stale-1280.png` | the panel still showing the pre-write lineup after a successful save |
| `regress-scene-mode-contrast-1280.png` | scene mode at transpose `-1`, with `Cb`, `Fb`, `E#`, `B#` untouched, and the low-contrast lyrics |
| `regress-setlist-drag-preview-1280.png` | the drag preview floating above its row, with the inline editor holding its written values |
| `regress-bars-form-not-reset-1280.png` | the create form still holding its values after a successful save |
| `regress-catalog-375.png` | the catalog at 375 |
| `regress-members-375.png` | members at 375 |
