# Friction inventory — PR #206

PR #206 (squashed as `508e6355`) let assistants act on pragma through an MCP
endpoint and pragma's own OAuth server. It ran the `/feature-pipeline` on
2026-10-27 (plan, seven implementation slices, three technical and two visual
validations, open-pr), then took three more rounds after the operator tried
it on the preview: compact results (87 tools to 73), the operator's cut to 35,
and a CI split.

The primary input is the friction log archived at
[`docs/features/pragma/assistants-act-on-pragma/kaizen.md`](../../pragma/assistants-act-on-pragma/kaizen.md):
52 lines. The feature worktree's 29 come from 15 writers; the orchestrating
session's 19 are all hook refusals, cut out of a log that also holds PRs #193,
#199 and #218 (row 42); 4 are this sweep's. The other sources are the 38
commits of the pull request, its CI runs, its validation reports and run
journal, the operator's list of what they saw, and a check of every candidate
against `main` at `508e6355`. The pull request has no review threads.

Every candidate was checked on `main` first. "fixed" names the commit that
already fixed it; only what still reproduced got an entry.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | plan | The spec named tool files `*.tools.ts`, a suffix pragma's layer-marker budget would refuse. | kaizen 08:42 (`technical-conception-01`) | no-op: the planner caught it by reading the layer table, which is step 2 of the conception standard, and the layer-marker gate would refuse it at commit anyway |
| 02 | implementation | The plan had slice 2 use an SDK schema the SDK only joins in slice 3. | kaizen 09:28 (`implementation-02-2`) | no-op: one ordering slip in seven slices, resolved inside the slice; no earlier entry has this shape |
| 03 | implementation | The plan cited an in-memory rate-limit blueprint for a limit it also called database-backed. | kaizen 09:28 (`implementation-02-2`) | no-op: one contradiction, resolved inside the slice; same reason as 02 |
| 04 | implementation | back-e2e could not observe `reportTaggedFailure`, so services take a `reportFailure` option threaded through `createApp`. | kaizen 09:28; `oauth.service.ts`, `token.service.ts` on `main` | no-op: the injected reporter is the testable shape and is what shipped |
| 05 | implementation | `set_default_lineup` described the lineup backwards, and no test reads a tool description against its schema. | kaizen 11:20 (`implementation-06-6`) | fixed: `5cc1350c` corrected it; the tool was later folded into `save_song` (`f599715e`, in `508e6355`) |
| 06 | implementation | The test-only `tool-coverage.core.ts` was refused by `check-pure-modules-have-callers`, and only pre-commit said so. | kaizen 11:39 (`implementation-06-6`) | no-op: the gate fired with its reason, and the module was listed as test-only in `5cc1350c` |
| 07 | validation | agent-browser lands on `chrome-error://chromewebdata/` after the consent redirect and hides the callback address when nothing listens on the loopback port. | kaizen 12:05 (`implementation-07-7`); `visual-validation-2026-10-27-1403.md` row 10 used a loopback listener | knowledge: extends `agent-browser-cli-quirks.md`, triggered by the error page's address |
| 08 | implementation | The seed wipe did not clear the three new assistant tables, and nothing ties a new table to it. Six older tables had the same gap. | kaizen 12:05 (`implementation-07-7`); `test-seed.repository.ts` on `main` wiped 28 of 37 tables | dantotsu: the-seed-wipe-that-knew-only-the-tables-of-its-day |
| 09 | validation | Four stage agents were told to run a validation skill, had no Agent tool, and validated in their own context, one day after PR #193's entry fixed the contract. | kaizen 12:17, 13:30, 14:02, 14:47 (three writers); `a83f0a60` is an ancestor of the plan commit | dantotsu: recurrence added to the-validator-opened-a-checkout-holding-only-the-plan; operator decision 2 |
| 10 | validation | ESLint over the branch ran out of heap twice. | kaizen 12:20, 13:36 (two writers) | fixed: `9dcf7454` (#197) replaced ESLint with oxlint |
| 11 | validation | `state.json` written with `json.dump` failed the formatter check. | kaizen 12:40 | no-op: the format gate named the file and one command fixed it |
| 12 | implementation | Editing the unshipped migration 0020 left the local Postgres on the old schema, and back-e2e failed on a missing column with nothing naming the migration. | kaizen 13:28 (`implementation-fix-technical-01`); `a6026bbf` | knowledge: extends `pnpm-dev-serves-a-schema-it-never-migrated.md`, triggered by the missing-column output |
| 13 | validation | The workflow reused the label `technical-validation-01` for a second run, so its scratch folder and verdict file were taken. | kaizen 14:48 | fixed: `feature-pipeline.md` now says `<NN>` counts every invocation in the run |
| 14 | validation | `argent.sh touch` on a button that navigates reported `isRealTouch: false` with no events, twice, while the tap worked. | kaizen 14:05, 14:43 (two writers); `visual-validation-2026-10-27-1403.md` note on row 10; reproduced on a one-link page | dantotsu: the-touch-probe-that-left-with-the-page |
| 15 | validation | argent's Chromium has no session and no fill, so signing in for a touch row needed a hand-written CDP helper. | kaizen 14:43 (`visual-validation-02`) | no-op: one agent, once, and the helper it wrote is not recorded, so there is nothing verified to capture |
| 16 | implementation | The preview seed stamped its grant with epoch 0, so the seeded grant was dead. | kaizen 14:22 | fixed: `b23c3708` reads the member's real epoch |
| 17 | pr-description | `/open-pr` step 5b says to replace `<n>` in the visual report, and the append-only check refuses the edit. | kaizen 15:33 (`open-pr-01`); reproduced on `main`: the check refuses any `M` under `validation/` | fixed: `/open-pr` and `/visual-validation` now leave the report alone |
| 18 | post-merge | `check-pr-body.ts` reads a file, so checking a posted body meant retyping it. | kaizen 00:28 (`merge-206`) | fixed: `check-pr-body.ts --pr <n>` reads the posted title and body through `gh api` |
| 19 | post-merge | `db-read.sh` timed out on port 5432 from the hosted session. | kaizen 21:28 (`mcp-rationalize`) | fixed: `60b6f4d5` (#218) moved the read to an invoked Lambda |
| 20 | post-merge | After #218, `db-read.sh` refused with "no AgentReaderFunctionName output". | operator | fixed: the production deploy after `2fff0fd6` (#219); on 2026-10-29 the stack output resolves to `pragma-prod-agent-reader` |
| 21 | post-merge | Every `db-read.sh` invoke from this session is now refused with an explicit deny on `…-agent-reader:$LATEST`, for pragma and last-loop-lepin, and the refusal came out as a Node stack trace. | kaizen 02:48 (`kaizen-206`); two runs on 2026-10-29 | fixed: the script reports it on one line with exit 4 and names §12.7; knowledge extended. The IAM state is operator action 3 |
| 22 | post-merge | `db-read.sh pragma "<statement>"` sends `pragma <statement>` to the reader, because the application is chosen by `APP`. | kaizen 02:48 (`kaizen-206`) | fixed: an application name in first position is refused with the `APP=` form |
| 23 | implementation | Import cycles, not nouns, decided where the composite tools live. | kaizen 22:14 (`mcp-rationalize`) | no-op: `import/no-cycle` doing its job, and plan D12 records the placement and why |
| 24 | implementation | `tools/list` carried `$schema`, `additionalProperties` and `execution` on every tool, about a quarter of the list, and nothing measured its size. | kaizen 22:14 (`mcp-rationalize`) | fixed: `facf2ae3` drops them and `mcp/tool-budget.test.ts` bounds the list (in `508e6355`) |
| 25 | implementation | A heredoc writing a commit message, chained before a piped `git commit`, never ran because the hook refused the whole command, and the next commit failed on the missing file. | kaizen 01:26 (`mcp-cut`) | fixed: the refusal now says a heredoc in front of the commit wrote nothing |
| 26 | ci | `app-tests (pragma)` ran 10m16s and was cancelled at its 10-minute limit, twice; `main`'s own job takes 9m23s to 9m55s. | kaizen 01:48 (`mcp-cut`); run `40801563077` cancelled on attempt 3; `557117e4` | no-op for this PR: #206 moved its own suites to `app-tests (pragma-assistants)`. Splitting `main`'s pragma job is operator decision 1 |
| 27 | ci | `vitest list` ignores `--shard`, so a shard split cannot be checked without running it. | kaizen 02:12 (`split-206`); reproduced: 18, 18 and 18 files | knowledge: vitest-list-ignores-shard |
| 28 | implementation | `no-swallowed-push` refused fourteen commands, a commit or push piped into `tail`. | 14 `hook:no-swallowed-push` lines | no-op: the hook refused every one, as in #218 row 12; row 25 is the side effect that needed a fix. The `guard-hooks-refuse-a-command` wall counts them |
| 29 | implementation | `no-broad-kill` refused four commands. | 4 `hook:no-broad-kill` lines | no-op: the hook did its job |
| 30 | pr-description | `pretool-github-pr-body` refused a body carrying markup the server strips. | 1 `hook:pr-body` line | no-op: the hook did its job |
| 31 | pr-description | The pull request body told the operator to add the MCP server on the preview's site host, which serves `index.html` for `/mcp`. | operator; current body carries `pragma-pr-206-api` | dantotsu: the-preview-address-that-named-the-site-host |
| 32 | validation | The Account page built the same address from the page origin (`TV-PREVIEW-INSTALL-URL`). | `technical-validation-2026-10-27-1234.md`; `d992239a` | merge into the-preview-address-that-named-the-site-host |
| 33 | validation | A refresh token two rotations old was not treated as a replay (`TV-REPLAY-OLDER-TOKEN`). | `technical-validation-2026-10-27-1234.md`; `a6026bbf` | no-op: the validator caught a spec-versus-code gap and `a6026bbf` fixed it with tests; the gate worked |
| 34 | validation | The DSQL loser of a code claim or rotation answered 500 (`TV-DSQL-CLAIM-CONFLICT`). | same report; `a6026bbf` | no-op: the blueprint required it and the validator caught it; the gate worked |
| 35 | validation | After a password change the Account page still listed a dead grant. | `visual-validation-2026-10-27-1403.md`; `b23c3708` | fixed: `b23c3708` |
| 36 | conception | The tools mirrored the routes with route bodies as results: 87 tools, 46,737 characters of list, ten tasks in 42 calls and 104,194 characters. The operator asked twice before it reached 35. | operator; `facf2ae3`, `f599715e` | fixed: `tool-budget.test.ts` in `508e6355`; this PR adds a budget-gate row to the conception standard for any surface a model reads |
| 37 | post-merge | The orchestrator called CI green while a job was still running. | operator | dantotsu: green-said-of-a-run-still-going |
| 38 | post-merge | The orchestrator told the operator "the CI check re-runs once"; no such mechanism exists. | operator | merge into green-said-of-a-run-still-going |
| 39 | validation | A subagent said "nothing is failing" before CI had run. | operator; #197 inventory row 24 | fixed: `79be245e` (#208); `pre-push` prints that CI has not run on the sha. Not seen in #206's logs |
| 40 | post-merge | Three container restarts interrupted agents mid-push and mid-merge; one agent stopped by mistake could not be resumed. | operator | no-op: platform events with no artefact of the half state; the push and the merge completed afterwards |
| 41 | implementation | Four of the seven implementation agents (`01-1`, `03-3`, `04-4`, `05-5`) logged nothing. | archived log | no-op: they carried labels, as their siblings' lines show; an empty log from a slice that went smoothly is not evidence of hidden friction |
| 42 | post-merge | The orchestrating session's log mixes four pull requests' lines stamped with a time and no date, so this sweep cut the #206 part by commit times. | kaizen 02:57 (`kaizen-206`) | fixed: `kaizen.sh` stamps the date, and `working-conditions.core.ts` reads both stamps |
| 43 | post-merge | The kaizen worktree had no `node_modules` and no generated reports, so `check-hook-decisions` failed on the blueprint-context case. | kaizen 02:48 (`kaizen-206`) | no-op: CLAUDE.md's *Generated files* says a fresh worktree must run `scripts/reports.sh` first |
| 44 | ci | `ci` and `architecture` on `f4709691` were cancelled. | runs `40532103587`, `40532103620` | no-op: superseded by the next push, which is the concurrency setting |
| 45 | review | No review threads on the pull request. | `get_review_comments`: 0 | no-op: nothing to sweep |

## Counts

| Decision | Rows |
| --- | --- |
| dantotsu | 5 (08, 09, 14, 31, 37) |
| knowledge | 3 (07, 12, 27) |
| fixed in this pull request | 7 (13, 17, 18, 21, 22, 25, 42) |
| fixed before this sweep | 9 (05, 10, 16, 19, 20, 24, 35, 36, 39) |
| merge | 2 (32, 38) |
| no-op | 19 (01, 02, 03, 04, 06, 11, 15, 23, 26, 28, 29, 30, 33, 34, 40, 41, 43, 44, 45) |

Row 36 is counted as fixed before the sweep; this pull request adds the
conception-standard row on top.

## Patterns

**The same mistake twice inside one pull request is the strongest signal here
(31, 32).** The preview address was fixed in the site at 13:18 and written
wrong into the body at 15:33. The first fix was local, a unit test on one
function; the class, a preview's API living on another host, had no check
where the second agent wrote. PR #27 hit it a first time. Each fix guarded the
place it happened.

**Two tools reported the opposite of what happened (14, 37).** The touch probe
said a working tap failed; the orchestrator said a running CI had passed. Both
summarised what they could still see after the thing they were judging had
moved on, a page that navigated and a run that had not finished.

**A level-5 entry did not survive one day (09).** PR #193's eradication was a
paragraph in the document the workflow script is generated from. The next run
read from a branch that held it and still had four agents validate their own
context. The weak-point map predicts exactly this for prose standing in for a
check.

**Fourteen refusals from one hook is a habit, not a defect (28).** The hook
refused every piped commit correctly. The cost was one side effect, the lost
heredoc (25), which now has a sentence in the refusal.
