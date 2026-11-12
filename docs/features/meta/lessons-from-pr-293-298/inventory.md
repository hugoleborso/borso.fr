# Friction inventory, PRs #293 and #298

One piece of work on pragma's API cold start, in one session, on one branch.
`perf(pragma): take the source map out of the API's cold start` was squashed
onto `main` as
[`2810b3b`](https://github.com/hugoleborso/borso.fr/commit/2810b3b14) on
2026-11-11, 12 commits and 23 files.
`perf(pragma): cut the API's cold start, lever by lever` was squashed as
[`e02feeb`](https://github.com/hugoleborso/borso.fr/commit/e02feeb56) on
2026-11-12, 21 commits and 20 files.

Sources walked: `scripts/kaizen.sh sweep-input` on both merges (12 lines in
`pragma/lambda-cold-start`, 21 in `pragma/cold-start-sweep`, the two archives
the prompt named) and on #308, which the same session merged while this sweep
ran and which added 2 lines to the second archive. Also the seven candidates
the prompt carried, both bodies, the 33 commits, the five validation reports,
`findings.md`, the check runs of #298's last head (all green; the two red runs
are read from report 0005), and the two kaizen pull requests that were open
when the sweep started, #302 and #307. Both merged while it ran, and `main` is
merged into this branch. Neither swept pull request has a review thread, and
their ten comments are the preview bot's.

Writers of the 35 lines: `main` 14, `technical-validator` 9, `pragma-latency`
1, and eleven hook refusals. Every subagent logged under its label.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | `tool-budget.test.ts` failed every night from 23:00 to 24:00 UTC. It saved a practice at an instant and looked it up by the UTC day of that instant, and the app resolves a day in Paris time | `[23:39] technical-validator`, `[23:52] main`; report 0005 C02; commit `7937a89`; in the tree since #206, 2026-10-29 | `no-op:` fixed in #298 by commit `7937a89`, which saves the practice at noon UTC. No other test is built this way (table below). The code's own reading of the Paris day already has tests on both sides of the boundary: `paris-day.core.test.ts`, `paris-time.core.test.ts`, `session-tool.core.test.ts:161` and talos's `paris-clock.utils.test.ts` (read this sweep). This sweep built a test clock forced to 23:10 UTC, in commit `f5552f1`, and withdrew it in commit `54b943d`: the operator asked for tests that handle the time zone, not for a moved clock |
| 02 | validation | CI's `pragma-assistants` job went red at 23:03 UTC on the commit that turned `fetch_types` off, so the clock and the change looked like one cause | report 0005 *Notes* | `merge into` 01 |
| 03 | validation | "Are other tests built the same way?" had no answer | prompt candidate 1 | `merge into` 01, whose table answers it |
| 04 | pr-description | `api-validation` refused to open #298, and a review round was run on a diff of two lines to get the preview | `[20:08] hook:api-validation`, `[23:27] main`; report 2009 | `fixed: 54b943d`. The gate stays at the opening, the operator's decision of 2026-11-12: a pull request opened early replays CI at every push. The refusal now says to run the review on finished work, and to ask the operator when the work needs its preview first. Two other eradications were built and withdrawn, a draft that opens without a report (`feb9caa`) and a gate at the merge (`94695d1`) |
| 05 | validation | Round 1 read one lever of five while another sat in a stash, and graded four levers absent: 9 blocking findings | `[20:17] technical-validator`; report 2009 | `merge into` 04 |
| 06 | validation | #298 merged on a FAIL verdict. Two blocking findings were fixed after round 2 with no round left to read the fixes | report 0005; #298 body; commit `8f70e7e` | `merge into` 04 |
| 07 | implementation | Four commits on the branch existed only to measure on the preview and were then taken out: a connect probe and a run at 1024 MB | commits `4b8c285`, `3b7d6bc`, `d7a4d27`, `4104178` | `merge into` 04 |
| 08 | validation | The round 2 report was read and committed from the working tree before the validator handed back, with `C02_CELL` in a cell | `[00:06] technical-validator`, `[00:08] main`; commits `8f70e7e`, `a62991f` | `dantotsu: the-report-committed-before-its-author-finished`, at level 5, commit `54b943d`. The validator drafts in its scratchpad and copies its report into place once. A hook that ran it in the foreground (`feb9caa`) was withdrawn: the operator wants the main session free while a review runs |
| 09 | validation | The branch moved four commits under round 2, so the re-run the validator had queued for after midnight ran the test the main session had fixed | `[00:06] technical-validator`; report 0005 preamble | `merge into` 08 |
| 10 | validation | Round 2 has two report files, and the append-only gate keeps the draft | `validation/technical-validation-2026-11-11-2330.md` | `merge into` 08. The cost row counts 2 rounds in three reports |
| 11 | deploy | `merge-strands-no-work` refused the merge of #293 twice over a stash. Its one way out is a push to a `-wip` branch, which a session told to push to one branch read as forbidden. The stash went to a patch in the scratchpad | `[20:05]`, `[20:06] hook:merge-strands-no-work`, `[20:05] hook:no-discarding-reset`, `[20:06] main` | `fixed: e933719`. The message says the operator asks for that push, names the pull request's own branch first, and says a scratchpad patch is not a way out |
| 12 | implementation | A `curl` of `/api/*` on a preview's site host answered 200 with the app's page, and `preview-api-cross-origin.md` did not print | `[23:27] main`; measured again on two previews | `dantotsu: the-site-host-that-said-200-to-an-api-call`, commit `4941fb1`. Fourth entry on the two hosts, so the function now answers 404 |
| 13 | implementation | A measurement script took the upper middle value as the median of an even count: 2229 ms written where the median is 2105 ms | `[23:52] main`; report 0005 A11; commit `8f70e7e` | `knowledge: measuring-a-lambda-cold-start-on-a-preview`. The validator recomputed every figure and found it before the merge |
| 14 | implementation | A burst on a preview gives a bimodal init, about 700 or 990 ms, so the SDK dedupe could not be judged there | `[23:27] main`; `findings.md`; #298 body *Gap* | `merge into` 13 |
| 15 | implementation | #293's preview baseline is "the fifth of 8 sorted values": its log group went with its stack before the median was recomputed | `findings.md:25` | `merge into` 13 |
| 16 | implementation | Hono's logger prints `2s` above one second, so a Logs Insights pattern on `ms` dropped every slow request and reported a p95 capped at 1000 ms | `[13:32] pragma-latency`; `hono/dist/middleware/logger/index.js:10` | `merge into` 13 |
| 17 | conception | A subagent measured a saving by stubbing modules and proposed a dynamic import to get it | `[17:01] main` | `merge into` 13 |
| 18 | implementation | The dynamic import grew the bundle by 161 KB and gained nothing | `[17:17] main`; `findings.md` *Dead ends* | `no-op:` recorded in `findings.md` with its numbers, and the entry of row 13 now prints a pointer to that section when cold-start logs are read |
| 19 | implementation | Opening the DSQL connection before or during the imports gained nothing, twice | `[18:40]`, `[18:56] main`; `findings.md` *Dead ends* | `no-op:` same as 18 |
| 20 | conception | A Sentry `search_issues` query with a hyphenated tag value failed, and the skill's example was unquoted | `[12:42] main` | `no-op:` already eradicated by #288. `quality-dashboard/SKILL.md:37` quotes the value and `sentry-search-tools-rewrite-the-query-before-sentry-sees-it.md` prints on the error (read this sweep) |
| 21 | pr-description | `api-validation` refused to open #293, so a spec was written after the code | `[17:42] hook:api-validation`; commit `4e1720b` | `no-op:` the hook held, and the review it forced found two blocking defects, both real (row 28) |
| 22 | implementation | `borso(no-comments)` printed its 428-character explanation once per offending line, 23 times in one pre-commit run | `[17:45] main` | `fixed: e933719`. The message is 113 characters and names the standard that holds the rest |
| 23 | validation | The validator could not check whether the preview job gets `SENTRY_ORG`, and #293's saving could not be measured on its preview | `[17:56] technical-validator`; report 1742 A12; commit `9f94413`; #293 body | `merge into` PR #302, merged during this sweep, whose `the-preview-that-could-not-prove-tracing` makes the preview comment say when Sentry is off. The operator row for a preview DSN is in `docs/operator-backlog.md` since #298 |
| 24 | validation | A repository-relative test path through `pnpm --filter` found no test file | `[18:18] technical-validator` | `no-op:` `run-repo-tools-from-the-directory-they-expect.md` prints on `No test files found` (read this sweep) |
| 25 | validation | `gh pr view` and `gh pr list` answered 403 | `[18:18]`, `[23:39] technical-validator` | `no-op:` already eradicated by #304. `what-a-hosted-session-cannot-do-on-github.md` triggers on `gh pr (view\|checks\|status\|list)`, and both lines come from a branch based before it |
| 26 | validation | `/usr/bin/time` is not installed | `[23:39] technical-validator` | `no-op:` one writer, and the shell's `time` keyword did the job on the second try. No instruction names the binary (`grep -rn /usr/bin/time docs/standards .claude scripts` prints nothing) |
| 27 | implementation | `no-broad-kill` refused `pkill` | `[18:38] hook:no-broad-kill` | `no-op:` the hook held |
| 28 | validation | #293's round 1 failed on two blocking findings: the flag dropped while the map stayed on a failed upload, and no test on one flush per invocation | report 1742 A06, D08; commit `9f94413` | `no-op:` the validator found both and round 2 passed |
| 29 | implementation | #293's first commit had three defects a review found 24 minutes later: another app lost its source map, the map was deleted on a failed upload, and two tests ran `sentry-cli` for real | commit `8ad2f59` | `no-op:` found and fixed before the pull request opened, with a pure test on `buildHandlerBundling` |
| 30 | implementation | After `main` was merged in, the handler test threw: its module mock replaced the adapter whole, and #290 had added an export | commit `191803c` | `no-op:` the test failed on the first run after the merge and was fixed in one commit. The mock now spreads the real module |
| 31 | spec | #293's saving was inferred three times, 330, 310 then 270 ms, and measured at 369 ms | commits `cd4eb94`, `9f94413`, `6a8a9c8`; `findings.md` | `no-op:` each figure was labelled inferred, and production measured it |
| 32 | pr-description | The pre-push hook refused the branch four times for conflicting with `main` | `hook:pre-push-conflict`, `[19:14]` twice and `[00:08]`, `[00:09]`; merges `c0edece`, with its conflict on `docs/adr/README.md`, and `3b29b2d` | `no-op:` the hook held each time and `main` was merged in. #304 gave `docs/adr/README.md` a union merge |
| 33 | deploy | `merge-on-moved-base` refused the merge of #293 | `[19:57] hook:merge-on-moved-base`; merge `0b8a18b` | `no-op:` the hook held, and `main` was merged in the same minute |
| 34 | implementation | A commit staging only `pnpm-lock.yaml` was refused by the formatter step | `[20:21] main`; commit `e0fe9a3` | `no-op:` fixed in #298, and its validator measured the fix (report 0005 A12) |
| 35 | validation | The command under *Earning the run* counts the last hundred commits that touch a scope. It printed 84 where 16 of the last hundred did | `[23:39] technical-validator`; report 0005 B18 | `fixed: e933719`. On `main` today the old command prints 84 and the new one 18 (measured) |
| 36 | validation | Round 2 had to re-check five findings whose spec lines the fix commit had removed, and the procedure has no row for that | `[23:39] technical-validator`; report 0005 R05 to R09 | `merge into` PR #302, merged during this sweep. Its round 2 rule gives a dismissed finding a row and runs the check its reason claims, which is what this validator did unasked |
| 37 | validation | Round 2's non-blocking findings: a 740 ms figure sourced from another preview, a lockfile key ending in `: {}` read as a second version, an unanswered *Earning the run* | report 0005 A04, A10, B18; commit `8f70e7e` | `no-op:` all three fixed before the merge, the second with a test |
| 38 | validation | No test reached `createDsqlClient`, the client production runs | report 0005 D04; commit `8f70e7e` | `no-op:` fixed before the merge by `client.options.test.ts`. That no round read the fix is row 06 |
| 39 | validation | Questions the validators asked that no commit answers: do the agent reader and the migration runner pay the array-type query, is `tslib` worth bundling once, is there a blueprint for a test of the database client | report 0005 *Notes* | `no-op:` the first is lead 6 of `findings.md`. The others are not measured as defects |
| 40 | validation | Neither feature has a plan, so each report carries a `plan absent` row | reports 1742 to 0005 | `no-op:` the validator keeps that row on purpose for a short-form spec, as on #292 (its row 21) |
| 41 | deploy | `pnpm dedupe` re-resolved every app, so the merge of #298 deployed all six | report 0005 *Notes*; #298 body | `no-op:` stated in the body the operator merged, with `app-tests` green for all six |
| 42 | post-merge | Lever 1 can only be judged in production, and the session that shipped it was still measuring when this sweep ran | `get_session`: "prod redeployed 00:22 UTC; verifying new code" | `no-op:` by the spec's own *How it will be judged*. #308 recorded it in `findings.md`: three real cold starts, each with about 290 ms less in the handler, and no line from Sentry's failed hook |
| 43 | post-merge | The ADR #293 added was still `proposed`, and had no row in the index table to stamp. The gate passed it | `docs/adr/README.md`; this sweep's `KAIZEN.md` | `fixed: e933719`. Stamped, two missing rows added, and the gate asks for a table row. Its test refuses a record linked only from a topic list |
| 44 | post-merge | The trigger gate refused a command trigger starting with a dash, and its message named jq's usage | this sweep's `KAIZEN.md` | `fixed: 4941fb1`, the gate ends jq's options before the patterns (measured with the pattern that failed) |
| 45 | post-merge | This sweep's clock run read the working tree while a gate was half edited, and reported one failure of its own making | this sweep's `KAIZEN.md` | `no-op:` the sweep's own doing, and the same run passed once the edit was whole |
| 46 | post-merge | `no-broad-kill` refused a `pkill` this sweep made to stop its own background run | this sweep's `KAIZEN.md` | `no-op:` the hook held, and its message named `TaskStop` |
| 47 | post-merge | `scripts/reports.sh` was red on `main`: talos's `todo-list-choice.adapter.ts`, from #292, names `browser-local-storage`, and talos's manifest did not declare it | `scripts/reports.sh all`, exit 1 | `fixed: 522fc33`, the manifest declares it and the report exits 0. The maps build on operator dispatch, so no gate saw it, as on #295 (its row 21) |
| 48 | post-merge | This sweep built four mechanisms the operator did not want | the operator, in this session; commits `feb9caa`, `94695d1`, `f5552f1` | `no-op:` the sweep's own doing, and all four are out. It built four eradications the operator refused: a draft pull request that opens without a report, a gate at the merge, a validator in the foreground and a forced test clock. Each was read from the code and proved, and none was put to the operator before it was built |

Counts: 2 dantotsu, 1 knowledge, 7 fixed, 13 merged into another row or pull request, 25 no-op.

## What the clock runs measured

Row 03 asked whether other tests are built like the one of row 01. Every
suite of the nine workspaces was run with the process clock moved by a preload
that shifts `Date`. No other test fails at any position that is not in the past.
"The boundary clock" is the forced test clock of row 01, since withdrawn. It was
in place on pragma and talos for the passes that name it.

| Clock | Shifted by | Result |
| --- | --- | --- |
| The real clock, 00:22 to 00:36 UTC | nothing | 9 workspaces of 9 pass, bar one root test this sweep was editing |
| 2026-11-12 23:31 UTC, a winter night | the preload | 9 of 9 pass, 10,664 tests |
| 2026-07-15 22:31 UTC, a summer night | the preload, and the boundary clock on pragma and talos | pragma, last-loop-lepin, banana-rush, borso-fr and borsouvertures pass. talos fails 3 tests whose fixtures carry dates after July: a proposal that expires on 2 November is not expired yet. A clock moved back proves nothing, so the pass was stopped there |
| Today, 23:10 UTC | the boundary clock alone | talos passes its 1,501 tests, and the push gate ran pragma's and talos's suites green |
| 2026-11-15 23:31 UTC, a Sunday night | the preload and the boundary clock | 9 of 9 pass |
| 2026-12-31 23:31 UTC | the same | 9 of 9 pass |
| 2027-03-28 00:31 UTC, the day the clocks change | the same | 9 of 9 pass |
