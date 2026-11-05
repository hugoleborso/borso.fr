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

Session: a022c8a5-879d-5854-8738-d6a4d9aeb4ac
- [2026-11-04 01:43] `main` Knowledge entry dsql-strong-consistency-is-per-connection claims cross-connection stale reads; 0 of 180 reads were stale on the PR 261 preview
- [2026-11-04 02:00] `live-invalidation` vitest run --project core for pragma was killed with exit 137 (out of memory) at default worker count, and the container restarted mid-task.
- [2026-11-04 02:00] `live-invalidation` The no-comments lint forbids the one JSDoc line explaining why the realtime ticket signs a purpose prefix, so that rationale now lives only in a test title.
- [2026-11-04 02:28] `hook:commitlint` commitlint refused a commit message: tmp
- [2026-11-04 02:28] `hook:commitlint` commitlint refused a commit message: tmp
- [2026-11-04 02:48] `technical-validator` The pragma vitest --changed runs print only JSON task events and totals, not file names, so confirming the feature's own test files were in the changed set took a second run with --reporter=verbose.
- [2026-11-04 03:18] `live-invalidation-fix` In the core project's jsdom environment, fileURLToPath(new URL('..', import.meta.url)) throws 'URL must be of scheme file', so a test reading sources must use dirname(fileURLToPath(import.meta.url)).
- [2026-11-04 03:18] `live-invalidation-fix` Cross-slice imports point both ways (a read that aggregates, a delete that cascades), so an import-based dependency test needs a separate cascade table checked in reverse.
- [2026-11-04 03:36] `technical-validator` vitest --changed with the default reporter prints only totals, so confirming which feature test files a round-2 run picked up needed a second explicit run
- [2026-11-04 03:50] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-04 03:58] `main` Server-side tests and curl probes passed while every browser write on the preview failed CORS preflight for the new X-Pragma-Client header; only the visual validator caught it
- [2026-11-04 04:14] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-04 04:15] `visual-validator` agent-browser network route --body answers with no CORS headers, so mocking a cross-origin API response fails as MissingAllowOriginHeader and reads like an app retry loop.
- [2026-11-04 04:15] `visual-validator` Network.emulateNetworkConditions offline does not close an already open WebSocket in Chromium, so it cannot simulate a phone losing its socket.
- [2026-11-04 04:15] `visual-validator` The no-broad-kill hook tells a subagent to stop pnpm dev with TaskStop, a tool subagents are not given.
- [2026-11-04 04:15] `visual-validator` The spec's no-socket-URL branch of the ticket endpoint is reachable in neither pnpm dev nor a preview, so no validator can observe it.
