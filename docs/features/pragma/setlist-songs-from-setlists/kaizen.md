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

Session: 77dfaf25-d48b-52ff-96bd-9bf6d041f476

- [2026-11-14 13:14] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-14 13:22] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-14 13:23] `main` The no-prettier hook blocked a whole chained command, so the python edits before it silently never ran; nothing said so.
- [2026-11-14 13:23] `main` agent-browser failed to install at SessionStart, so the screen check fell back to a hand-written Playwright script.
