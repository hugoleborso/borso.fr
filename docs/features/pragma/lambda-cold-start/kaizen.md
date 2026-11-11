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

Session: d4b94070-98b8-5170-ae92-3efe97db76a9
- [2026-11-11 12:42] `main` search_issues parses a hyphenated tag value as a project name and fails with HTTP 400, so app:last-loop-lepin must be quoted while app:pragma need not be, and the skill's own example is the unquoted form.
- [2026-11-11 13:32] `pragma-latency` Hono's logger prints '2s' instead of '2000ms' above one second, so a Logs Insights regex that parses 'ms' silently drops every slow request and reports a p95 capped at 1000 ms.
- [2026-11-11 17:01] `main` A subagent measured a bundle saving by aliasing modules to a stub and then proposed dynamic import to achieve it, two different things: stubbing removes the bytes, import() keeps them and only defers evaluation, and on a probe it grew the bundle 483 to 644 KB for 6 ms.
- [2026-11-11 17:17] `main` Deferring an AWS SDK with a dynamic import made the bundle 161 KB bigger and 2.6 ms slower than importing it statically, because esbuild keeps the code without splitting and loses tree shaking across the lazy boundary.
- [2026-11-11 17:42] `hook:api-validation` opened a pull request changing an API without a technical-validation report
- [2026-11-11 17:45] `main` The borso(no-comments) oxlint rule repeats its full ~400-character explanation once per offending line, so one pre-commit run printed it 23 times and filled the agent's context with the same paragraph instead of listing the lines once under it.
- [2026-11-11 17:56] `technical-validator` The validator cannot check whether SENTRY_ORG and SENTRY_PROJECT are set for the preview job, because gh variable list and the environments API are both blocked by the proxy, so a deploy-time branch stays unverifiable.
- [2026-11-11 18:18] `technical-validator` vitest path filters are workspace-relative, so a repo-root-relative test path through pnpm --filter matches nothing and exits 1 with 'No test files found'
- [2026-11-11 18:18] `technical-validator` gh pr view returns HTTP 403 because it goes through GraphQL, so reading a PR body needs the REST route instead
- [2026-11-11 18:38] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-11 18:40] `main` Starting an async connection before the heavy imports gains nothing on its own, because module evaluation is synchronous and the connect is never issued: 884 ms after, 873 ms before, against 568 ms when the loop is yielded once between the two.
- [2026-11-11 18:56] `main` Warming the DSQL connection before the heavy imports is a net loss: the dynamic-import restructure the yield requires costs 111 ms of extra module evaluation locally and postgres.js only issues the socket 22 ms before evaluation ends, so it buys a 22 ms overlap window for a 111 ms penalty.
