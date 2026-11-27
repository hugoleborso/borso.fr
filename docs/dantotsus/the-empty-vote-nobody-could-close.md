---
date: 2026-10-10
introduced-at: conception
detected-at: production
severity: high
related-pr: '#151'
fix-commits: [67bab828]
eradication-level: 4
time-to-detect: days
tags: [pragma, voting, frontend]
eradication-paths: [apps/pragma/site/src/routes/setlists/setlist-vote.core.ts, apps/pragma/site/src/routes/setlists/setlist-vote.core.test.ts]
zone: apps/pragma/site/src/routes/setlists
recurs: none (a missing rule in the vote close flow, not an audit or layout defect)
---

# The empty vote nobody could close

## User impact

« J'ai l'impression que close the vote ne marche pas ? », the operator, in
production.

| | Seen | Expected |
| --- | --- | --- |
| *Close the vote* on a setlist nobody scored | neither the vote nor a proposal, and the vote stays open | the setlist locks as it stands |
| *Close the vote* on a scored setlist | a proposal to review, then confirm | the same |

Every band whose vote got no score was stuck. An empty vote is the common case
for a band that opens a vote and forgets it.

## Causal chain

- *Close the vote* showed nothing, and the vote stayed open.
  - The page waited for a proposal that never came.
    - Closing first asks `GET /:id/closing-proposal`, and with no score it
      answers 409:

      ```ts
      if (tallies.length === 0) return { kind: 'no-votes' }; // ← voting.service.ts, mapped to 409 by the controller
      ```

      - The page had one path, review a proposal then confirm it, so a 409
        had no ending. `POST /:id/close` refuses an empty vote the same way.
        - Commit `026ddef8a` designed the close flow from the vote that works,
          where members scored songs. Its inputs described only that vote
          (Material).

## Root cause of occurrence

*Thought closing a vote always means choosing among scored songs, actually a
vote can close with nothing scored, and then the setlist should lock as it
stands.* (Material)

The flow was built from the scored vote alone, so "no score" became an error
rather than an outcome. The API and the page each encoded that belief.

## Detection failure causes

- **Typing:** a 409 is a runtime answer, not a type.
- **CI:** no test drove a close with zero scores.
- **Visual validation:** earlier passes used a seed where votes were scored.
- **Production:** the operator found it by using it.

## Countermeasure

Commit `67bab828` (PR #151): `selectCloseIntent(scoredSongCount)` returns
`lock-unchanged` when nothing was scored, the page locks the setlist and opens
it, and the proposal query stops retrying a 409.

## Eradication

**Type:** detection (level 4). A core test pins the decision, and a journey
drives the empty case by hand.

**Reference:** [PR #151](https://github.com/hugoleborso/borso.fr/pull/151),
commit `67bab828`.

```diff
+export function selectCloseIntent(scoredSongCount: number): CloseIntent {
+  return scoredSongCount === 0 ? 'lock-unchanged' : 'review-proposal';
+}
```

**Proof it can fail:** `setlist-vote.core.test.ts` pins both answers under the
100 % mutation gate. The `close-empty-vote` journey of `pnpm run task-speed`
drives the empty case end to end. It runs by hand only, so the level stays 4.

**Similar instances:** the rule "no score means lock unchanged" now lives in
two places. The API answers `no-votes` 409
(`apps/pragma/api/src/setlists/setlists.controller.ts:129` and `:142`), and the
site recomputes the decision from its own `scoredSongCount`
(`setlist-vote.core.ts:53`). Two copies of one rule can disagree.

**Proposed:** let `POST /:id/close` accept an empty vote and lock the setlist
as it stands on the server. Delete the `no-votes` outcome and its 409, and the
client's `selectCloseIntent` branch. The page then has one path, and an empty
vote cannot dead-end again.
