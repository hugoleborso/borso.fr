# Visual validation — The room picks the next song (scoped re-validation)

| | |
|---|---|
| Scope | **Scoped re-validation, not a full sweep.** Only the two fixes below were re-driven |
| Spec | [`../spec/spec.md`](../spec/spec.md) |
| Commits under test | `29ed146` *stop the band panel calling a won round blank* and `3f23262` *advertise the short vote address on the band panel* |
| Branch | `claude/concert-sound-voting-c7r8w7` |
| Head | `3f23262` |
| Previous run | [`visual-validation-2026-08-26-2340.md`](./visual-validation-2026-08-26-2340.md), FAIL on row 24, at head `ec228bf` |
| Driven at | `http://localhost:5174` (Vite dev), API on `:3001`, local Postgres from `scripts/local-postgres.sh` |
| Tools | `scripts/browser.sh` (agent-browser 0.33.2), `psql` and `curl` for the server-side facts a screen cannot show |
| Viewports | 1280 × 900 and 375 × 812 |
| Date | 2026-08-27 07:36 → 08:06 UTC |
| Evidence | [`visual-validation-2026-08-27-0740/`](./visual-validation-2026-08-27-0740/) |

## Verdict: FAIL

**Assertions A and C fail, at both viewports.** The defect the previous run reported as row 24 is
still visible to the band: a round that closes with a winner while the panel stays open renders
`no vote cast`, the copy the spec reserves for a blank round.

Commit `29ed146` fixed a real half of the problem and the half it fixed is verified below — the
server now returns `winningSongTitle` and the front end's `RoundOutcome` union is correct. It did
not reach the user-visible symptom, because the panel never re-reads the round history after a round
settles. The round is written into the history cache when it is *opened*, at which point it has no
winner, and nothing replaces it until the page is reloaded.

The failure is also **wider than the brief assumed**: it is not confined to a winning song created
during the round. A round won by a song that has been in the catalogue since before the page loaded
reads `no vote cast` too (assertion C). What decides the symptom is not which song won — it is
whether the panel has been reloaded since the round settled.

## Rows

| # | Assertion | Viewport | Verdict | Evidence |
|---|---|---|---|---|
| A1 | A round won by a song suggested from the room and created during that round is named in the band panel's history, **without a page reload** | 1280 | **FAIL** | Round opened 07:45:50 from the panel's own button; a cookie-free browser suggested "Hallelujah" (song row created 07:46:00.840, inside the round) and voted for it; the round settled 07:46:21 with `winning_song_id` → Hallelujah. The panel, `performance.getEntriesByType('navigation').length === 1` and never reloaded, rendered `07:45 AM → no vote cast`. [`A-02`](./visual-validation-2026-08-27-0740/A-02-FAIL-history-blank-for-suggested-winner-1280.png). Still blank 2 minutes later. Reloading the same URL renders `07:45 AM → Hallelujah`: [`A-03`](./visual-validation-2026-08-27-0740/A-03-history-correct-after-reload-1280.png) |
| A2 | Same, at 375 px | 375 | **FAIL** | Round opened 07:50:36; "Creep" suggested and created 07:50:45, won the round. Panel unreloaded rendered `07:50 AM → no vote cast` while the two earlier winners, loaded with the page, rendered correctly on the same list. [`A-04`](./visual-validation-2026-08-27-0740/A-04-FAIL-history-blank-for-suggested-winner-375.png) |
| B1 | A round that closes with zero votes still reads as the blank round | 1280 | PASS | Round opened 07:40:55, no ballot cast, settled 07:41:26 with `winning_song_id` NULL (`psql`). Panel rendered `07:40 AM → no vote cast` without a reload. [`B-01`](./visual-validation-2026-08-27-0740/B-01-blank-round-history-1280.png) |
| B2 | Same, at 375 px | 375 | PASS | Round opened 07:52:46, settled 07:53:17, `winning_song_id` NULL. Panel rendered `07:52 AM → no vote cast`. [`B-02`](./visual-validation-2026-08-27-0740/B-02-blank-round-history-375.png) |
| B3 | The two cases are not inverted — on a freshly loaded panel, blank rounds read blank and won rounds name their winner | 375 | PASS | A panel loaded after all nine rounds renders four `no vote cast` lines, then `Hallelujah`, `Copper Sky`, `Creep`, `Glass Bridge`, then `no vote cast` — matching `voting_round` row for row. [`B-03`](./visual-validation-2026-08-27-0740/B-03-blank-round-after-reload-375.png), same at 1280 in [`A-03`](./visual-validation-2026-08-27-0740/A-03-history-correct-after-reload-1280.png) |
| C1 | A round won by a song already in the catalogue is still named, without a reload | 1280 | **FAIL** | Round opened 07:48:57, won by "Copper Sky" (created 07:36:56, before the panel loaded at 07:48:2x), settled 07:49:28. Panel unreloaded rendered `07:48 AM → no vote cast`. [`C-01`](./visual-validation-2026-08-27-0740/C-01-FAIL-catalogue-winner-blank-1280.png) |
| C2 | Same, at 375 px | 375 | **FAIL** | Round opened 07:51:42, won by "Glass Bridge" (created 07:36:56), settled 07:52:12. Panel rendered `07:51 AM → no vote cast`. [`C-02`](./visual-validation-2026-08-27-0740/C-02-FAIL-catalogue-winner-blank-375.png) |
| C3 | Second reproduction on a browser started from scratch, with the network traced | 375 | **FAIL** | On a fresh daemon and a fresh sign-in, `network requests --clear`, then one round opened 08:05:23 and won by "Neon Harbour". Since the clear the panel issued exactly one request to the rounds route — the `POST … /rounds 201` that opened it — and **no `GET`** at any point after settlement. Line rendered `08:05 AM → no vote cast`. [`C-03`](./visual-validation-2026-08-27-0740/C-03-FAIL-no-history-refetch-375.png) |
| D1 | The short vote address is visible on the band panel, above the long per-concert URL | 1280 | PASS | `Say this at the microphone: localhost:5174/vote` in bold monospace at `top = 723`, the long `http://localhost:5174/vote/28f6c705-…` at `top = 754` below it. [`D-02`](./visual-validation-2026-08-27-0740/D-02-band-panel-addresses-1280.png) |
| D2 | The short address carries no `http://` or `https://`, keeps the port, and names no concert uuid | 1280 | PASS | Rendered text is exactly `localhost:5174/vote` — `buildShortVoteAddress` returns `new URL(origin).host + '/vote'`, so the scheme is gone, the port is inside `host`, and no uuid appears. The long URL is still present in full |
| D3 | The long per-concert URL is still present | 1280 | PASS | `http://localhost:5174/vote/28f6c705-9207-4571-8648-9b19cf241b24`, read verbatim from the DOM, and the QR beside it still encodes it |
| D4 | Both addresses at 375 px, unclipped, no horizontal overflow | 375 | PASS | Short address wraps onto its own line under the label, `right = 342 < 375`; `document.documentElement.scrollWidth === clientWidth === 375`. [`D-03`](./visual-validation-2026-08-27-0740/D-03-band-panel-short-address-375.png) |
| E | Assertions A to D exercised at 375 px and 1280 px both | both | done | Rows A1/A2, B1/B2, C1/C2, D1–D3/D4 above |
| — | Pixel-content check, every screenshot | both | PASS | `img.complete && img.naturalWidth === 0` returned `[]` on every capture. The panel carries no `<img>`: the QR is an inline SVG |

## The failing rows in full

### What commit `29ed146` did fix, and it is verified

- `GET /api/audience/concerts/:sessionId/rounds` now returns `winningSongTitle`. Read directly:
  the round settled 07:46:21 comes back as
  `{"winningSongId":"e73e5082-…","winningSongTitle":"Hallelujah"}`. Before the fix the client had to
  join against a songs-list cache that could not know a song created after the page loaded.
- The front end's `RoundOutcome` is a discriminated union of `blank` / `won` / `won-unnamed`, and no
  round in this run rendered `winner not found`, so the `won-unnamed` branch never fired.
- On a **freshly loaded** panel every one of the nine rounds renders correctly, blank and won alike
  (row B3). The projection is right.

### What still reaches the band

The band panel's round history is a `useQuery` that runs once per page load and is never
invalidated, never refetched and never polled. When the member presses *Open a thirty-second round*,
`useOpenRound.onSuccess` writes the just-opened round into that cache; that round has
`winningSongId: null`, which `selectRoundOutcome` maps to `{ kind: 'blank' }`, which the panel
renders as `audience.blankRound` — `no vote cast`.

Thirty seconds later the round settles. The vote-state query, which *is* polled, notices: the
countdown disappears, the button re-enables, and the participation line moves to
`1 of 120 in the room voted, 1%`. The history line beside it does not, because nothing asked the
server for it again. Row C3 traces this to the wire: one `POST … /rounds`, zero `GET … /rounds`.

So the screen still contradicts itself in the same place and with the same words as the previous
run: it says a ballot was cast and that nobody voted, at the same time, on the same card, while the
band is on stage deciding what to play. The fix moved the cause — the title is no longer missing, the
whole round row is stale — but not the symptom.

Reproduced **five times** in this run: 07:45 (Hallelujah, suggested), 07:48 (Copper Sky, catalogue),
07:50 (Creep, suggested), 07:51 (Glass Bridge, catalogue) and 08:05 (Neon Harbour, catalogue, on a
browser started from scratch). Every one of the five reloads correctly.

## Observations that are not rows

- **The concert page's setlist list is stale in the same way.** `Audience choice — 1 song` was
  rendered at 07:49:38, ten seconds after the second winning entry was appended
  ([`C-01`](./visual-validation-2026-08-27-0740/C-01-FAIL-catalogue-winner-blank-1280.png)). The
  spec's step 7 says *"the setlist gains a line"*; the line is in the database and in the setlist
  editor, but the count on the screen that opened the round does not move until a reload. No spec
  sentence pins the count on this screen, so this carries no verdict — but it is the same missing
  invalidation and would be fixed by the same change.
- **The short address is only as short as the origin.** `localhost:5174/vote` is right for a dev
  host and the rule that produces it keeps whatever `host` the origin carries, so a preview host
  will read `pragma-pr-<n>.preview.borso.fr/vote`. Nothing here is wrong; it is worth knowing that
  the "sayable at a microphone" property is a property of the deployment, not of this code.

## What was NOT re-run

This is a scoped re-validation. Of the 62 rows in
[`visual-validation-2026-08-26-2340.md`](./visual-validation-2026-08-26-2340.md), only rows **16**
(*the panel carries the round history with each winner*) and **24** (*the band's panel shows the
winner*) are re-driven here, plus the new short-address behaviour that commit `3f23262` added and
which the previous run recorded as an observation rather than a row.

**Not re-run, and therefore carrying the previous run's verdicts:** rows 1–15, 17–23, 25–62 — the
vote page at rest and in round, the ballot token, the tap-and-retract rules, the pool rule and its
three decisive tests, the tie rules, settlement idempotence, the short `/vote` resolution, every
error case, the *Questions, Options and Decisions* rows, the touch pass driven with
`scripts/argent.sh`, the dark and light colour schemes, and the 375/1280 rendering of the vote page.
Those rows were PASS at `ec228bf`; the two commits under test touch `audience.service.ts`,
`round.core.ts`, `audience.types.ts`, `audience.controller.ts`, `VotingRoundPanel.tsx`,
`voting-round-panel.core.ts` and the two i18n files, so a reader wanting full coverage of the vote
page should re-run the full sweep before merge.

Incidental confirmations picked up while setting this run up, not claimed as rows: the panel is
reachable only behind the shared-password login (a fresh browser landed on `/login`), the vote page
was driven throughout in a context where `document.cookie === ""`, the pool behaved as the spec
describes for suggestions and catalogue songs, refused suggestions and search failures were not
exercised at all, and every one of the nine rounds measured `closes_at − opened_at = 30.000 s`.

## What has to happen before this ships

The band panel has to re-read the round history when a round settles — the same poll that already
notices the round closed is the place that knows. Until it does, rows A and C stay FAIL and FAIL is
not mergeable. Re-run this scoped validation afterwards, and re-run the full sweep before merge
since the previous full pass is now two commits old.
