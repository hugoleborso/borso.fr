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
- [2026-11-11 13:14] `routine-launch` Checking a talos screen locally needs a hand-written script that inserts a session row and signs its cookie, because pnpm dev prints no seeded sign-in and a passkey cannot be driven by agent-browser.
- [2026-11-11 13:23] `technical-validator` Turning a suspected failing case into a measured one needed a hand-written vitest config in the scratchpad, because the validator may not add a test file to the repository and the back-e2e project only includes files under apps/talos.
- [2026-11-11 13:23] `technical-validator` The reviewer bullet asking for a 375 px measurement could not be run because the local talos app has no seeded sign-in an agent can use.
- [2026-11-11 13:40] `technical-validator` Checking whether the pull request dismissed a round-1 finding failed on the first try because gh pr view needs GraphQL, which this session refuses, and the validator brief names no REST command for it.
