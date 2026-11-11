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
- [2026-11-11 17:55] `technical-validator` vitest --changed 42012559 with the all-digit short SHA of the brief found no test files and exited 0, and only the full SHA ran the 23 affected files.
- [2026-11-11 18:03] `technical-validator` Measuring a talos screen at 375 px needs a passkey registered in the local dev database, which then closes registration for the next browser context, so each probe run had to delete its own passkey row by hand to avoid wiping a cluster other agents share.
- [2026-11-11 18:03] `technical-validator` The validator procedure names agent-browser for the 375 px check but talos can only be entered with a CDP virtual authenticator, which agent-browser does not offer, so the measure was a hand-written Playwright script.
- [2026-11-11 18:10] `index-navigation-fix` The Held by gate greps '^Held by:' so the indented Held by line at talos VOCABULARY.md:171 was never checked, and nothing warns about an indented one.
- [2026-11-11 19:02] `todo-switch` The talos dev seed has no awaited commitment, no recent journal and only an expired proposal, so a video of Jour and Décider needs rows added to the local database by hand.
