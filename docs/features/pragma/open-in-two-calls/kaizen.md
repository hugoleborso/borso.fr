# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps the archived
copy in a new conversation after the merge, classifies each line, and designs
the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored. Before the pull request opens, run
`scripts/kaizen.sh archive <docs-slug>/<feature>` and commit the copy.

Session: cd287730-a3f7-5952-a07f-8736d08299e3

- [2026-11-05 03:57] `main` the 3S board counted 738 Lambda throttles a week as 5xx but nothing alerted on them, so a session found them by asking
- [2026-11-05 04:10] `spec` The specification skill requires AskUserQuestion per perspective, which a piloted subagent cannot call, so the perspective checkboxes stay unticked by construction.
- [2026-11-05 04:10] `spec` The brief names the verdict specification-1.md while sub-agent-contract.md requires a zero-padded step (specification-01.md).
- [2026-11-05 04:42] `spec-2` npx oxlint printed nothing in this sandbox, only node_modules/.bin/oxlint ran, so a one-off rule probe needs the direct binary path
- [2026-11-05 04:42] `spec-2` The oxlint core rule no-await-in-loop tells authors to use Promise.all, which is exactly the fan-out the dantotsu bans, so it cannot be enabled as is for site code
- [2026-11-05 04:47] `adr` The sub-agent contract names verdict files with a zero-padded step (adr-01.md) while the run folder and the brief use an unpadded one (specification-1.md, adr-1.md).
- [2026-11-05 04:47] `adr` The spec's Architectural choices names the ADR slug pragma-reads-leave-in-one-batch-per-tick while the ADR brief names pragma-reads-go-out-as-one-batch-per-tick, so the spec's Files to change row points at a file that will not exist.
- [2026-11-05 04:47] `adr` The docs/adr/README.md area entries join id and summary with a long dash, which CLAUDE.md's Writing rules forbid, so a new entry cannot match its neighbours and the rule at once.
- [2026-11-05 04:48] `hook:commitlint` commitlint refused a commit message: docs(meta): ADR, pragma's reads leave in one batch per tick
- [2026-11-05 04:49] `hook:commitlint` commitlint refused a commit message: docs(meta): ADR, pragma's reads leave in one batch per tick
- [2026-11-05 04:58] `plan` The spec's Files to change deletes offline-manifest.core.ts without noting it holds the core-projection blueprint that 64 files follow, so the blueprint-index pre-commit check would fail.
- [2026-11-05 04:58] `plan` The spec puts Promise.all over the reads in read-batch.controller.ts, which borso/no-array-methods-in-controllers refuses, so the plan adds a read-batch.service.ts the spec omits.
- [2026-11-05 04:58] `plan` No blueprint covers a service that fans out through a function it is handed, so the plan borrows service-clock-injected.
- [2026-11-05 05:11] `impl-1` scripts/check-pure-modules-have-callers.sh reads git ls-files, so a subagent that must not stage sees a deleted core module as still present and fails the gate
- [2026-11-05 05:12] `impl-1` plan gate 1.7 passes stale-scope-coverage, tool-coverage and derived-read-roots to test:e2e, but vitest.config.ts puts them in the core project, so test:e2e silently skips them
- [2026-11-05 05:22] `hook:no-discarding-reset` ran a git command that would discard uncommitted work
- [2026-11-05 05:27] `impl-2` Plan gate 2.5 prescribes 'git checkout -- <file>' to revert the plant, which the no-discarding-reset hook refuses while other slice files are uncommitted, so the plant had to be reverted from a scratch copy.
- [2026-11-05 05:52] `impl-3` The plan's gate 3.10 queries a table named songs, but pragma's table is song, so the gate failed as written.
- [2026-11-05 05:52] `impl-3` The plan had the read-batch controller call the error-reporting adapter directly, which borso/no-controller-imports-outside-service refuses, so the plan's code map was not checked against the controller import rule.
- [2026-11-05 06:09] `impl-4` The plan's gate 5.4 resource-timing snippet counts 0 under pnpm dev because Vite's module requests fill the default 250-entry buffer; it needs agent-browser --init-script calling performance.setResourceTimingBufferSize.
- [2026-11-05 06:09] `impl-4` agent-browser 0.35.2 lists har and addinitscript in --help but answers Unknown command for both.
- [2026-11-05 06:09] `impl-4` The plan put the read transport instance in read-batch.adapter.ts and reportReadBatchFailed called from it, but both cycle through api.client.ts (import/no-cycle), so the instance lives in api.client.ts and Sentry subscribes through onReadBatchFailed.
- [2026-11-05 06:25] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-05 07:16] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-05 07:16] `impl-5` A Tailwind @theme static token whose value reads a per-element custom property resolves it at :root, so the per-key animation delays silently collapsed to 0 until the tokens moved to @theme inline.
- [2026-11-05 07:16] `impl-5` jsdom has no AnimationEvent, so React listens for webkitAnimationStart and webkitAnimationEnd and a test must dispatch those names to reach onAnimationStart or onAnimationEnd.
- [2026-11-05 07:16] `impl-5` agent-browser --init-script only applies when the session launches, and closing the session to relaunch with a new script drops the pragma sign-in cookie.
- [2026-11-05 07:16] `impl-5` The spec's per-route request bounds were inferred, and seven measured rows exceed them because dependent waves land in separate tasks, which a microtask closer cannot merge.
- [2026-11-05 07:20] `tech-val` The technical-validation skill requires dispatching the technical-validator agent, but a subagent session has no Agent tool, so the validator brief had to be run inline.
- [2026-11-05 07:34] `tech-val` The orchestrator brief named the verdict file technical-validation-01.md while sub-agent-contract.md names it technical-validator-<step>.md.
- [2026-11-05 07:34] `tech-val` The branch head moved by a docs-only commit while the validation ran, so the briefed SHA and HEAD differed mid-run.
- [2026-11-05 07:45] `fix-1` Hono's zValidator('json') throws 'Malformed JSON in request body' before its hook runs, so a route that must answer its own error code for a non-JSON body cannot use it, and no blueprint says so.
- [2026-11-05 07:45] `fix-1` The plan's retry row assumed TanStack retries land in one task, but each retry timer fires in its own task, so the microtask closer split them; no test drove a real QueryClient retry.
- [2026-11-05 07:45] `fix-1` eslint-rules/*.js sit outside the root vitest coverage include, so a lint rule ships with untested branches and no gate notices.
- [2026-11-05 08:05] `tech-val-2` The retry-group fix clears every remembered failed read when the first retry group closes, and no test covers two failed batches whose retries come due at different times.
- [2026-11-05 08:05] `tech-val-2` This session again has no Agent tool, so the technical-validation skill could not dispatch its isolated technical-validator agent and the brief ran inline.
- [2026-11-05 08:26] `vis-val` agent-browser 'record start <path> <url>' opens the url in a fresh context without the session cookie, so a recorded cold open lands on /login instead of the gated screen.
- [2026-11-05 08:33] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-05 08:33] `vis-val` The spec's request count reads performance.getEntriesByType('resource'), but under pnpm dev the Vite module requests fill the default 250-entry buffer before the first /api/ call, so it returns zero.
- [2026-11-05 08:33] `vis-val` The visual-validation skill dispatches a visual-validator agent, but a subagent session has no Agent tool, so the isolation the skill depends on cannot be applied there.
- [2026-11-05 08:33] `vis-val` The brief named the verdict file visual-validation-01.md while sub-agent-contract.md names it visual-validator-<step>.md.
- [2026-11-05 08:47] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-05 09:03] `fix-3` The D13 prototype (microtask vs setTimeout closer) was never run or recorded, so the microtask default shipped and cost cold / one request until visual validation caught it.
- [2026-11-05 09:03] `fix-3` agent-browser addinitscript is listed by the core skill but unknown to the installed CLI, and --init-script is silently ignored against a running daemon, so the request log was missing until the session was closed and reopened.
