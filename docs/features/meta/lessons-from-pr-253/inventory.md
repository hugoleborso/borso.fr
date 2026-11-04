# Friction inventory, PR #253 (lessons from PR #251)

Sources: the archived log `docs/features/meta/lessons-from-pr-251/kaizen.md`
(0 entries), three friction lines the operator pasted into this sweep's
prompt, the 7 commits of PR #253, its conversation (5 preview comments, no
review thread), its 9 workflow runs, `get_session` on
`session_01K69KnEDyeFjU26Ww6Xh6B3`, and this sweep's own start.

Writers: none in the archive. All three pasted lines come from the sweep
session's main thread, which spawned no logged subagent.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | post-merge | The archive holds 0 entries, while the session hit at least three friction events. | `lessons-from-pr-251/kaizen.md` (header only, measured); operator's prompt | fixed: commitlint and the pre-push conflict check now log their own refusals through `kaizen-refusal.sh`, as the PreToolUse hooks already do. Rows 02 and 04 would have reached the log that way. |
| 02 | implementation | The sweep wrote the swept PR's `Claude-Session` trailer in its own commit, then amended before pushing. | operator's prompt; commits `71956f8`, `c6dc246`, `1953c86` carry `session_01K69KnEDyeFjU26Ww6Xh6B3` after the amend | dantotsu: `a-commit-signed-by-the-session-it-was-auditing` |
| 03 | implementation | PR #255 deleted `.prettierrc.json` and added a Prettier hook while PR #253 was open, and #253 had to drop its own Prettier work after a merge conflict. | `6d2f89d` (delete `.prettierrc.json`), merge `4ff1b6f`, `a625647` (defer to #255); `5ce372f` (#255) | fixed: `/after-task-kaizen` step 1 reads open `kaizen` pull requests' inventories, and a row another open sweep eradicates becomes `merge into PR #<n>`. |
| 04 | implementation | Resolving the row 03 conflict cost a merge commit and a second commit rewriting the knowledge entry. | merge `4ff1b6f` at 00:21, `a625647` at 00:22, #255 merged at 00:03 | merge into 03 |
| 05 | implementation | A `sleep 60; cat …` wait was blocked by the harness. | operator's prompt | fixed: `sleep-is-compressed-in-the-hosted-sandbox.md` recommended `python3 time.sleep` as the way round the block. It now says to end the turn for CI and use `run_in_background` or `Monitor` for a local process. |
| 06 | validation | The technical validator now accepts a short-form spec (Goal, Behaviour, Data shape, Out of scope). Whether the full template should be enforced instead is open. | #253 commit `71956f8`; `technical-validator.md` | no-op: a product call, asked of the operator in this PR's body. #253 shipped the short-form option. |
| 07 | post-merge | Merging #253 redeployed every app, because the coverage fix edited each vitest config. | #253 body, first line; preview comments say "Unchanged" for four apps | no-op: the operator merged with that disclosure, and the build output is unchanged for the apps whose source did not move. |
| 08 | post-merge | #253 merged at 00:27:48 while its `ci` run on `a625647` was still running. | run 41746634094, completed `success` at 00:29:35 (measured) | no-op: the run went green. Requiring checks before a merge is a repository setting, which is the operator's call. |
| 09 | post-merge | This sweep's prompt said #253 had merged while it was open with CI running, and its archive was not on `main`. | `pull_request_read` at the start of this session, `merged: false`; `git show origin/main:docs/features/meta/lessons-from-pr-251/` missing | fixed: `/after-task-kaizen` now makes `pull_request_read` its first call and stops unless `merged` is true. |
| 10 | post-merge | The sweep session ended asking whether to queue the kaizen card or let the operator paste it. | `get_session` `post_turn_summary.needs_action` | no-op: CLAUDE.md asks for exactly that question (*Call `spawn_task` only once the operator approves*). |
| 11 | post-merge | The sweep cost $11.36, more than PR #252's whole feature ($7.59). | `get_session` `usage.cost_usd` | no-op: recorded in `docs/quality/feature-cost.md`. One meta row is not a trend. |
