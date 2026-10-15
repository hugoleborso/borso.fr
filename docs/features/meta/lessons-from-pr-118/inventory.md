# Lessons from PR #118 — friction inventory

PR #118 shipped the free practice slots in pragma and one database role per
stage. Two Claude sessions drove it: the one that wrote it (2026-10-02 to
2026-10-15) and one the operator started on 2026-10-12 to finish the merge
work. Sources: the archived friction log
[`docs/features/pragma/practice-free-slots/kaizen.md`](../../pragma/practice-free-slots/kaizen.md)
(30 lines, 10 writers), the validation reports beside it, the PR's CI runs and
the conversation transcript.

PR #173, the weekend fan-out sweep, had already classified six of the log's
lines (00:33, 00:53, 01:48, 02:48, 04:32 and the ADR reservation). They are
listed with its decision so the table stays complete.

## By writer

| Writer | Lines | Reading |
| --- | --- | --- |
| `main` (both sessions, neither told a label) | 7 | Mixed, see the rows. |
| `pr-118` (the second session) | 5 | All pre-push load and worktree problems, settled by #173. |
| `visual-validator` (1, 2, 3) | 9 | Two walls hit by all three: the stale session after a reseed, and the time window. Both are systemic, not local. |
| `technical-validator` (1, 2) | 2 | Shared database, and a brief that named a tool the agent lacked. |
| `hook:*` | 7 | Guards refusing as designed. |

## Inventory

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | piped `git push` or `git commit` into another command, four times | kaizen: hook:no-swallowed-push 10:43, 10:44, 11:10, 02:27 | no-op: the guard refused each time and named the fix; one retry each |
| 02 | implementation | reached for `pkill`, twice | kaizen: hook:no-broad-kill 12:56, 02:59 | no-op: the guard refused as designed |
| 03 | pr-description | wrote a PR body with markup the server strips | kaizen: hook:pr-body 16:21 | no-op: the guard refused as designed |
| 04 | implementation | pre-commit refused a stale, gitignored blueprint index after each new `@FollowsBlueprint` | kaizen: main 11:54 | merge into one-stale-generator-per-rejection |
| 05 | implementation | CI's repo-wide ESLint ran out of heap at 4 GB on a cold cache, main too | kaizen: main 12:06; commit in #118 raising the heap | no-op: superseded by main's per-workspace lint step (`scripts/lint-workspace.sh`) |
| 06 | implementation | `pnpm dev` started an empty Postgres and the seed answered 500 | kaizen: main 12:30 | merge into knowledge pnpm-dev-serves-a-schema-it-never-migrated |
| 07 | validation | a concurrent run on the shared local Postgres failed 11 back-e2e tests | kaizen: technical-validator 13:13 | merge into four-worktrees-one-test-database (#173) |
| 08 | validation | the preview seed answered 500 once, then 200 on retry, twice | kaizen: visual-validator 13:22, visual-validator-2 14:27 | fixed: in #118 (squashed as `52684a2`), the API timeout went from 10 s to 20 s; the seed was being cut off |
| 09 | validation | `argent run screenshot --out` ignored its path | kaizen: visual-validator 13:24 | knowledge: driving-previews-with-agent-browser-and-argent, extended, with a trigger on the command |
| 10 | validation | the validator brief said to wait with Monitor, which the subagent did not have | kaizen: technical-validator-2 14:21 | no-op: the line came from the brief written in that session; no committed skill or agent names Monitor |
| 11 | validation | `find label … fill` printed `Done` and left the field empty | kaizen: visual-validator-2 14:45 | knowledge: agent-browser-cli-quirks, extended |
| 12 | validation | after a reseed, the shell stayed signed in while every call answered 401 | kaizen: visual-validator-2 14:45, visual-validator-3 15:00 | dantotsu: the-tab-that-stayed-signed-in |
| 13 | validation | the "cut at now" case can only be seen during the evening window | kaizen: visual-validator-2 14:45, visual-validator-3 14:52 | no-op: `free-slots.core` takes `now` as an argument and its tests cover the cut at 100% mutation; a preview clock override would add a production code path that exists only for a test |
| 14 | validation | after an 80-minute idle, the browser session failed every fetch until restarted | kaizen: visual-validator-2 16:08 | knowledge: agent-browser-cli-quirks, extended |
| 15 | implementation | pre-commit ESLint failed in a fresh worktree because `@borso/infra` had no `dist/` | kaizen: pr-118 00:33 | merge into the-worktree-that-could-not-see-its-own-infra (#173) |
| 16 | implementation | a push that merged main mutated 81 talos files | kaizen: pr-118 00:53 | merge into the-fetch-that-undid-the-narrowing (#173) |
| 17 | implementation | concurrent mutation starved four unrelated test suites | kaizen: pr-118 01:48 | merge into the-gates-that-timed-each-other-out (#173) |
| 18 | implementation | pre-push typecheck OOM-killed beside sibling agents' mutation | kaizen: pr-118 02:48 | merge into the-gates-that-timed-each-other-out (#173) |
| 19 | implementation | parallel worktrees shared one pragma test database | kaizen: pr-118 04:32 | merge into four-worktrees-one-test-database (#173) |
| 20 | implementation | pre-push failed a talos stack test after merging main, on a bucket name, because `@borso/infra` was built before the merge | kaizen: main 02:48 (2026-10-12) | merge into the-worktree-that-could-not-see-its-own-infra: #173 put `ensure-infra-built.sh`, which compares source and `dist/` times, at the top of pre-push |
| 21 | post-merge | merging main brought Sentry tracing that would have sent the secret iCal address to Sentry | kaizen: main 05:12; commit `4915f9e`, squashed as `52684a2` | dantotsu: the-trace-that-carried-the-secret-in-its-path |
| 22 | implementation | a `pgrep -f` wait loop matched itself and ran until the time limit, twice | kaizen: main 05:52 | knowledge: pgrep-f-matches-its-own-wait-loop |
| 23 | post-merge | believed the renamed migration would fail on the preview, and edited it | kaizen: main 13:23; transcript; PR #118 body | dantotsu: the-file-renamed-where-its-entry-could-not-see |
| 24 | post-merge | two sessions merged main into the same branch at once; the second push waited out the gates to be rejected, twice | transcript, 2026-10-12 02:5x and 05:2x; ci: heads `65f4875`, `2f868e1` | dantotsu: two-sessions-one-branch |
| 25 | conception | the three ADRs were renumbered three times, 0023 to 0031, 0032 and 0036 | commits `c31a44aa`, the merges of 2026-10-12 and 2026-10-15 | merge into the-reservation-nobody-else-could-read: `next-adr-number.sh` (#173) reads every branch, and the last renumbering used it |
| 26 | conception | two ADRs shared 0021 in the first draft | transcript, 2026-10-02 | merge into the-reservation-nobody-else-could-read |
| 27 | implementation | a CDK circular dependency: the function role waited on the schema custom resource | transcript, 2026-10-02 | no-op: solved once inside `DsqlSchema.grantConnect`, the only place that needs it, and covered by its synth test |
| 28 | implementation | mutation testing found real defects: a 10 000 occurrence cap and exceptions related across series | transcript; `ics.core.ts` | knowledge: ical-js-relates-exceptions-without-checking-the-uid (the gate worked; the vendor behaviour is the lesson) |
| 29 | validation | a TZID with no VTIMEZONE was read as Paris time | report: visual-validation FAIL, 2026-10-02 | merge into ical-js-relates-exceptions-without-checking-the-uid |
| 30 | validation | `huge.ics` answered 500 on the preview | transcript; fixture now `text/plain` | knowledge: hono-lambda-base64-encodes-text-calendar |
| 31 | validation | `localhost.` and a redirect to localhost passed the save-time check | report: visual-validation FAIL, 2026-10-02 | no-op: fixed in #118 with tests; the redirect rule moved to read time, as the amended spec records |
| 32 | validation | a validator wrote into an already committed, dated report | transcript, 2026-10-02 | no-op: caught and restored the same hour; a single occurrence |
| 33 | implementation | the stop hook asked to push while a push was still in its gates | transcript, several turns | no-op: the hook is outside this repository and cannot see a running push |
| 34 | deploy | "rebase" was asked; the branch was merged with main instead, because main squash-merges | transcript, 2026-10-15 | no-op: the squash leaves the same single commit on main either way |

## Counts

| Decision | Rows |
| --- | --- |
| dantotsu | 4 (rows 12, 21, 23, 24) |
| knowledge, new | 3 (rows 22, 28, 30) |
| knowledge, extended | 3 (rows 09, 11, 14) |
| fixed | 1 (row 08) |
| merge into an earlier entry | 12 |
| no-op, with reason | 11 |
