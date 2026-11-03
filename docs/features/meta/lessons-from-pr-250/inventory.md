# Friction inventory: PR #250

PR #250 let a pragma practice pick its songs from setlists as well as concerts,
on two tabs. Sources are the archived log at
`docs/features/pragma/practice-songs-from-setlists/kaizen.md` (1 line, 1
writer, `hook:no-swallowed-push`), two lines logged after the archive and
pasted into the sweep's prompt (`hook:no-broad-kill`, `hook:no-swallowed-push`),
the operator's note on setlist order, the PR's 5 commits, its 15 workflow runs,
its 2 bot comments and `get_session` on the session. The PR has no review
thread and no validation report.

Every line in the log was written by a hook. The main session logged nothing by
hand, and no subagent was dispatched.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | The session piped `git commit` or `git push` into another command and the hook refused it, at 16:00 and again at 18:37 | archive 16:00 `hook:no-swallowed-push`; pasted line 18:37; measured across every archive: 113 refusals in 32 tasks | dantotsu: `a-guard-that-refused-what-it-could-repair` |
| 02 | sweep history | Earlier sweeps closed this refusal as a no-op because the hook stopped it before harm | `lessons-from-pr-230/inventory.md` row 02, which cites PR #228's sweep doing the same | merge into 01 |
| 03 | sweep history | The 2026-08-19 dantotsu said level 1 was not reachable because nothing in the harness could turn on `pipefail` for a composed command | `docs/dantotsus/a-push-that-failed-and-reported-success.md` "Level 1 is not reachable from here"; measured this session: a PreToolUse hook's `updatedInput` exists in Claude Code 2.1.317's hook schema, and the env file is inlined into the same `bash -c` as each command | merge into 01 |
| 04 | implementation | The session reached for `pkill` or `killall` | pasted line 17:12 `hook:no-broad-kill`; measured across every archive: 40 refusals in 18 tasks | no-op: the hook cannot rewrite a name pattern into the caller's own PID, because only the caller knows which process it started. Its message already gives the PID and `lsof -ti tcp:<port>` forms |
| 05 | pr-description | Two lines were logged after the archive commit and missed the archived file | archive committed at 17:02 (`dc79d0b`), lines at 17:12 and 18:37 | no-op: `/open-pr`'s after-the-merge step pastes them into the kaizen prompt, and this prompt carried both (measured) |
| 06 | implementation | The concerts and setlists were first shown as two stacked sections, then moved onto two tabs after the PR opened | commit `033b80f` "the two stacked sections pushed the setlists below a long concert list"; screenshot folders `2026-11-03-1711` and `2026-11-03-1805` | no-op: a display choice the operator made on the first screenshots, which is the review loop working. The second walk used ten concerts |
| 07 | implementation | The operator asked to order setlists by creation date. The table has no such column | operator note in the sweep prompt; measured: `setlist_sheet` in `apps/pragma/api/src/setlists/setlists.schema.ts` has `id`, `name`, `kind`, `status`, `target_song_count` | no-op: adding a column is an architecture call, and the operator chose to drop the creation date. Recorded in the PR's decisions table |
| 08 | implementation | An interim order, name from Z to A, shipped and was replaced five minutes later by the Setlists page order | commits `0c23095` (18:32) and `c75193b` (18:37) | merge into 07 |
| 09 | validation | The preview walk got 401 with the seed password | PR body *Gap: preview walk* | no-op: `docs/knowledge/a-pragma-preview-cannot-be-signed-into.md` already says so and names the local walk, which the session did |
| 10 | validation | No technical or visual validation report was committed | `docs/features/pragma/practice-songs-from-setlists/` holds only `kaizen.md` | no-op: tests and a 100% mutation score on `practice-songs.core.ts` are in the PR body. Whether `/route` chose this tier is unknown, because the transcript was not read |
| 11 | ci | One `ci` run was cancelled | run 41695066194, cancelled when `c75193b` was pushed five minutes later | no-op: superseded by the next run, which passed |
| 12 | post-merge | The PR merged while three checks were still running | `get_session` summary; `ci` run 41695724440 finished 18:45:42, merge at 18:44:53, conclusion success | no-op: the merge is the operator's call, and every run ended green (measured) |
| 13 | sweep | Auto mode refused both live proofs of the eradication, as persistence and as self-modification | this session's log, two `main` lines | merge into 01. The env-file route stays unproven. The `updatedInput` probe ran once the operator approved it, and reported git's status 1 through `tail` |
