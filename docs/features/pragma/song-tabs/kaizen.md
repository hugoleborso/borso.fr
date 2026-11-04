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

Session: 8cde42c5-13aa-5cf9-8025-51390bdaa4e9

- [2026-11-03 18:07] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [2026-11-03 18:07] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-03 18:07] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [2026-11-03 18:08] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [2026-11-03 18:41] `main` ran prettier on pragma files and it reformatted three unrelated files, because the repo formats with oxfmt and keeps a stray .prettierrc.json
- [2026-11-03 18:41] `main` splitting SongChartPreviews into two components moved its blueprint marker and the pre-commit gate refused the commit after the push hook had already run
