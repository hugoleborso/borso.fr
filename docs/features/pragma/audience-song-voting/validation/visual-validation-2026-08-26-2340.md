# Visual validation — The room picks the next song

| | |
|---|---|
| Spec | [`../spec/spec.md`](../spec/spec.md) |
| Plan | [`../plan/plan.md`](../plan/plan.md) |
| Branch | `claude/concert-sound-voting-c7r8w7` |
| Head | `ec228bfe8a2f8c0b6517fb98b2a8b8d14900b2bb` |
| Base | `origin/main` at `231bfc7b7600cbd8f0de18c93656249067a6803f` |
| Driven at | `http://localhost:5174` (Vite dev, port from `apps/pragma/vite.config.ts`), API on `:3001` |
| Tools | `scripts/browser.sh` (agent-browser) for pointer and layout, `scripts/argent.sh` for real touch |
| Viewports | 375 × 812 and 1280 × 900 |
| Date | 2026-08-26 |
| Evidence | [`visual-validation-2026-08-26-2340/`](./visual-validation-2026-08-26-2340/) |

## Verdict: FAIL

One row fails. Sixteen rounds were opened and waited out in real time, at the thirty seconds a
piece the operator accepted in *Questions, Options and Decisions*.

**Failing row: 24 — the band's panel reports a real winner as a blank round when the winning song
was created during that round.** This is the case the feature exists for: the room asks for
something the band does not have, that suggestion wins, and the panel the band is reading on stage
says nobody voted. Details and reproduction in the row.

## How the run was set up

The public surface was driven in browser contexts that never held a session cookie. Three separate
contexts were used and `document.cookie` was read as empty in each before anything was asserted:

- `band` / `band2` — signed in with the shared password, at 1280 and at 375.
- `audience` — no cookie, 375 × 812.
- `desk` — no cookie, 1280 × 900.
- an argent-driven Chromium at 375 × 812, for the rows that assert touch.

The seeded fixture puts all six songs into the concert's one manual setlist, which leaves the pool
empty. Seven concert-ready songs absent from that setlist were created through the gated API so the
pool had something in it; that is setup, not an assertion, and the pool rule itself is asserted in
rows 30 to 32.

## Rows

### The vote page — the Result section

| # | Assertion (spec) | Verdict | Evidence |
|---|---|---|---|
| 1 | The vote page is reachable at `/vote/:sessionId` and is outside `RequireSession` | PASS | Opened in a context with no cookie. `document.cookie` = `""`, page rendered, no redirect to `/login`. [`02-vote-at-rest-375.png`](./visual-validation-2026-08-26-2340/02-vote-at-rest-375.png) |
| 2 | The vote page is reachable at the short `/vote` | PASS | `/vote` opened with no cookie; while a round was open it resolved to `http://localhost:5174/vote/e74686ee-737a-4b26-a6cc-ae237d5035c3` with the countdown showing |
| 3 | At rest it says no vote is running | PASS | `/vote` with no open round renders "No vote is running right now. Ask the band, then refresh."; `/vote/:sessionId` renders "No vote is open at the moment. The band opens one from the stage." |
| 4 | At rest it offers a refresh control | PASS | A "Refresh" button is present in both at-rest states, and pressing it during an open round replaced the card with the countdown and the pool |
| 5 | During a round it shows a countdown | PASS | `[role="timer"]` reads "TIME LEFT 25s", then 17s, then 12s across successive reads. [`03-vote-open-round-375.png`](./visual-validation-2026-08-26-2340/03-vote-open-round-375.png) |
| 6 | During a round it shows the pool as a tappable list | PASS | Three `button[aria-pressed]` rows, each 84 px tall at 375 px width, one per pool song |
| 7 | Each row carries the song's live count | PASS | Row text `Neon Harbour / Kite Machine / 0` became `… / 1` after a vote, and the row re-sorted above the others |
| 8 | A search field lets the visitor suggest something the band does not have | PASS | `input[type=search]`, placeholder "Search a song by title or artist", 25 picked results for "wonderwall". [`04-suggest-search-375.png`](./visual-validation-2026-08-26-2340/04-suggest-search-375.png) |
| 9 | Audience suggestions sit in the same list, visibly marked as not necessarily concert-ready | PASS | `Creep (Radiohead) / still being worked on / …` (status `wip`) and `Wonderwall / asked for by the room / …` (status `idea`) appeared as ordinary pool rows carrying a chip. [`06-vote-suggestion-marked-375.png`](./visual-validation-2026-08-26-2340/06-vote-suggestion-marked-375.png) |

### The band's panel — the Result section

| # | Assertion (spec) | Verdict | Evidence |
|---|---|---|---|
| 10 | The panel is inside the setlist editor | PASS | `/setlists/46165c8c-…` renders the "Audience vote" section under the entries. [`08-audience-choice-setlist-1280.png`](./visual-validation-2026-08-26-2340/08-audience-choice-setlist-1280.png) |
| 11 | The panel is on the concert page | PASS | `/sessions/e74686ee-…` renders the same section. [`01-band-panel-idle-1280.png`](./visual-validation-2026-08-26-2340/01-band-panel-idle-1280.png) |
| 12 | The panel is gated as everything else is | PASS | The panel lives inside `RequireSession`; a cookie-free context opening `/sessions/:id` lands on `/login`, and `POST /api/audience/concerts/:id/rounds` without a cookie is not reachable from the public surface |
| 13 | The panel carries the QR code for this concert | PASS | An SVG titled "Scan to vote", 160 × 160. Its path data is byte-identical (3821 chars) to a re-encoding of `http://localhost:5174/vote/e74686ee-…` through the same `QRCodeSVG`, and a decoy address produces different path data — so the code encodes the vote address, not something else |
| 14 | The panel carries the button that opens a round | PASS | "Open a thirty-second round"; pressing it created `voting_round` rows whose `closes_at` is exactly `opened_at + 30s` |
| 15 | The panel shows the live standing while the round runs | PASS | "TIME LEFT 10s" and "1 of 120 in the room voted, 1%" against the concert's seeded `capacity` of 120. [`05-band-panel-round-open-1280.png`](./visual-validation-2026-08-26-2340/05-band-panel-round-open-1280.png) |
| 16 | The panel carries the round history with each winner | **FAIL** | See row 24 |

### Happy path, steps 1 to 7

| # | Assertion (spec) | Verdict | Evidence |
|---|---|---|---|
| 17 | 1. A member opens a round from the band's panel | PASS | Round `76e04f66` opened at 23:19:22 by pressing the panel's button |
| 18 | 1. The audience-choice setlist is created on this first round if the concert has none | PASS | `setlist_sheet` held only `Set principal \| manual` before the first round and `Audience choice \| audience_choice` immediately after it. No empty audience-choice setlist existed on the concert beforehand |
| 19 | 2. A visitor scans the QR code or types the short address and lands on the vote page | PASS | Rows 2 and 13 |
| 20 | 3. The browser mints a ballot token on first contact and keeps it in local storage | PASS | After the first load, `localStorage` held exactly `pragma.ballot.e74686ee-737a-4b26-a6cc-ae237d5035c3` → `5218e8e0…`, keyed by concert id as the spec's *Two boundaries worth stating* requires |
| 21 | 4. Each tap is one vote; a second tap on the same song retracts it | PASS | `Creep (Radiohead) … / 1` with `aria-pressed="true"`, then `… / 0` with `aria-pressed="false"` after a second tap, and the `audience_vote` row was gone |
| 22 | 4. There is no limit on how many different songs one browser supports | PASS | One ballot held votes on Neon Harbour and Glass Bridge at the same time, both rows `aria-pressed="true"`, both counts 1 |
| 23 | 5. The page polls the state every second and shows the counts and the countdown moving | PASS | `fetch` was instrumented on the page: 14 requests over the 13 s between "TIME LEFT 25s" and "TIME LEFT 12s". At rest, 0 requests over 8 s, which is the "nothing at rest" half of the decision |
| 24 | 7. The band's panel shows the winner | **FAIL** | Reproduced twice. Round opened 23:50:11 from a panel loaded at 23:47; "Hallelujah" was suggested from the room during that round and won it (`voting_round.winning_song_id` → Hallelujah, one vote). The panel, never reloaded, rendered `11:50 PM → no vote cast` — the label the spec reserves for a blank round. Reloading the same page renders `11:50 PM → Hallelujah`. Same shape at 23:27 with "Wonderwall". [`07-FAIL-history-blank-for-suggested-winner-1280.png`](./visual-validation-2026-08-26-2340/07-FAIL-history-blank-for-suggested-winner-1280.png) against [`18-history-correct-after-reload-1280.png`](./visual-validation-2026-08-26-2340/18-history-correct-after-reload-1280.png) |
| 25 | 6. Thirty seconds after opening, the first request to arrive settles the round | PASS | Row 33 |
| 26 | 6. The song with the most votes wins | PASS | Round 23:21:04: Neon Harbour, the only surviving vote, won |
| 27 | 6 and 7. One entry is appended to the audience-choice setlist and the setlist gains a line | PASS | `Audience choice` held `Neon Harbour @ 0`, `Glass Bridge @ 1`, `Wonderwall @ 2` after three winning rounds, one row per round, and the entries render in the setlist editor. [`08-audience-choice-setlist-1280.png`](./visual-validation-2026-08-26-2340/08-audience-choice-setlist-1280.png) |
| 28 | The audience-choice setlist is reachable from the setlists index | PASS | `/setlists` lists "Audience choice — 8 songs · Le Petit Bain" beside "Set principal". [`19-setlists-index-1280.png`](./visual-validation-2026-08-26-2340/19-setlists-index-1280.png) |
| 29 | Every write the surface implies is reachable from the screen that lists the record | PASS | The vote page lists pool songs and carries the field that adds one (row 8, followed to a live pool row in row 9). The panel lists rounds and carries the button that opens one (row 14, followed). The audience-choice setlist is created by that same button (row 18) |

### The pool, stated once and precisely

| # | Assertion (spec) | Verdict | Evidence |
|---|---|---|---|
| 30 | A `concert_ready` catalogue song absent from every manual setlist of this concert is in the pool | PASS | The pool held exactly Glass Bridge, Neon Harbour and Paper Lanterns — the three concert-ready songs created outside `Set principal` — while the three seeded concert-ready songs inside it were absent |
| 31 | A song present in a manual setlist attached to this concert is not in the pool | PASS | Decisive test: with "Low Tide Radio" in the pool, appending it to `Set principal` (kind `manual`) removed it from the very next state read |
| 32 | The audience-choice setlist is deliberately not read by this rule | PASS | Decisive test: "Static Bloom" was appended to the audience-choice setlist without ever having won a round, and the next state read still carried it in the pool. The two rules are therefore separable by observation, not merely by reading the code |
| 33 | A song leaves the pool when it wins a round | PASS | Neon Harbour was in the pool at 23:21 and absent from every read after it won at 23:21:34; the same held for Glass Bridge, Creep, Paper Lanterns, Copper Sky and Iron Lullaby |

### Edge cases

| # | Assertion (spec) | Verdict | Evidence |
|---|---|---|---|
| 34 | Two songs tie: among songs sharing the top count, the winner is the one whose latest **surviving** vote is the earliest | PASS | Constructed deliberately. Static Bloom voted 23:53:51.6, Smells Like Teen Spirit 23:53:53.1, Static Bloom retracted 23:53:54.6 and re-cast 23:53:56.1. Both closed on 1. Winner: **Smells Like Teen Spirit**, latest surviving vote 23:53:53.13 against Static Bloom's 23:53:56.12. A "first to reach the score" rule would have picked Static Bloom, so the run discriminates the two, and it pins the spec's "a song that briefly led and lost its supporters does not keep that lead" |
| 35 | A plain tie is broken by the earlier vote | PASS | Round 23:25:40: Glass Bridge voted 23:25:44.3, Creep 23:25:46.3, both closed on 1, winner Glass Bridge |
| 36 | No vote at all: the round is blank, nothing is appended, and the member can open another | PASS | Rounds 23:19:23, 23:24:08, 23:30:05 and 23:31:21 all settled with `winning_song_id` NULL and appended nothing; the panel rendered "no vote cast" and the button was enabled again immediately |
| 37 | A song that won an earlier round is out of the pool for the rest of the concert, so the setlist never carries a duplicate | PASS | Row 33, and the audience-choice setlist holds no title twice across eight winners |
| 38 | A suggestion arriving mid-round joins the pool of the round in progress and is votable immediately | PASS | "Creep (Radiohead)" picked at 23:24:1x appeared in the pool of the round opened 23:24:08 within one poll and took a vote in the same round. "Hallelujah" did the same at 23:50 and won that round |
| 39 | A suggestion naming a song already in the catalogue resolves to that song rather than creating a second one, matched on `mbid` | PASS | A catalogue song "Creep (Radiohead)" (`wip`, mbid `d41e680d-…`) existed before the run. Picking that MusicBrainz result produced one `audience_suggestion` row pointing at the existing song id, no second `song` row, and the pool row carried the existing title, artist and `wip` status rather than a fresh `idea` song |
| 40 | A song already in a manual setlist for tonight is refused | PASS | "Slow Burn" (in `Set principal`) was given mbid `2fbdb22a-…`; picking that result returned `409 song-already-planned` and the visitor saw "That song could not be added to the vote." — a stated refusal, not a silent no-op |
| 41 | A suggested song enters the pool with its own status, and that status is what renders as "not necessarily concert-ready" | PASS | `wip` → "still being worked on"; `idea` → "asked for by the room". No separate flag is involved: concert-ready pool rows carry no chip at all |
| 42 | Nobody reads the state after `closesAt`: the round stays unsettled until the next read settles it, and there is no scheduler | PASS | Round `42306bc7` was opened with `curl` while every browser context sat on a non-polling page. `closes_at` 23:31:50.796; at 23:32:16, twenty-six seconds later, `settled_at` was still NULL. The first `GET /state` afterwards settled it at 23:32:33.592 |
| 43 | Settlement is idempotent | PASS | Two further `GET /state` calls left every `voting_round` row byte-identical (`diff` over `id, settled_at, winning_song_id` for all rounds: no change) |
| 44 | The short `/vote` address resolves to the one concert that currently has an open round, and to nothing otherwise | PASS | With no round open it stayed on `/vote` and said "No vote is running right now."; with a round open it redirected to `/vote/e74686ee-…`. It never guessed from the calendar — the concert is dated seven days out and was only reachable once a round was running |
| 45 | The visitor arrives with an expired or unknown ballot token: a fresh one is minted and the old votes are not recovered | PASS | `localStorage` was overwritten with `expired-or-unknown-token`. The page rendered, the pool showed, and the previously voted row came back `aria-pressed="false"` — the old ballot's votes were not recovered. The first vote after that was refused once, a fresh token `4ab3fb2c…` was minted and stored, and the vote landed. The mint is lazy: it happens on the first write, not on load, and nothing about that is visible to the visitor |

### Error cases

| # | Assertion (spec) | Verdict | Evidence |
|---|---|---|---|
| 46 | A vote on a closed or already-settled round is refused with a conflict, not silently dropped | PASS | `POST /api/audience/rounds/42306bc7-…/votes` after settlement → `409 {"error":"round-closed"}` |
| 47 | A vote on a song outside the current pool is refused | PASS | Voting for "Slow Burn" (in the manual setlist) from the vote page's own context → `422 {"error":"song-not-in-pool"}`. A vote carrying no ballot token → `401 {"error":"ballot-required"}` |
| 48 | When the upstream search fails, the visitor sees a stated failure, not an empty result list | PASS | Two independent failures, both stated. (a) A genuine upstream throttle: after the search burst below, `POST /suggestions` returned `503 external-search-unavailable` while resolving an mbid, and the page rendered "That song could not be added to the vote." (b) The search route driven to `429`: the field rendered `role="alert"` → "The song search is unavailable right now. Try again in a moment.", with zero result items. Both are distinguishable from the empty-result case, which renders "Nothing found under that name." on a clean page. [`13-search-stated-failure-1280.png`](./visual-validation-2026-08-26-2340/13-search-stated-failure-1280.png) |
| 49 | A round opened on a session whose `kind` is `practice` is refused | PASS | `POST /api/audience/concerts/e0448f19-…/rounds` on a practice session → `422 {"error":"not-a-concert"}`, and the practice session's page renders no "Audience vote" section and no open-round button at all. [`14-practice-no-panel-1280.png`](./visual-validation-2026-08-26-2340/14-practice-no-panel-1280.png) |
| 50 | Two members opening a round at the same instant: the second is refused while one is open on that concert | PASS | With a round open, a second `POST /concerts/:id/rounds` from the band's own page → `409 {"error":"round-already-open"}`. The panel's own button reads `disabled = true` for the whole window, so the second member's browser has to be the one racing |

### Decisions in *Questions, Options and Decisions* that a person can see

| # | Assertion (spec) | Verdict | Evidence |
|---|---|---|---|
| 51 | Live ranking with counts, numbers visible | PASS | Rows 7 and 22; counts render as digits in a monospace badge and the list re-orders as they move |
| 52 | One vote per song, unlimited songs, per round | PASS | Rows 21 and 22 |
| 53 | Polling: one second while a round is open, nothing at rest, plus a refresh control | PASS | Row 23 and row 4 |
| 54 | Both entry points exist: QR code and short address | PASS | Rows 2 and 13 |
| 55 | An audience-choice setlist is not renameable, enforced on the server rather than by hiding a button | PASS | The "Rename" button is present, as the spec intends. Renaming through it left the heading "Audience choice", left `setlist_sheet.name` unchanged, and surfaced a failure notice |
| 56 | The audience-choice setlist is created at the opening of the first round, so no empty setlist is left on a concert that never ran a vote | PASS | Row 18 |
| 57 | A thirty-second round is asserted by waiting the real thirty seconds | PASS | Sixteen rounds were opened and waited out. `closes_at − opened_at` is 30.000 s on every row |

### Viewport and rendering

| # | Assertion (spec) | Verdict | Evidence |
|---|---|---|---|
| 58 | Every page renders correctly at 375 px width | PASS | Vote page: `scrollWidth` 375 = `clientWidth`, no horizontal scroll, pool rows full width. Band panel at 375: no horizontal scroll, the 160 px QR sits inside the viewport. [`02`](./visual-validation-2026-08-26-2340/02-vote-at-rest-375.png), [`11`](./visual-validation-2026-08-26-2340/11-vote-open-round-375-two-ballots.png), [`15`](./visual-validation-2026-08-26-2340/15-band-panel-375.png) |
| 59 | Every page renders correctly at 1280 px | PASS | No horizontal scroll; the panel's QR moves to its own column beside the controls. [`09`](./visual-validation-2026-08-26-2340/09-vote-at-rest-1280.png), [`10`](./visual-validation-2026-08-26-2340/10-vote-open-round-1280.png) |
| 60 | Nothing renders as broken image content | PASS | The broken-image scan (`img.complete && img.naturalWidth === 0`) returned an empty set on every screenshot. The pages carry no `<img>` at all — the QR, the icons and the countdown bar are all SVG or CSS, so there is no CDN that can 403 them |
| 61 | The pool row is reachable and actionable with a thumb, with real touch input | PASS | Driven through `scripts/argent.sh`, not a synthetic click. A tap at the row's centre took the count from 0 to 1 on "Low Tide Radio"; a second tap took it back to 0; a tap on "Refresh" pulled an open round onto an at-rest page. Rows measure 0.104 of an 812 px screen, about 84 px, well past a thumb target. [`12-argent-real-tap-375.png`](./visual-validation-2026-08-26-2340/12-argent-real-tap-375.png) |
| 62 | The page is legible under both colour schemes | PASS | Dark: body `rgb(22, 19, 15)` against heading `rgb(241, 236, 226)`. Light: body `rgb(244, 239, 230)` against `rgb(26, 22, 18)`. [`16`](./visual-validation-2026-08-26-2340/16-vote-dark-1280.png), [`17`](./visual-validation-2026-08-26-2340/17-vote-light-1280.png) |

## The failing row in full

**Row 24 — the band's panel reports a real winner as a blank round.**

What the spec asks for, in two places:

> The band's panel … carries … the round history with each winner.

> 7. The band's panel shows the winner and the setlist gains a line.

What happens. The panel was loaded at 23:47. At 23:50:11 a round was opened from its own button. A
visitor suggested "Hallelujah" during that round — a song that did not exist in the catalogue until
that moment — and voted for it. The round settled at 23:50:40 with `winning_song_id` pointing at
Hallelujah, and the entry was appended to the audience-choice setlist. The panel, which had never
been reloaded, rendered:

```
11:47 PM   no vote cast
11:48 PM   no vote cast
11:50 PM   no vote cast     ← the round Hallelujah won
```

Reloading the same URL renders `11:50 PM → Hallelujah`.

Why it matters more than a missing label. The line does not fall back to the winner's identifier or
to a placeholder — it falls back to `audience.blankRound`, which is the copy the spec reserves for
"No vote at all. The round is blank, nothing is appended". So the panel does not say *"I do not know
this song"*; it says *"nobody voted"*, about a round somebody did vote in, at the moment the band is
standing on stage deciding what to play. The half of step 7 the operator can act on — the setlist
gaining a line — does work, so the two halves disagree with each other on the same screen.

Scope. The defect fires exactly when the winning song was created after the panel last loaded, which
is every winning suggestion of a song the band does not already have. A winner that was already in
the catalogue when the page loaded renders correctly, which is why rows 26 and 27 pass.

Reproduced twice in this run, at 23:27 with "Wonderwall" and at 23:50 with "Hallelujah". Both times
a reload fixed the display, which locates the problem on the read side rather than in settlement.

## Observations that are not rows

None of these contradicts a spec assertion, so none of them carries a verdict. They are recorded
because a reader of this report would otherwise have to rediscover them.

- **The band's panel shows only the long address.** The panel renders
  `http://localhost:5174/vote/<uuid>` beside the QR code. The spec's happy path says a visitor
  "scans the QR code or types the short address", and the short address is nowhere on the screen the
  band reads out from. The Result section lists four things the panel carries and the address is not
  one of them, so this is not a failure against the spec as written — but a uuid is not a thing
  anybody types at a concert, and the entry point the spec names second is not advertised anywhere.
- **The rename refusal is worded as a network problem.** Refusing to rename the audience-choice
  setlist surfaces "The new name was not saved. Check the connection and try again." The refusal is
  deliberate and permanent, and the copy sends the operator to look at their wifi.
- **A refused suggestion's message outlives the query that caused it.** After
  "That song could not be added to the vote.", typing a fresh query that returns nothing keeps
  showing the write failure rather than "Nothing found under that name.", until the page is
  reloaded.
- **The countdown bar animates under `prefers-reduced-motion: reduce`.** The one-second linear width
  transition carries no `motion-reduce:` variant. The spec makes no reduced-motion claim and the
  countdown number itself is not animated, so this is a note, not a row.
- **Two setup facts that could be mistaken for defects, and are not.** A stale songs-list cache in
  the validator's own browser made an earlier history line read "no vote cast" for a reason unrelated
  to row 24 — that one was the validator's doing and was discarded after a reload proved it. And an
  agent-browser context wedged into CDP timeouts after about forty page drives, leaving a React
  mutation stuck pending so the open-round button read as permanently disabled; a fresh browser
  session had the button enabled, so no defect was reported for it.

## Not validated here

- The Production strategy section — the named analytics events, the alert thresholds, the
  participation metric. Observability is out of this gate's scope by the standard.
- Ballot fraud. The spec is explicit that clearing local storage gets a fresh token and that this is
  a deliberate limit, so there is nothing here to hold the implementation to.
- Cross-browser parity, performance baselines, pixel diffs against a golden image.

## What has to happen before this ships

Row 24 is a FAIL, and FAIL is not mergeable under the skill's acceptance rules. The band's panel has
to render the winner of a round whose winning song was created during that round, without a reload,
and it must never render a settled round with a winner using the blank-round copy. Re-run this
validation afterwards; every other row in this report was exercised against the running app and can
be expected to hold.
