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

Session: 2ad21149-51d3-5fff-98e8-0e9474b187e4
- [2026-11-11 17:51] `index-navigation` pnpm dev:db replays the seed under the fixed idempotency key dev-seed, so a state added to memory-seed.json never reaches an already seeded dev database and needed a hand-written one-off script.
- [2026-11-11 17:51] `index-navigation` The Tailwind class text-focus sets the focus colour, not the 22 px focus size, because both --color-focus and --text-focus exist; the tile counts rendered small until a capture showed it.
