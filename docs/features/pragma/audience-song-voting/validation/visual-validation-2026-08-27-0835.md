# Visual validation — The room picks the next song (second scoped re-validation)

| | |
|---|---|
| Scope | **Second scoped re-validation, not a full sweep.** Only the rows below were re-driven |
| Spec | [`../spec/spec.md`](../spec/spec.md) |
| Commit under test | `defd5e7` *let the round history poll until the winner arrives* |
| Branch | `claude/concert-sound-voting-c7r8w7` |
| Head | `defd5e7` |
| Previous runs | [`visual-validation-2026-08-27-0740.md`](./visual-validation-2026-08-27-0740.md) FAIL at `3f23262` · [`visual-validation-2026-08-26-2340.md`](./visual-validation-2026-08-26-2340.md) FAIL at `ec228bf` |
| Driven at | `http://localhost:5174` (Vite dev, restarted onto the new bundle), API on `:3001`, local Postgres |
| Tools | `scripts/browser.sh` (agent-browser 0.33.2), `psql` and the API log for the facts a screen cannot show |
| Viewports | 1280 × 900 and 375 × 812 |
| Date | 2026-08-27 08:31 → 08:48 UTC |
| Evidence | [`visual-validation-2026-08-27-0835/`](./visual-validation-2026-08-27-0835/) |

## Verdict: PASS

Ten rows, all PASS, across eight rounds opened and waited out at the real thirty seconds. The two
rows that failed at `3f23262` — a suggested winner and a catalogue winner both reported as
`no vote cast` — now name their winner within four seconds of settlement on a panel that has not
been reloaded. The blank round still reads blank, the audience-choice setlist count moves on its
own, and the panel goes completely silent at rest.

**I could not catch the regression you invited me to look for.** After settlement converges, the
band panel makes **zero** requests of any kind — measured three times, over 25 s, 30 s and 30 s at
rest, with an empty request log each time.

## Rows

| # | Assertion | Viewport | Verdict | Evidence |
|---|---|---|---|---|
| A1 | A round won by a song suggested from the room and **created during that round** is named in the panel's history, with no reload | 1280 | PASS | Round opened 08:32:57; "Wonderwall" created 08:33:05.731 inside the round, won, settled 08:33:28.411. Read at 08:33:32 on a page with `performance.getEntriesByType('navigation').length === 1`: `08:32 AM → Wonderwall`. [`A-01`](./visual-validation-2026-08-27-0835/A-01-suggested-winner-named-no-reload-1280.png) |
| A2 | Same, at 375 px | 375 | PASS | Round opened 08:39:43; "Creep" created 08:39:46.094 inside the round, won, settled 08:40:14.445. Read at 08:40:20 on a page marked 155 s earlier and never reloaded since: `08:39 AM → Creep`. [`A-02`](./visual-validation-2026-08-27-0835/A-02-suggested-winner-named-no-reload-375.png) |
| B1 | A round that closes with zero votes still reads as the blank round | 1280 | PASS | Round opened 08:36:09, settled 08:36:39.643, `winning_song_id` NULL. Panel rendered `08:36 AM → no vote cast` beside the two named winners above it. [`B-01`](./visual-validation-2026-08-27-0835/B-01-blank-round-blank-no-reload-1280.png) |
| B2 | Same, at 375 px | 375 | PASS | Round opened 08:46:21, settled 08:46:51.683, `winning_song_id` NULL. Panel rendered `08:46 AM → no vote cast` as the eighth line of a list whose other seven match `voting_round` row for row. [`B-02`](./visual-validation-2026-08-27-0835/B-02-blank-round-blank-no-reload-375.png) |
| C1 | A round won by a song **already in the catalogue** is named, with no reload — the case my brief had assumed safe and my last run found failing | 1280 | PASS | Round opened 08:35:13, won by "Copper Sky" (created 08:31:12, before the page loaded), settled 08:35:43.936. Read at 08:35:48, no reload: `08:35 AM → Copper Sky`. [`C-01`](./visual-validation-2026-08-27-0835/C-01-catalogue-winner-named-no-reload-1280.png) |
| C2 | Same, at 375 px | 375 | PASS | Round opened 08:44:48, won by "Low Tide Radio" (created 08:31:12), settled 08:45:18. Read at 08:45:24 on a page marked 68 s earlier: `08:44 AM → Low Tide Radio`. [`C-02`](./visual-validation-2026-08-27-0835/C-02-catalogue-winner-named-no-reload-375.png) |
| F1 | The audience-choice setlist's song count updates without a reload after a winner is appended | 1280 | PASS | The setlists list read `Set principal — 6 songs` alone before the first round, then `Audience choice — 1 song` at 08:33:32 and `— 2 songs` at 08:35:48, each on the same unreloaded page. `setlist_entry` agrees. [`A-01`](./visual-validation-2026-08-27-0835/A-01-suggested-winner-named-no-reload-1280.png), [`C-01`](./visual-validation-2026-08-27-0835/C-01-catalogue-winner-named-no-reload-1280.png) |
| F2 | Same, at 375 px, and the count does **not** move on a blank round | 375 | PASS | `2 → 3 songs` at 08:40:20 (Creep) and `4 → 5 songs` at 08:45:24 (Low Tide Radio), no reload. It stayed at `2` across the blank round at 08:36:45 and at `5` across the blank round at 08:46:57 — so the invalidation fires on a settlement that appended something, not on every answer |
| G1 | At rest, once every round is settled, the panel stops polling | 1280 | PASS | Measured on the wire. During the round: 31 × `GET …/rounds` and 30 × `GET …/state` in ~31 s, one per second each, plus the single `POST …/rounds` that opened it. Log cleared, then 25 s at rest → `No requests captured`. Repeated after the blank round: same 31/30/1 during, `No requests captured` over the next 25 s |
| G2 | Same, at 375 px, after a won round and after a blank round | 375 | PASS | After the won round: 31/30/1 during, then `No requests captured` over 30 s. After the blank round: 31/30/1 during, then `No requests captured` over 30 s. Four independent quiet windows in total, none of them carrying a single request |
| — | Pixel-content check, every screenshot | both | PASS | `img.complete && img.naturalWidth === 0` returned empty on every capture. The panel carries no `<img>`; the QR is inline SVG |

## What the wire shows

The three changes are each visible as a distinct fact, not inferred from the screen:

- **The history query now polls, and only while it needs to.** `GET …/rounds` went from *one call per
  page load* at `3f23262` — which is what made the last report actionable — to 31 calls across a
  31-second round, then none. That is `selectHistoryPollInterval` reading its own answer.
- **The settling read is scheduled, not lucky.** The blank round opened 08:46:21.162 settled at
  08:46:51.683, 30.52 s later, with the audience page left at rest and never refreshed into that
  round. The band panel's own poll made the read that settled it, one tick past `closesAt`. Under the
  old `isOpen` rule that tick would have been the last one already scheduled rather than one the
  client meant to make.
- **The setlist invalidation is coupled to settlement, not to time.** The count moved on each of the
  four rounds that appended an entry and on neither of the four that did not, on the same page, with
  no reload between them.

## Two incidents worth reporting, neither a defect

- **A suggestion was refused with a `503` by MusicBrainz mid-run** (`POST …/suggestions` →
  `external-search-unavailable`, upstream throttle after this run's search bursts). The vote page
  said *"That song could not be added to the vote."* — a stated failure, which is what full-sweep row
  48 already asserts. I waited, re-ran the round with a different title, and it went through. The
  application behaved correctly; the row was re-driven rather than passed on the failed attempt.
- **A first attempt at row C2 read as a FAIL and was not one.** At 08:41:28 the panel rendered
  `08:40 AM → no vote cast` for a round "Glass Bridge" had won. Before reporting it I looked at the
  wire, and the wire said the page, not the poll: **two** `GET …/rounds` where thirty were due, the
  last two requests carrying no status at all, and the panel frozen at `TIME LEFT 0s` a full minute
  after settlement. That is the agent-browser wedge the brief warns about, in a shape that imitates
  this exact defect. A restarted daemon, re-signed-in, rendered `08:40 AM → Glass Bridge` and
  `Audience choice — 4 songs`, and the re-run of C2 on the fresh browser passed with a complete
  31/30/1 trace. Recorded because a reader comparing this report against my last one deserves to
  know the PASS was not the first reading I got.

## What was NOT re-run

Of the 62 rows in [`visual-validation-2026-08-26-2340.md`](./visual-validation-2026-08-26-2340.md),
this run re-drives rows **16** and **24** only — the round history and the winner the panel shows —
plus rows F and G, which did not exist in that sweep and were promoted from an observation and from
a regression risk respectively.

**Not re-run here, and carrying their earlier verdicts:** rows 1–15, 17–23, 25–62. That is the vote
page at rest and in round, the ballot token and its re-minting, tap-and-retract, the pool rule and
its three decisive tests, both tie rules, settlement idempotence, the unsettled-round case, the short
`/vote` resolution, every error case, the *Questions, Options and Decisions* rows, the touch pass
driven with `scripts/argent.sh`, and the dark and light colour schemes. Row **D**, the short vote
address, was PASS at `3f23262` in
[`visual-validation-2026-08-27-0740.md`](./visual-validation-2026-08-27-0740.md) and `defd5e7` does
not touch the address code; it was skipped on instruction, though the address is legible in every
screenshot here.

`defd5e7` changes three front-end files, all under `apps/pragma/site/src/lib/queries/`. Two of them
are read by the **vote page** as well as by the panel — `selectPollInterval` is shared — so the vote
page's polling rows (23 and 53 of the full sweep) sit closest to this change of anything not re-run.
Incidentally, and not claimed as a row: the audience page was driven throughout in a context where
`document.cookie === ""`, and it polled, voted, suggested and refreshed normally across all eight
rounds.

## Recommendation

The defect is fixed and I could not find a regression behind it. Re-run the full sweep before merge:
the last complete pass is now three commits old, and the shared `selectPollInterval` reaches the vote
page, which this scoped run only exercised as a driver rather than as a subject.
