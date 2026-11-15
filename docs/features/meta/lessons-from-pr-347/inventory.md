# Friction inventory of PR #347

PR #347 made `/route` send any change under `apps/<app>/api/` to Tier 1, which now writes a short spec before the code. It merged on 2026-11-15 as `ff37828`. The operator asked for this sweep to run in the session that shipped #347, and to focus on the conflicts between parallel kaizen sessions.

Sources read: the archive `docs/features/meta/lessons-from-pr-345/kaizen.md` (1 line), the 2 lines logged after it, the merge attempts of this session, the coordinating session's message, the open pull requests, and the files the last 25 kaizen merges changed.

Writers of the 3 lines: `hook:no-discarding-reset` 1, `hook:merge-on-moved-base` 2. A third `merge-on-moved-base` refusal, near 06:26, is missing from the log because the session restarted and recreated `KAIZEN.md` (measured, the local log holds only the 06:15 and 06:19 lines).

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | post-merge | `merge-on-moved-base` refused the merge after #346 landed, because both changed `docs/quality/feature-cost.md`. | line 06:15; this session's merge call | dantotsu: every-sweep-appended-to-the-same-three-lists |
| 02 | post-merge | It refused again after #340 landed, on the same file. | line 06:19 | merge into every-sweep-appended-to-the-same-three-lists |
| 03 | post-merge | It refused a third time after #344 landed. | this session's third merge-main commit `9675e75` | merge into every-sweep-appended-to-the-same-three-lists |
| 04 | post-merge | The coordinating session reported that GitHub ignores `merge=union` and marks parallel kaizen pull requests conflicting. | message from session `session_01K69KnCiFwfmwBFgZJNwUhP`, 06:18 | merge into every-sweep-appended-to-the-same-three-lists |
| 05 | post-merge | 25 of the last 25 kaizen merges edited the cost table, 19 the knowledge index and 9 the ADR index. | `git show --name-only` over the last 25 `docs: lessons from PR` commits | merge into every-sweep-appended-to-the-same-three-lists |
| 06 | process | The restart recreated `KAIZEN.md`, so one refusal was never logged. | row 03 | no-op: the refusal is recorded here and in the dantotsu, and the list that caused it is gone |
| 07 | implementation | `no-discarding-reset` refused `git checkout -- <hook>` and listed `route/SKILL.md` too, though only the hook was named. | line 06:03 of the archive | no-op: the named file was dirty, so the refusal was right; the hook prints every dirty file, which is wider than needed but leads to no wrong action |
| 08 | process | The sweep ran in the shipping session, against `/after-task-kaizen`'s *When to invoke*. | the operator's message, "Stay in this session" | no-op: the operator chose it for this sweep |

Counts: 1 dantotsu, 4 merged into it, 3 no-op.
