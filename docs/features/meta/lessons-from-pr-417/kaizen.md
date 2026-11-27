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

- [2026-11-27 10:37] `ops-messages` operator-messages.ts prints messages grouped by page, newest page first, so its output is not chronological and needs re-sorting by hand
- [2026-11-27 10:37] `ops-messages` list_events with kinds [user] and limit 100 spills every page over the tool output limit, so 14 of 16 pages had to be read back from saved files to find the next cursor
- [2026-11-27 10:37] `ops-messages` operator-messages.ts reads only the calling session's own transcript, so it cannot be pointed at a session id or a saved JSON file directly
- [2026-11-27 10:40] `skill-calls` list_events with kinds assistant mixes subagent events with the main thread and 11 of 13 pages overflowed to files, so auditing one session's skill calls needs a custom jq summarizer and ~14 calls.
- [2026-11-27 10:45] `main` The container's node_modules lacked mailchecker, so pragma's type check failed until pnpm install ran
- [2026-11-27 10:45] `main` test-seed.service.ts sat at exactly 300 lines, so adding one seeded field forced moving a seeder to its own file
- [2026-11-27 10:50] `hook:api-validation` opened a pull request changing an API without a technical-validation report
- [2026-11-27 10:59] `technical-validator` Root vitest --changed finds no test for a change to an entry script under scripts/ (operator-messages.ts, check-dantotsu-front-matter.ts), so category C cannot show such a fix ran except by a hand-built probe.
