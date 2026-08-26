---
agent: visual-validation-04
stage: validate
feature: pragma/audience-song-voting
spec: docs/features/pragma/audience-song-voting/spec/spec.md
plan: docs/features/pragma/audience-song-voting/plan/plan.md
branch: claude/concert-sound-voting-c7r8w7
head: ec228bfe8a2f8c0b6517fb98b2a8b8d14900b2bb
base: origin/main at 231bfc7b7600cbd8f0de18c93656249067a6803f
verdict: FAIL
status: done
date: 2026-08-26
adr-trigger: none
surface: 'pragma site at http://localhost:5174, api at :3001, local Postgres via scripts/local-postgres.sh'
viewports:
  - 375x812
  - 1280x900
tools:
  pointer-and-layout: 'scripts/browser.sh (agent-browser), four contexts: band, band2 signed in; audience, desk with no session cookie'
  touch: 'scripts/argent.sh, a Chromium of its own at 375x812, real touch events'
rows:
  total: 62
  pass: 61
  fail: 1
  unverifiable: 0
rounds-driven: 16
failing:
  - "F1 — row 24. The band's panel renders a settled round that had a winner as \"no vote cast\", the copy the spec reserves for a blank round, whenever the winning song was created during that round. Reproduced twice: 23:27 with \"Wonderwall\", 23:50 with \"Hallelujah\". Both times voting_round.winning_song_id named the song and one entry was appended to the audience-choice setlist, while the panel — never reloaded — said nobody voted. Reloading the same URL renders the winner. Contradicts Result (\"the round history with each winner\") and happy-path step 7 (\"The band's panel shows the winner\"). Fires on exactly the case the feature exists for: a song the room asked for that the band does not already have."
unverifiable: []
artifacts:
  - docs/features/pragma/audience-song-voting/validation/visual-validation-2026-08-26-2340.md
  - docs/features/pragma/audience-song-voting/validation/visual-validation-2026-08-26-2340/
---

# Verdict — visual validation, audience song voting, round four

**FAIL, one row of sixty-two.** Full report:
[`../../../validation/visual-validation-2026-08-26-2340.md`](../../../validation/visual-validation-2026-08-26-2340.md).

**The failure is one screen disagreeing with itself.** A round opened at 23:50:11
from the band's own panel was won by "Hallelujah", a song that entered the
catalogue during that round because someone in the room asked for it. The
audience-choice setlist gained its line, which is the half of happy-path step 7
the band can act on. The other half, on the same screen, rendered
`11:50 PM → no vote cast`. That string is not a placeholder for a title the panel
could not resolve — it is `audience.blankRound`, the copy the spec assigns to
"No vote at all. The round is blank, nothing is appended". So the panel does not
say it is unsure; it says nobody voted, about a round somebody voted in, at the
moment the band is on stage deciding what to play next. A reload renders
"Hallelujah" correctly, which puts the problem on the read side and not in
settlement, and means the defect fires for every winning suggestion of a song the
band does not already have and for no other winner.

**Everything else the spec asserts holds, and the expensive rows were paid for
rather than skipped.** Sixteen rounds were opened and waited out at the real
thirty seconds each, which is the cost the operator accepted in *Questions,
Options and Decisions*; `closes_at − opened_at` is 30.000 s on every row.

**The public surface was driven with no session cookie, in contexts that never
had one.** `document.cookie` read empty in each before anything was asserted.
`/vote/:sessionId` and the short `/vote` both render for a visitor who has never
signed in, the ballot token is minted on first contact into
`pragma.ballot.<sessionId>`, and a visitor arriving with an unknown token gets a
fresh one on the first write while the old ballot's votes stay unrecovered.

**Three rows were built to discriminate rather than merely to pass.** The tie rule
was exercised so that "first to reach the score" and "earliest latest surviving
vote" predict different winners: Static Bloom reached one vote first, its
supporter retracted and re-cast, and Smells Like Teen Spirit won on the earlier
surviving vote. The "no scheduler" claim was tested with every browser context
parked on a non-polling page — twenty-six seconds past `closesAt` the round was
still unsettled, and the first read settled it. And the pool's two exclusion rules
were separated by observation: appending a never-winning song to the
audience-choice setlist left it in the pool, while appending a pool song to the
manual setlist removed it from the next read.

**Touch was driven as touch.** The rows asserting thumb reach and tap behaviour
went through `scripts/argent.sh`, not through a synthetic click: a real tap took a
pool row from 0 to 1 and a second tap took it back to 0.

Nothing is disclosed as unverifiable. Row 24 is a defect I observed, twice, and
FAIL is not mergeable — the panel has to render the winner without a reload, and
must never use the blank-round copy for a round that has one.
