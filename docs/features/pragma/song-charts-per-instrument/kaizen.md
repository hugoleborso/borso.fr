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

Session: 3d3c1441-8eba-5146-b172-5bc651d99a62

- [2026-11-16 00:41] `spec` The brief said 48 of 129 songs hold a chart, and db-read measured 52 the same day, so a count copied into a brief goes stale within the session.
- [2026-11-16 00:41] `spec` The VOCABULARY bans tab as a word for the attached music while the operator asks for tabs, so every spec on charts must translate the request before naming anything.
- [2026-11-16 00:52] `plan` check-migration-sql-dsql-compat.sh exits 0 on a path outside apps/*/api/src/database/migrations, so a stub migration in a scratch folder cannot be gated and the pass reads as a real pass.
- [2026-11-16 00:52] `plan` The spec changed the songs response shape without noticing that site/src/lib/query-client.setup.ts persists songs for seven days under PERSISTED_CACHE_SHAPE_VERSION, and nothing ties a response shape change to that buster.
- [2026-11-16 00:52] `plan` tool-budget.test.ts reports only a pass or the overrun, so the planner had to copy the test into a temporary file to learn that get_song on titleOf(2) sits at 464 of 500 characters.
- [2026-11-16 01:14] `impl` pnpm typecheck kept reporting a removed 'chart' property from its incremental tsbuildinfo cache until node_modules/.cache/tsc was deleted
- [2026-11-16 01:20] `hook:subagent-no-staging` a subagent ran a git command that writes the shared index
- [2026-11-16 01:36] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-16 01:36] `impl` the plan's grep gate for '.chart' and 'chart:' cannot print nothing, because it matches every parameter named chart and the frozen legacy column read
- [2026-11-16 01:45] `tech-validator` vitest --changed --coverage on pragma prints an empty per-file coverage table with 100% totals, so the validator cannot tell which changed gated files the coverage gate actually measured.
- [2026-11-16 01:48] `tech-validator` vitest --changed does not pick up migrations.audit.test.ts when the branch adds a migration .sql file, because the SQL is outside the import graph, so it had to be run by hand.
- [2026-11-16 02:01] `fix-r1` The chart pick scope used optional chaining on a nullable state, and neither typecheck nor lint flagged that undefined === undefined dereferenced null; only the page tests caught it.
- [2026-11-16 02:14] `tech-validator-r2` Running a probe vitest file on a git archive export of apps/pragma fails in globalSetup and setupFiles that resolve outside the export (scripts/vitest-*.js, ensure-infra-built.sh), so probing a reviewed SHA without touching the working tree needs tsx instead.
- [2026-11-16 02:16] `visual-validator` The spec's 'signed-in member still loading' edge case cannot be reached in a browser because RequireSession holds every page until /api/me answers and pragma.query-cache restores the member from localStorage.
- [2026-11-16 02:16] `visual-validator` PDF chart rows cannot be created on pnpm dev (no bucket), so the PDF-plus-ChordPro scene cases needed a fake s3Key written through the API, and the song page then shows 'sign-get 500' in the chart body.
