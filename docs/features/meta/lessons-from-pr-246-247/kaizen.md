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

Session: 96144670-751b-5c5c-b79a-ed089b954cf4

- [2026-11-03 14:40] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [2026-11-03 14:42] `hook:pr-body` wrote a pull-request body carrying markup the server silently strips
- [2026-11-03 15:40] `pragma-baseline` pragma's local dev API returns 500 on POST /api/uploads/sign, so FileDropZone cannot be reached in pnpm dev without stubbing the presign in the browser.
