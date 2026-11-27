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

Session: 9c2962d1-4876-40d6-aed0-4c98e04db32b

- [2026-11-27 10:47] `ops-reader` Typed-by-the-operator lines print in page order, not time order: 10:12 first, then 09:56, 09:58, 09:55, 09:49, then 2026-11-26 22:28 (where: pnpm exec tsx scripts/kaizen/operator-messages.ts)
- [2026-11-27 10:47] `ops-reader` Each page of session_01K69KnE89urXxoZV8C57NB8 held 3 to 26 events and 60k to 127k characters, so 5 of 9 pages spilled to tool-results files; 9 pages back reached only 2026-11-26 22:28 and has_more was still true (where: mcp__claude-code-remote__list_events kinds [user] limit 100)
