# Friction inventory for PR #224

PR #224 cut the cost of a feature by trimming review rounds, `CLAUDE.md` and harness. Sources are the archived log at `docs/features/meta/feature-cost-kaizen/kaizen.md` (25 lines, 16 writers, none written as `main`), three lines logged after the archive, the PR's 16 commits, its 14 workflow runs and its comments. The PR has no review thread.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | Dantotsu front matter has no field saying whether a defect was in product code or in the harness | log 02:18 `dantotsu-classifier` | no-op: `zone:` names the path the defect lived in, so `apps/` against `plugins/` or `scripts/` already separates them |
| 02 | implementation | `gh auth status` says `GH_TOKEN` is invalid while `gh api` works through the proxy | log 02:21 `ci-metrics`; reproduced this session | knowledge: what-a-hosted-session-cannot-do-on-github (extended) |
| 03 | implementation | `CLAUDE.md` forbade `--no-verify` and no hook refused it | log 02:29 `claude-md-draft` | fixed: the no-swallowed-push hook refuses `--no-verify` and `HUSKY=0`, and the prose rule is gone from `CLAUDE.md` and three skills |
| 04 | implementation | `link-into.sh` only printed its usage line when the flag came after the two arguments | log 02:32 `impl-small` | fixed: the flag is read in any position |
| 05 | implementation | Deleting a script named in `eradication-paths` failed the dantotsu check | log 02:32 `impl-small` | no-op: fixed by c8c1ee0, which accepts a path that existed in history |
| 06 | implementation | A git push or commit was piped into another command | log 02:33, 03:58 `hook:no-swallowed-push` | no-op: the hook refused it as designed |
| 07 | implementation | A `list_events` page holds 100 events at most, so a multi-day transcript is hundreds of calls | log 02:36 `transcript-timing` | knowledge: reading-another-sessions-transcript-with-list-events |
| 08 | implementation | Agents piped `git commit` through `tail` and reran a slow hook to read its error | log 02:36 `transcript-timing`, measured in another session | no-op: the no-swallowed-push hook now refuses that shape, and it fired twice in this task |
| 09 | implementation | `list_events` pages land inline in the agent's context | log 02:59 `transcript-fetch`, 03:40 `fetch-mcp-kaizens` | merge into reading-another-sessions-transcript-with-list-events |
| 10 | implementation | A hook-heavy session is thousands of pages | log 03:02 `transcript-fetch` | merge into reading-another-sessions-transcript-with-list-events |
| 11 | implementation | The `kinds` filter made pages small enough to land inline, so it cost more context | log 03:41 `fetch-mcp-kaizens` | merge into reading-another-sessions-transcript-with-list-events |
| 12 | implementation | Two fetch agents given one prompt matched each other's transcript | log 03:40 `fetch-mcp-kaizens` | merge into reading-another-sessions-transcript-with-list-events |
| 13 | implementation | The separate `architecture-graph.ts --check` step was redundant | log 03:42 `arch-on-demand` | no-op: fixed by 379fbb0, which made the maps on-demand |
| 14 | implementation | `temporal-coupling.ts` depended on the maps being built first | log 03:42 `arch-on-demand` | no-op: fixed by 379fbb0, which reports when no module graph was read |
| 15 | implementation | Transcripts carry no system reminder, so the harness's context share cannot be measured | log 03:54 `harness-tokens` | merge into reading-another-sessions-transcript-with-list-events |
| 16 | implementation | `check-doc-links.ts` reported a link to an untracked new file as dead | log 03:54 `claude-md` | no-op: the pre-commit mode accepts a file on disk (`isStaged && existsSync`), and the full mode reads tracked files the way CI does |
| 17 | implementation | `check-dated-records-are-append-only.sh` refused deleting the standards reviews | log 03:57 `review-merge` | no-op: the gate did its job, and b384b32 changed it on purpose |
| 18 | implementation | rtk hid lines of `grep`, `ls` and `find` output in an audit | log 04:02 `harness-audit` | no-op: rtk-truncates-command-output already prints on the `hidden: rtk recall` marker |
| 19 | implementation | `git log --since` filters on committer date, which was said to be rewritten for every commit | log 04:02 `harness-audit` | no-op: not reproduced on `main`, where 176 of 1,382 commits have a committer date apart from the author date and `--since 2026-10-01` returns 142 commits against 141 by author date. The rewrite was local to that clone (inferred) |
| 20 | implementation | The shared working tree carried another agent's edits | log 04:14 `meta-gates` | no-op: the `CLAUDE.md` rule on parallel agents says to stage explicit paths |
| 21 | implementation | An agent reached for `pkill` | log 04:17 `hook:no-broad-kill` | no-op: the hook refused it as designed |
| 22 | implementation | The `eval` refusal came from Claude Code's worktree guard, not a repository hook | log 04:17 `browser-simplify` | no-op: the-worktree-guard-reads-shell-text already prints on that refusal |
| 23 | implementation | `agent-browser get cdp-url` on an unopened session launches a browser | log 04:17 `browser-simplify` | knowledge: agent-browser-cli-quirks (extended) |
| 24 | implementation | A scratchpad `cost.py` priced older sessions at another model's rates and doubled totals | post-archive 04:38 `cost-challenge` | merge into feature-cost: `cost_usd` from `get_session` is the source, and the prices are pinned beside the targets |
| 25 | implementation | `list_events` with `kinds: [assistant, user]` returned empty data on every page | post-archive 04:46 `pragma-ux-recent` | merge into reading-another-sessions-transcript-with-list-events |
| 26 | implementation | Precedent plans name a 158 s check, and planners were told to mirror an old plan | post-archive 05:18 `slow-check-audit` | no-op: fixed by ebf2cb4, which tells planners not to copy pre-flight gates (`technical-conception/SKILL.md` lines 91 and 102). Old plans are dated records |
| 27 | ci | The build job failed on paths to gitignored reports once CI stopped building them, and run 992 was cancelled | commit 5e627f2; ci run 40817752986 | no-op: fixed by 5e627f2 |
| 28 | post-merge | The squash commit landed as `meta: ...`, a scope used as a type. No gate reads a pull request's title | commit c54e32da; repo `squash_merge_commit_title: COMMIT_OR_PR_TITLE` | dantotsu: the-title-that-became-a-commit-unlinted |
| 29 | post-merge | The Kaizen's step 6 targets had no owner and lived only in a private artifact | Kaizen artifact step 6 | fixed: `docs/quality/feature-cost.md`, and `/after-task-kaizen` step 1b adds one row per merged pull request |
| 30 | post-merge | A knowledge entry still showed `scripts/browser.sh`, which this PR deleted | `agent-browser-cli-quirks.md` line 229 | fixed: it now calls `agent-browser` |
| 31 | post-merge | `kaizen-refusal.sh` explained its switch by the decisions check this PR deleted | `kaizen-refusal.sh` line 20 | fixed: the comment names a refusal probe |
| 32 | post-merge | The session that set a median-context target of 150k ended at 709,659 tokens of context, for $115.61 | `get_session` `session_01K69KnFMwexFAkg7bqDpDTu` | fixed: recorded as the first, `meta`, row of feature-cost |
| 33 | validation | Proof runs fed to a guard hook logged their refusals to `KAIZEN.md`, because the off switch is named only inside `kaizen-refusal.sh` | this sweep, archived `kaizen.md` | fixed: `/after-task-kaizen` step 5 names `KAIZEN_LOG_REFUSALS=0` |
| 34 | pr-description | This sweep piped its own `git commit` into `grep`, and the hook refused it | archived `kaizen.md` 10:41 | no-op: the hook refused it as designed |
