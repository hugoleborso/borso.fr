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

Session: 37ed967f-6ab6-4941-9422-b1a28d6f33aa

- [2026-10-29 18:16] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [2026-10-29 18:16] `main` pnpm run lint failed on macOS because lint-workspace.sh used GNU-only realpath --relative-to.
- [2026-10-29 18:16] `main` The rtk wrapper rewrites pnpm run lint into a bare ESLint 8 call that finds no config.
- [2026-10-29 18:16] `main` Splitting sw.js under the 300-line cap needed importScripts plus a harness stub, since no doc says how the service worker may grow.
