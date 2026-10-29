# Friction inventory for PR #240

[PR #240](https://github.com/hugoleborso/borso.fr/pull/240), merged as
`d1be9c42`, was the kaizen sweep of PR #234. Sources: the archived log
`docs/features/meta/lessons-from-pr-234/kaizen.md` (1 line), the operator's
note that commitlint warned on three commits, the 9 commits, 9 workflow runs
and the one bot comment. The PR had no review threads.

Writers in the log: `hook:no-broad-kill` 1. No line was written by hand,
although the session saw three commitlint warnings and a merge conflict
(measured from the commits). The session spawned no labelled agent that
logged.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | commitlint warned `footer must have leading blank line` on three of nine commits, each with a correct blank line before the trailers. | commits `230ca34`, `8f3ee3c`, `1b378ab`, re-linted this session; the warning goes when `PR #234` reads `PR 234` | dantotsu: `a-pr-number-turned-the-body-into-a-footer`. |
| 02 | implementation | No line was logged for the warning, and the archive holds no hand-written line. | archive, 1 line, `hook:no-broad-kill`; operator's note | merge into 01: the warning was the event left unlogged, and its class is gone. A hook that logs warnings would add a mechanism for a class that no longer fires. |
| 03 | post-merge | The PR #230 sweep closed the same warning as a no-op, so it recurred here. | `lessons-from-pr-230/inventory.md` row 04 | merge into 01: its reason, "a warning, not a refusal", is the premise step 3 of the chain refutes. |
| 04 | implementation | The same parse makes `footer-max-line-length` refuse a body line over 100 characters after any `#N` line. | probe this session, exit 1, `footer's lines must not be longer than 100 characters` | merge into 01: the same two-rule change removes it. |
| 05 | implementation | `no-broad-kill` refused `pkill`. | archive 17:38 `hook:no-broad-kill` | no-op: PR #234's inventory row 10 already counts this hit, and the hook's message gives `lsof -ti tcp:<port>`. |
| 06 | implementation | `no-swallowed-push` refused the sweep's push. | commit `25baf90` ("count this sweep's own push refusal") | no-op: PR #234's inventory row 02 counts it, and the hook refused before anything ran. |
| 07 | implementation | `docs/quality/feature-cost.md` conflicted with PR #235's sweep, which appended its row first. | merge commit `815ae59`, "Conflicts: docs/quality/feature-cost.md" | no-op: one conflict, resolved in one merge commit. A `merge=union` attribute would also keep both sides of an edited prose line without a conflict, which is worse. |
| 08 | post-merge | The 25 ADRs PR #240 found still `proposed` went to PR #242, opened on the same branch after the merge. | PR #242, base `d1be9c42`, one commit `987a306` | no-op: #242 restarts from the merge and stamps the backlog, and step 1c covers future merges. Whether the operator asked for a separate PR is not in the PR record. |
| 09 | post-merge | The cache-write target failed all three feature rows, and the sweep wrote that it "decides nothing until the measure isolates the rebuilds". | commit `c93a611`; `lessons-from-pr-234/inventory.md` | no-op here: the targets are the operator's, from PR #224's Kaizen. Whether to retire or re-measure this one is asked in this sweep's reply. |
| 10 | ci | None. Every run on the PR head was green. | ci run 40925553020, preview 40925553065, screenshots 40925553273 | no-op: nothing failed. |
| 11 | review | None. One preview bot comment, no review threads. | PR #240 comments | no-op: nothing to act on. |
| 12 | post-merge | This sweep could not `git log` the PR's commits until it fetched them by SHA, because the squash merge left them out of the clone. | this session's log 18:20 | no-op: one fetch by SHA, and git's error names the unknown revision. |
| 13 | post-merge | This sweep's first fix set a `parserPreset` in the commitlint config, which replaced the extended preset whole and failed `feat!: probe`. | this session's log 18:20; prototype reverted | merge into 01: recorded there as the rejected alternative. |
| 14 | post-merge | The merged session kept running for PR #242, so its cost covers more than PR #240. | `get_session` `session_01K69KnEN4KZEAddTa4QvvkW`, status idle, watching #242 | no-op: the cost row says so. |
| 15 | post-merge | `no-swallowed-push` refused this sweep's piped push too. | this session's log 18:20 `hook:no-swallowed-push` | no-op: a filed wall, matched at `docs/quality/working-conditions.md:90`, and the hook refused before anything ran. |

Counts: 1 dantotsu, 0 knowledge, 4 merged, 10 no-op.
