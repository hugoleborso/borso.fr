# Friction inventory of PR #354

Sources: the archived log `docs/features/pragma/band-backlog-november/kaizen.md`
(25 lines, all added by this merge, read with `scripts/kaizen.sh sweep-input
e42eda8`), the merged session's 12 typed operator messages and the replies
around them (read with `list_events`), the pull request's 23 commits, its two
bot comments (no review thread), `get_session`, and open kaizen PR #359.

Writers: `visual-validator` 3, `main` 1, ten agent labels with one or two
lines each (`back-link`, `scene-tabs` 2, `session-order` 2, `flames`,
`tab-transpose`, `flame-sessions`, `flame-final`, `band-links`, `song-page` 2),
and nine guard-hook refusals. Every agent was told its label.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | Three agents found the app's typecheck and lint red on other agents' half-done work and filtered the output by hand. | kaizen `back-link` 06:54, `scene-tabs` 06:58, `session-order` 06:59 | fixed: `/route` *Parallel agents* names `scripts/lint-staged-files.sh <files>` and a per-file typecheck filter |
| 02 | implementation | Lint panicked in tsgolint on a file another agent had just deleted. | kaizen `session-order` 06:59 | merge into 01: linting only one's own files never reads it |
| 03 | implementation | The main session could not commit for about ten turns, because the flame agent's in-progress files failed the blueprint-index and knip hooks. | transcript 06:52 to 07:20, « Toujours rien de commité » | merge into 01: the `parallel-agents-share-the-index` wall, already filed |
| 04 | implementation | The worktree guard refused heredocs, redirects, shell functions and `eval`. | kaizen `band-links` 09:17, `song-page` 09:29 | fixed: `the-worktree-guard-reads-shell-text` lists the cases; three agents hit it |
| 05 | implementation | The worktree guard refused a `sed` whose text said "digit", reading git inside it. | kaizen `tab-transpose` 07:34 | merge into 04 |
| 06 | spec | `check-spec-records.sh` refused every new spec with no `CREATE TABLE`, in silence. Grep found nothing under pipefail. The gate came from kaizen PR #334 the same day. | kaizen `main` 06:47; commit `6c8ef06` | fixed: pre-commit now names a check that refuses with no message as the check failing; proved on the old script |
| 07 | implementation | `convertChordsAboveLyrics` spliced chords into tab staff lines and the key guess read `E\|` as a chord, with no test pasting a tab. | kaizen `scene-tabs` 06:58; commit `2353b66` | no-op: fixed and tested in `2353b66`, and tabs now live in a tab block the transposer skips |
| 08 | implementation | The session dropped tab transposition from scope on its own; the operator restored it. | transcript 06:58 report, operator 07:08 « C'est pratique la transposition tab si ! » | dantotsu: `the-session-that-redrew-the-scope-twice` |
| 09 | implementation | The session read « Compte les repets juste » as rehearsals only, dropped presence and removed the 20:00 reminder unasked, then rebuilt them. | operator 08:25 and 08:57; commits `c3b2eba`, `a3a0e82` | merge into 08 |
| 10 | implementation | Single-dash tabs did not transpose. The agent found it at 07:21, the question waited until the operator came back at 16:30. | transcript 07:21, 07:39; commit `1341f45` | no-op: the closed question was asked and answered, and the fix shipped with tests and a 100% mutation score |
| 11 | implementation | `SessionDetail.tsx` sat at 300 of 300 lines, so any change to the session screen first had to move code out. | kaizen `session-order` 06:59 | no-op: the `file-size-cap` wall, and the cap did its job |
| 12 | implementation | Moving the flame inputs into `streaks.service` closed an import cycle, so presence writes needed their own service file. | kaizen `flames` 07:04 | no-op: the layering rule caught it and the fix is the right shape |
| 13 | implementation | `SongViewTabs` was shared with the setlist entry sheet, which no brief or vocabulary said; removing the Lineup tab broke the sheet first. | kaizen `song-page` 09:29 | no-op: the agent caught it before commit and the sharing shows in the component's imports |
| 14 | implementation | Task walk « Learn a new song » still tapped the removed Practised toggle, and no gate runs the walks. | kaizen `flame-sessions` 08:46 | no-op: fixed in the merge; the walks are an on-demand measurement harness for the UX redesign, not a test suite |
| 15 | validation | `scripts/phone.sh touch` left a pill strip at `scrollLeft` 0 after its 1280 px round trip. | kaizen `visual-validator` 06:46 | knowledge: `driving-previews-with-agent-browser-and-argent`. A fix was built and dropped, since a minimal `sm:overflow-visible` strip kept `scrollLeft` 401 through the unchanged tool (measured) |
| 16 | validation | Proving that back does not reopen a child page needed a fresh browser, as earlier entries in the tab looked like a defect. | kaizen `visual-validator` 07:23 | knowledge: `driving-previews-with-agent-browser-and-argent` |
| 17 | validation | `agent-browser fill @ref ""` printed Done and kept the old value. | kaizen `visual-validator` 09:49 | knowledge: `agent-browser-cli-quirks` |
| 18 | implementation | The no-discarding-reset hook refused a path-scoped restore and listed every dirty file in the tree; the agent bypassed it with `git show HEAD:path > path`. | kaizen `flame-final` 09:12, `hook:no-discarding-reset` 08:59, 09:27 | fixed: the hook judges and lists only the named paths and offers a stash of them; proved on a scratch repository |
| 19 | ship | PR #354 merged three migrations and two API slices with no technical review. The gate runs only when the pull request opens, and it opened on a site-only change. | merge validation folders; `.claude/hooks/pretool-api-change-needs-validation.sh` | dantotsu: `the-review-gate-that-only-watched-the-door`, a pre-push notice, the option the operator picked |
| 20 | pr-description | The pull request opened once without a visual-validation report. | `hook:visual-validation` 06:43 | no-op: the hook refused and the report was added |
| 21 | ship | Pre-push refused twice on a branch conflicting with main. | `hook:pre-push-conflict` 07:26 ×2; merge commit `764d76f` | no-op: the guard did its job, resolved by merging main |
| 22 | implementation | Prettier was reached for twice. | `hook:no-prettier` 07:33, 08:46 | no-op: the hook refused and named oxfmt |
| 23 | implementation | pkill or killall was reached for. | `hook:no-broad-kill` 06:49 | merge into PR #359, which ships `scripts/stop-port.sh` |
| 24 | implementation | A subagent ran a git command that writes the shared index. | `hook:subagent-no-staging` 07:28 | no-op: the hook refused it |
| 25 | implementation | CI found seven surviving mutants in the tab-block code. | commit `b9669a5` message | no-op: the mutation gate did its job, the tests were added |
| 26 | conception | The first song-page mockups ignored the existing page; the operator asked to start from it. | operator 08:50 « Inspire toi plus de l'existant » | no-op: a product call answered on mockups, which is what they are for |
| 27 | ship | Questions went out as plain text, four at once, and repeated six times over nine hours. | transcript 07:39 to 10:01 | no-op: the operator answered them all at 16:30; nothing was lost but waiting time |
| 28 | ship | From 07:39 the session wrote to the operator in English while he wrote in French. | transcript | no-op: no rule sets the reply language and the operator never remarked on it |
| 29 | post-merge | Reading the transcript with `kinds: [user]` landed a large page inline. | kaizen `operator-messages` (this sweep) | no-op: `reading-another-sessions-transcript-with-list-events` already says a `user` event carries every tool result |
| 30 | post-merge | No ADR was added by the merge. | `git diff --name-only e42eda8^ e42eda8 -- docs/adr/` | no-op: nothing to stamp |
