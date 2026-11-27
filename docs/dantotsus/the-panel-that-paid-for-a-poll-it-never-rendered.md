---
date: 2026-09-16
introduced-at: implementation
detected-at: qa
severity: high
related-pr: '#89'
fix-commits: [7986167b6e]
eradication-level: 4
eradication-paths: [apps/pragma/site/src/components/organisms/VotingRoundPanel.test.tsx, apps/pragma/site/src/components/molecules/pool-song-row.core.ts]
time-to-detect: days
tags: [pragma, react, validation, spec, tanstack-query, agents]
zone: apps/pragma/site/src/components/organisms/VotingRoundPanel.tsx
---

# The panel that paid for a poll it never rendered

## User impact

Reported from a real screen, in four words: *"we don't see the proposal"*.

| | Seen | Expected |
| --- | --- | --- |
| The band's voting panel on stage, while a round runs | The countdown, the participation, the address and the round history, and no song the room asked for | The live standing, with each song the room proposed, as the spec's *Result* names it |

The band saw neither the live standing nor anything the room had asked for,
on the one screen that is on stage. Voters were not affected: their own page
showed the pool. The suggestion path itself was sound, verified end to end
against the live providers before anything changed. The catalogue did list a
suggested song as an *Idea*.

The spec asks for it in as many words, in its `## Result` section
(`docs/features/pragma/audience-song-voting/spec/spec.md:30`):

> **The band's panel** … carries the QR code for this concert, the button
> that opens a round, **the live standing while the round runs**, and the
> round history with each winner.

## Causal chain

- The band saw no standing on its panel while a round ran
  - `VotingRoundPanel` called `useConcertVoteState` on every one-second poll
    and rendered fields of `round` only. It never read `state.pool`
    ← the faulty line, from `b608cb567`

    ```tsx
    const round = voteState.data?.state.round ?? null; // pool, its sibling, is never read
    ```

    - Commit `b608cb567` (2026-08-26) built the panel from the round's state
      outward: countdown, participation, address and history are all fields
      of `round`. `pool` is a sibling of `round` on the response
      - The same commit rendered the pool on the voter's page, as a list of
        tappable rows
        - The commit names the spec it was built from in its message, so the
          *Result* sentence was in the agent's context. The agent read the
          pool as the voter's list and left it off the band's screen. Man

## Root cause of occurrence

*Thought the pool is the voter's list, actually the pool is the round's state
and both screens read it, and the band's screen is the one the feature exists
for.* **Man.**

The right document was present. Commit `b608cb567` ends with `Spec:
docs/features/pragma/audience-song-voting/spec/spec.md`, and that spec names
"the live standing while the round runs" among the panel's four parts. The
agent built the panel from the round's fields and the pool from the voter's
side, and the spec's sentence lost to that framing. The implementer's own
account names the condition: they had the voter's page open, where the pool
renders, and the panel sits behind a session gate on another route. A Man
cause needs a check that holds when the prior wins, not one more document.

## Detection failure causes

- **Typing:** an unread property of a used object is not a type error.
- **Linter:** `no-unused-vars` sees `state` used. There is no per-property
  equivalent, and a rule demanding every field of a response be rendered
  would be wrong more often than right.
- **Local validation:** performed on the voter's page, which was correct.
  The panel is on another route behind a session gate.
- **CI:** there was no `VotingRoundPanel` test to fail. The pool's tests were
  on the voter's page.
- **Visual validation:** PASS, on a checklist built freehand from the spec.
  It held one row per interaction, "can a round be opened from the panel",
  and none per artefact, so nothing asked what the panel shows while a round
  runs. The standard already said the checklist covers "every visible
  artefact named in the Result section". Nothing derived the rows from it.
- **Code review:** four sections render, the fifth is not mentioned, and an
  absence does not show in a diff.
- **QA:** the operator caught it from a real screen, after merge.

## Countermeasure

Commit `7986167b`: the panel renders the standing, through a read-only row.
Three tests were written against `VotingRoundPanel`, failing, before the
component was touched. Diagnosis was done in a browser at 1280 px and at
375 px. `StandingSongRow` is a read-only list item, not the tappable
`PoolSongRow`, so a band member holding the phone on stage cannot add a vote
by touching the screen they read.

## Eradication

**Type:** detection (level 4) for the defect. Level 1 for a sibling rule.

**Reference:** PR #89, commit
[`7986167b`](https://github.com/hugoleborso/borso.fr/commit/7986167b)

**What holds for the defect:** `VotingRoundPanel.test.tsx` asserts that an
open round renders its pool, that a suggested song carries its marker there,
and that the row is not interactive. It holds this panel only.

**A sibling, held at level 1:** two screens now show the same pool entry,
and each needs the *not necessarily concert-ready* marker. The rule moved
into `pool-song-row.core.ts`, gated at 100% coverage and 100% mutation, and
both rows call it, so the two screens cannot mark one song differently.

```diff
+export function selectNotConcertReadyLabelKey(status: string): NotConcertReadyLabelKey | null {
+  if (!isNotConcertReady(status)) return null;
+  return NOT_CONCERT_READY_LABEL_KEY[status];
+}
```

**What is not eradicated:** the validation gap, a checklist that asked
whether a round opens and never what the panel shows. In September, a check
from *Result* to report rows needed machine-readable units, and six of
nineteen specs had them. The standard was edited instead, at rung 5:
`.claude/skills/visual-validation/standard.md` now names this entry under
its list of missed checks.

**Proposed:** give *Result* a table, as `### Records` did for tables. The
spec template gains a `### Result artefacts` table, one row per thing a
screen shows, and a script beside `scripts/check-spec-records.sh` refuses a
visual-validation report that lacks a row naming each artefact. The
*Records* gate shows a per-spec table holds in this repository, for new specs
only, so the old corpus no longer blocks it. A screen covered only by a "can
it be triggered" row could then not pass.

**Similar instances:** the catalogue page and the nav's Catalog badge were
suspected from the same report and checked clean. The badge counts
concert-ready songs only, which is why it does not move when a suggestion
lands. See also
[`the-poll-that-undid-the-tap-a-second-later.md`](./the-poll-that-undid-the-tap-a-second-later.md),
the other defect on the same query.
