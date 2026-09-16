---
date: 2026-09-16
introduced-at: implementation
detected-at: qa
severity: high
related-pr: '#89'
fix-pr: '#89'
fix-commits: [7986167b]
eradication-level: 1
time-to-detect: days
tags: [pragma, react, validation, spec, tanstack-query, agents]
---

# The panel that paid for a poll it never rendered

## Symptom

Reported from a real screen, in four words: *"we don't see the proposal"*. An
audience suggestion appeared nowhere on the band's side.

It was not the suggestion path. That writes the song, records the suggestion
and puts it in the pool — verified end to end against the live providers
before anything was changed. It was not the catalogue either, which does list
a suggested song as an *Idea*.

It was `VotingRoundPanel`. The component called `useConcertVoteState`, paid
for the request on every one-second poll, and rendered the countdown, the
participation, the address and the round history. It never rendered
`state.pool`.

So the band saw neither the live standing while a round ran nor anything the
room had asked for — on the one screen that is on stage, which is the screen
the whole feature exists to put there.

The spec asks for it in as many words, in its `## Result` section:

> **The band's panel** … carries the QR code for this concert, the button
> that opens a round, **the live standing while the round runs**, and the
> round history with each winner.

A visual-validation PASS sat on top of this.

## Root-cause chain

1. **Why did the band see nothing?**
   The panel rendered four of the five things the spec names for it, and the
   missing one is the only one that carries the room's answer.

2. **Why was a whole section of the response unrendered?**
   The component was built from the round's own state outward — countdown,
   participation, address, history are all fields of `round`. `pool` is a
   sibling of `round` on the response, and nothing about using the response
   requires using all of it.

3. **Why did TypeScript not notice?**
   It has no opinion about an unread property. `state` was used, extensively.
   `state.pool` was simply never mentioned, which is legal in every sense.

4. **Why did the test suite not notice?**
   There was no `VotingRoundPanel` test at all. The pool had tests — on the
   voter's page, where it renders — and the panel had none, so nothing
   asserted what the band's screen shows.

5. **Why did visual validation PASS?**
   The validator's checklist asked whether a round could be *opened* from the
   panel. It could. No row asked what the panel *shows* while a round runs.
   The standard already says the checklist covers *"every visible artefact
   named in the Result section"* — the rule was there and nothing enforced it,
   so a checklist built freehand produced a row per *interaction* and none per
   *artefact*.

6. **Why did I not see it while implementing?**
   I had the voter's page open, where the pool renders correctly, and the
   panel is behind a session gate on a different route. The feature worked on
   the screen I was looking at.

**Root cause:** the implementer thought *the pool is the voter's list*,
actually *the pool is the round's state and both screens read it*, and the
band's screen is the one the feature exists for.

## Detection failure causes

- **Typing:** an unread property of a used object is not a type error and
  cannot be made into one.
- **Linter:** `no-unused-vars` sees `state` used. There is no per-property
  equivalent, and a rule demanding every field of a response be rendered would
  be wrong more often than right.
- **Functional validation locally:** performed on the voter's page, which was
  correct. The panel is on another route behind a session gate.
- **CI:** every suite green. There was no test of this component to fail.
- **Visual validation:** PASS, on a checklist that asked whether the round
  could be opened and never what the panel displays.
- **Code review:** the component reads as complete. Four sections render, the
  fifth is not mentioned, and an absence is the hardest thing to see in a
  diff.
- **Operator / QA:** this is the layer that caught it, from a real screen,
  after merge.

## Countermeasure

- **Code:** commit `7986167b` — the panel renders the standing, and a
  read-only row renders it.
- **Reproduced first.** Three tests written against `VotingRoundPanel`,
  failing, before the component was touched. Diagnosis was done in a browser
  at 1280 px and at 375 px rather than by reading the component, because the
  report was about a screen.
- **The standing is not the voter's row.** `StandingSongRow` is a read-only
  list item, deliberately not the tappable `PoolSongRow`: a band member
  holding the phone on stage must not be able to add a vote by touching the
  screen they are reading.

## Eradication (mandatory — code-level)

**Type:** code diff + detection (level 1 for the marker rule, level 4 for the
panel itself)

**Reference:** PR #89 · commit
[`7986167b`](https://github.com/hugoleborso/borso.fr/commit/7986167b)

**Level 1 — two surfaces cannot disagree about one song.** Two screens now
show the same pool entry, and each needs the *not necessarily concert-ready*
marker. Rather than a marker rule in each row component, the rule moved into
`pool-song-row.core.ts`, gated at 100% coverage and 100% mutation:

```diff
+const NOT_CONCERT_READY_LABEL_KEY = {
+  idea: 'audience.notConcertReadyIdea',
+  wip: 'audience.notConcertReadyWip',
+  rehearsed: 'audience.notConcertReadyRehearsed',
+} as const;
+
+export function selectNotConcertReadyLabelKey(status: string): NotConcertReadyLabelKey | null {
+  if (!isNotConcertReady(status)) return null;
+  return NOT_CONCERT_READY_LABEL_KEY[status];
+}
```

Both rows call it. Marking a song differently on the two screens is no longer
something a change can express, which is the failure this feature would
otherwise have grown into the moment a third surface appeared.

Mutation testing earned its keep on the way: the extraction started as
`status !== CONCERT_READY_STATUS && status in TABLE`, and a surviving mutant
showed the first half was dead — `concert_ready` is not a key of that table.
It was removed rather than covered with a test that would have frozen dead
code in place.

**Level 4 — the panel is now asserted.** `VotingRoundPanel.test.tsx`, 111
lines, asserts that an open round renders its pool, that a suggested song
carries its marker there, and that the row is not interactive.

**What is *not* eradicated, and why not.** The validation gap — a checklist
that asked whether a round opens and never what the panel shows — has no gate
in this PR. The obvious one is a coverage check from the spec's `## Result`
section to the report's rows, and it needs the Result section to have machine-
readable units. Measured across the nineteen specs in the tree: six use bold
lead-ins per artefact, thirteen do not. Gating on that would be inventing a
formatting convention two thirds of the corpus does not follow, to catch one
defect. The honest change is to the standard, which is rung 5 and is stated
here as rung 5: the visual-validation checklist carries one row per *artefact*
named in Result, and a screen covered only by a "can it be triggered" row is
not covered.

**Sibling defects swept:** checked and clean — the catalogue page does list a
suggested song as an *Idea*, and the nav's Catalog badge counts concert-ready
songs only, which is why it does not move when a suggestion lands. Both were
suspected from the same report and neither was broken; that is recorded here
so the next reader does not re-investigate them.

## See also

- [`described-screenshot-without-checking-pixels.md`](./described-screenshot-without-checking-pixels.md) — the other way a visual PASS can be issued over a defect.
- [`plan-code-quality-self-check-not-walked-at-write-time.md`](./plan-code-quality-self-check-not-walked-at-write-time.md) — a checklist that existed and was not walked.
- [`the-poll-that-undid-the-tap-a-second-later.md`](./the-poll-that-undid-the-tap-a-second-later.md) — the other defect on the same query, found by CI rather than by a person.
