---
date: 2026-10-10
introduced-at: conception
detected-at: production
severity: high
related-pr: '#151'
fix-pr: '#151'
fix-commits: [2c4e615]
eradication-level: 4
time-to-detect: days
tags: [pragma, voting, frontend]
---

# The empty vote nobody could close

## Symptom

« J'ai l'impression que close the vote ne marche pas ? » On a setlist whose
vote nobody had scored, *Close the vote* showed neither the vote nor a
proposal, and the vote stayed open.

## Root-cause chain

1. **Why did nothing show?** Closing first asks the API for a proposal built
   from the scores, and with no score the proposal endpoint answers 409.
2. **Why did the page not handle the 409?** The page had one path: review a
   proposal, then confirm it. A vote with no proposal had no ending.
3. **Why was the case not designed?** The flow was designed from the vote that
   works, where members scored songs. An empty vote is the common case on a
   band that opens a vote and forgets it.

**Root cause:** we thought closing a vote always meant choosing among scored
songs, and actually a vote can close with nothing scored, and then the setlist
should simply lock as it stands.

## Detection failure causes

- **Typing:** a 409 is a runtime answer, not a type.
- **CI:** no test drove a close with zero scores.
- **Visual validation:** earlier passes used a seed where votes were scored.
- **Production:** the operator found it by using it.

## Countermeasure

- **Code:** commit `2c4e615` (PR #151) — `selectCloseIntent(scoredSongCount)`
  returns `lock-unchanged` when nothing was scored, the page locks the setlist
  and opens it, and the proposal query stops retrying a 409.

## Eradication (mandatory — code-level)

**Type:** detection (level 4 — a core test and a task-speed journey)

**Reference:** [PR #151](https://github.com/hugoleborso/borso.fr/pull/151) · commit `2c4e615`

**The actual fix:**

```diff
+export function selectCloseIntent(scoredSongCount: number): CloseIntent {
+  return scoredSongCount === 0 ? 'lock-unchanged' : 'review-proposal';
+}
```

`setlist-vote.core.test.ts` pins both answers under the 100% mutation gate,
and the `close-empty-vote` journey of `pnpm run task-speed` drives the empty
case end to end. The journey runs by hand only, so the level stays 4.

## See also

- [`the-audit-that-measured-buttons-not-jobs.md`](./the-audit-that-measured-buttons-not-jobs.md)
